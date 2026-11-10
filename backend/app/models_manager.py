import ctypes
import gc
from pathlib import Path
import threading
from typing import Any, Callable, Dict, Optional

import cv2
import numpy as np
import onnxruntime as ort
import requests

from .config import AUX_MODELS, MODEL_REGISTRY, MODELS_DIR


def _get_free_ram_mb() -> float:
    """Return available physical + commit memory in MB (Windows safe)."""
    try:
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]

        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            return min(stat.ullAvailPhys, stat.ullAvailPageFile) / (1024 * 1024)
    except Exception:
        pass
    return 4096.0

_FFHQ_TEMPLATE_512 = np.array(
    [
        [192.98138, 239.94708],
        [318.90277, 240.19360],
        [256.63416, 314.01935],
        [201.26117, 371.41043],
        [313.08905, 371.15118],
    ],
    dtype=np.float32,
)


def _axis_starts(length: int, tile_size: int, step: int) -> list[int]:
    if length <= tile_size:
        return [0]
    starts = list(range(0, max(1, length - tile_size + 1), step))
    if starts[-1] + tile_size < length:
        starts.append(length - tile_size)
    return starts


def _ramp_weights_1d(
    tile_len_out: int,
    has_prev: bool,
    has_next: bool,
    overlap_out: int,
    trim_out: int,
) -> np.ndarray:
    w = np.ones(tile_len_out, dtype=np.float32)
    ramp_len = max(1, overlap_out - trim_out)
    if has_prev and overlap_out > 0:
        if trim_out > 0:
            w[:trim_out] = 0.0
        end = min(tile_len_out, trim_out + ramp_len)
        w[trim_out:end] = np.linspace(0.0, 1.0, end - trim_out, endpoint=True, dtype=np.float32)
    if has_next and overlap_out > 0:
        if trim_out > 0:
            w[-trim_out:] = 0.0
        start = max(0, tile_len_out - trim_out - ramp_len)
        end = tile_len_out - trim_out
        if end > start:
            w[start:end] = np.minimum(
                w[start:end],
                np.linspace(1.0, 0.0, end - start, endpoint=True, dtype=np.float32),
            )
    return w


class ModelManager:
    """Manages ONNX super-resolution, deblocking & face-restoration models, sessions, and inference."""

    def __init__(self) -> None:
        self._sessions: Dict[str, ort.InferenceSession] = {}
        self._session_providers: Dict[str, str] = {}
        self._lock = threading.Lock()
        self._download_state: Dict[str, Dict[str, Any]] = {}
        self._face_mask_512: Optional[np.ndarray] = None

    def get_model_path(self, model_id: str) -> Optional[Path]:
        info = MODEL_REGISTRY.get(model_id)
        if not info or not info["filename"]:
            return None
        return MODELS_DIR / info["filename"]

    def is_model_downloaded(self, model_id: str) -> bool:
        info = MODEL_REGISTRY.get(model_id)
        if not info:
            return False
        if not info["is_ai"]:
            return True
        path = self.get_model_path(model_id)
        return bool(path and path.exists() and path.stat().st_size > 100_000)

    def get_models_status(self) -> list[Dict[str, Any]]:
        available_providers = ort.get_available_providers()
        has_gpu = "DmlExecutionProvider" in available_providers or "CUDAExecutionProvider" in available_providers
        items = []
        for model_id, info in MODEL_REGISTRY.items():
            dl_state = self._download_state.get(model_id, {})
            items.append(
                {
                    "id": model_id,
                    "name": info["name"],
                    "description_id": info["description_id"],
                    "description_en": info["description_en"],
                    "size_mb": info["size_mb"],
                    "scale": info["scale"],
                    "is_ai": info["is_ai"],
                    "downloaded": self.is_model_downloaded(model_id),
                    "downloading": dl_state.get("downloading", False),
                    "download_progress": dl_state.get("progress", 0.0),
                    "download_error": dl_state.get("error"),
                    "active_provider": self._session_providers.get(
                        model_id,
                        "DirectML GPU" if (info["is_ai"] and has_gpu) else ("CPU" if info["is_ai"] else "OpenCV / SIMD"),
                    ),
                }
            )
        return items

    def _download_file(
        self,
        url: str,
        target_path: Path,
        state_key: str,
        progress_cb: Optional[Callable[[float], None]] = None,
    ) -> Path:
        if target_path.exists() and target_path.stat().st_size > 50_000:
            return target_path

        with self._lock:
            if target_path.exists() and target_path.stat().st_size > 50_000:
                return target_path

            self._download_state[state_key] = {
                "downloading": True,
                "progress": 0.0,
                "error": None,
            }

            tmp_path = target_path.with_suffix(".onnx.part")
            try:
                with requests.get(url, stream=True, timeout=120) as resp:
                    resp.raise_for_status()
                    total = int(resp.headers.get("content-length", 0))
                    downloaded = 0
                    with open(tmp_path, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=1024 * 256):
                            if not chunk:
                                continue
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total > 0:
                                pct = min(99.5, (downloaded / total) * 100.0)
                                self._download_state[state_key]["progress"] = round(pct, 1)
                                if progress_cb:
                                    progress_cb(pct)
                tmp_path.replace(target_path)
                self._download_state[state_key] = {
                    "downloading": False,
                    "progress": 100.0,
                    "error": None,
                }
                if progress_cb:
                    progress_cb(100.0)
                return target_path
            except Exception as exc:
                if tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)
                self._download_state[state_key] = {
                    "downloading": False,
                    "progress": 0.0,
                    "error": str(exc),
                }
                raise

    def download_model(
        self,
        model_id: str,
        progress_cb: Optional[Callable[[float], None]] = None,
    ) -> Path:
        info = MODEL_REGISTRY.get(model_id)
        if not info or not info["url"] or not info["filename"]:
            raise ValueError(f"Model '{model_id}' does not require a download.")
        target_path = self.get_model_path(model_id)
        assert target_path is not None
        return self._download_file(info["url"], target_path, model_id, progress_cb=progress_cb)

    def ensure_aux_model(self, aux_id: str) -> Path:
        info = AUX_MODELS[aux_id]
        target = MODELS_DIR / info["filename"]
        return self._download_file(info["url"], target, aux_id)

    def _evict_heavy_sessions(self, keep_key: str) -> None:
        """Keep at most one large (>15 MB) ONNX session resident so 8GB-RAM systems stay responsive."""
        to_remove = []
        for key in list(self._sessions.keys()):
            if key == keep_key:
                continue
            model_info = MODEL_REGISTRY.get(key)
            is_heavy = (
                key in ("gfpgan-v1.4", "scunet-psnr")
                or (model_info is not None and float(model_info.get("size_mb", 0)) > 15.0)
            )
            if is_heavy:
                to_remove.append(key)
        if to_remove:
            for key in to_remove:
                self._sessions.pop(key, None)
            gc.collect()

    def _create_ort_session(
        self,
        model_path: Path,
        cache_key: str,
        force_cpu: bool = False,
        cache: bool = True,
    ) -> ort.InferenceSession:
        if cache and cache_key in self._sessions:
            return self._sessions[cache_key]

        with self._lock:
            if cache and cache_key in self._sessions:
                return self._sessions[cache_key]

            self._evict_heavy_sessions(keep_key=cache_key)

            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.enable_cpu_mem_arena = False
            sess_options.enable_mem_pattern = False

            available = ort.get_available_providers()
            preferred = []
            if not force_cpu:
                if "DmlExecutionProvider" in available:
                    preferred.append("DmlExecutionProvider")
                if "CUDAExecutionProvider" in available:
                    preferred.append("CUDAExecutionProvider")
            preferred.append("CPUExecutionProvider")

            session: Optional[ort.InferenceSession] = None
            for provider in preferred:
                try:
                    session = ort.InferenceSession(
                        str(model_path),
                        sess_options=sess_options,
                        providers=[provider],
                    )
                    self._session_providers[cache_key] = provider
                    break
                except Exception:
                    continue

            if session is None:
                session = ort.InferenceSession(
                    str(model_path),
                    sess_options=sess_options,
                    providers=["CPUExecutionProvider"],
                )
                self._session_providers[cache_key] = "CPUExecutionProvider"

            if cache:
                self._sessions[cache_key] = session
            return session

    def get_session(self, model_id: str) -> ort.InferenceSession:
        if model_id in self._sessions:
            return self._sessions[model_id]
        model_path = self.get_model_path(model_id)
        if not model_path or not self.is_model_downloaded(model_id):
            model_path = self.download_model(model_id)
        return self._create_ort_session(model_path, model_id)

    def _run_tile(
        self,
        session: ort.InferenceSession,
        tile_bgr: np.ndarray,
        scale: int,
        fixed_tile_size: Optional[int] = None,
    ) -> np.ndarray:
        th, tw = tile_bgr.shape[:2]
        if fixed_tile_size and (th < fixed_tile_size or tw < fixed_tile_size):
            pad_h = max(0, fixed_tile_size - th)
            pad_w = max(0, fixed_tile_size - tw)
            working = cv2.copyMakeBorder(tile_bgr, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT_101)
        else:
            working = tile_bgr

        rgb = cv2.cvtColor(working, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        inp = np.transpose(rgb, (2, 0, 1))[None, ...]

        in_info = session.get_inputs()[0]
        if "float16" in in_info.type:
            inp = inp.astype(np.float16)
        output_name = session.get_outputs()[0].name
        pred = session.run([output_name], {in_info.name: inp})[0]

        out = np.squeeze(pred, axis=0).astype(np.float32)
        out = np.transpose(out, (1, 2, 0))
        out = out[: th * scale, : tw * scale]
        out = np.clip(out * 255.0, 0.0, 255.0).astype(np.uint8)
        return cv2.cvtColor(out, cv2.COLOR_RGB2BGR)

    def _run_tiled_feather(
        self,
        session: ort.InferenceSession,
        img_bgr: np.ndarray,
        scale: int,
        tile_size: int,
        overlap: int,
        align_multiple: int = 1,
        tile_progress_cb: Optional[Callable[[int, int], None]] = None,
    ) -> np.ndarray:
        """Run ONNX model with smooth 2D feathered overlap blending to eliminate tile seams."""
        h, w = img_bgr.shape[:2]
        if h <= tile_size and w <= tile_size:
            if tile_progress_cb:
                tile_progress_cb(1, 1)
            pad_h = (align_multiple - h % align_multiple) % align_multiple if align_multiple > 1 else 0
            pad_w = (align_multiple - w % align_multiple) % align_multiple if align_multiple > 1 else 0
            if pad_h or pad_w:
                padded = cv2.copyMakeBorder(img_bgr, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT_101)
                return self._run_tile(session, padded, scale=scale)[: h * scale, : w * scale]
            return self._run_tile(session, img_bgr, scale=scale)

        step = max(32, tile_size - overlap)
        xs = _axis_starts(w, tile_size, step)
        ys = _axis_starts(h, tile_size, step)
        total_tiles = len(xs) * len(ys)

        out_h, out_w = h * scale, w * scale
        acc = np.zeros((out_h, out_w, 3), dtype=np.float32)
        w_acc = np.zeros((out_h, out_w, 1), dtype=np.float32)

        overlap_out = overlap * scale
        trim_out = min(12 * scale, overlap_out // 3)
        done = 0

        for y0 in ys:
            y1 = min(h, y0 + tile_size)
            has_prev_y = y0 > 0
            has_next_y = y1 < h
            wy = _ramp_weights_1d((y1 - y0) * scale, has_prev_y, has_next_y, overlap_out, trim_out)

            for x0 in xs:
                x1 = min(w, x0 + tile_size)
                has_prev_x = x0 > 0
                has_next_x = x1 < w
                wx = _ramp_weights_1d((x1 - x0) * scale, has_prev_x, has_next_x, overlap_out, trim_out)

                tile_out = self._run_tile(
                    session,
                    img_bgr[y0:y1, x0:x1],
                    scale=scale,
                    fixed_tile_size=tile_size,
                ).astype(np.float32)

                w2d = (wy[:, None] * wx[None, :])[..., None]
                oy0, oy1 = y0 * scale, y1 * scale
                ox0, ox1 = x0 * scale, x1 * scale
                acc[oy0:oy1, ox0:ox1] += tile_out * w2d
                w_acc[oy0:oy1, ox0:ox1] += w2d

                done += 1
                if tile_progress_cb:
                    tile_progress_cb(done, total_tiles)

        out = acc / np.maximum(w_acc, 1e-6)
        return np.clip(out, 0.0, 255.0).astype(np.uint8)

    def upscale_image_ai(
        self,
        img_bgr: np.ndarray,
        model_id: str,
        tile_progress_cb: Optional[Callable[[int, int], None]] = None,
    ) -> np.ndarray:
        info = MODEL_REGISTRY[model_id]
        session = self.get_session(model_id)
        try:
            return self._run_tiled_feather(
                session=session,
                img_bgr=img_bgr,
                scale=int(info["scale"]),
                tile_size=int(info["tile_size"]),
                overlap=int(info["tile_pad"]) * 2,
                align_multiple=1,
                tile_progress_cb=tile_progress_cb,
            )
        except Exception:
            # Fallback to CPU if DirectML hits WDDM/VRAM resource limits
            model_path = self.get_model_path(model_id)
            assert model_path is not None
            with self._lock:
                self._sessions.pop(model_id, None)
            gc.collect()
            cpu_sess = self._create_ort_session(model_path, model_id, force_cpu=True)
            return self._run_tiled_feather(
                session=cpu_sess,
                img_bgr=img_bgr,
                scale=int(info["scale"]),
                tile_size=int(info["tile_size"]),
                overlap=int(info["tile_pad"]) * 2,
                align_multiple=1,
                tile_progress_cb=tile_progress_cb,
            )

    def deblock_scunet_psnr(self, img_bgr: np.ndarray, prefer_ai: bool = False) -> np.ndarray:
        """Clean JPEG/MPEG compression blocks before upscaling without exhausting RAM."""
        if prefer_ai and _get_free_ram_mb() > 1600.0:
            try:
                scunet_path = self.ensure_aux_model("scunet-psnr")
                session = self._create_ort_session(scunet_path, "scunet-psnr", force_cpu=True, cache=False)
                try:
                    return self._run_tiled_feather(
                        session=session,
                        img_bgr=img_bgr,
                        scale=1,
                        tile_size=256,
                        overlap=64,
                        align_multiple=64,
                    )
                finally:
                    del session
                    gc.collect()
            except Exception:
                pass

        # Fast, low-RAM NLM + Bilateral deblocking (< 60 MB RAM)
        cleaned = cv2.fastNlMeansDenoisingColored(
            img_bgr, None, h=5.0, hColor=8.5, templateWindowSize=5, searchWindowSize=15
        )
        return cv2.bilateralFilter(cleaned, d=5, sigmaColor=16, sigmaSpace=4)

    def _get_soft_face_mask(self) -> np.ndarray:
        if self._face_mask_512 is None:
            mask = np.zeros((512, 512), dtype=np.float32)
            cv2.ellipse(mask, (256, 268), (195, 215), 0, 0, 360, 1.0, -1)
            mask = cv2.GaussianBlur(mask, (71, 71), 28)
            self._face_mask_512 = mask
        return self._face_mask_512

    def restore_faces_gfpgan(
        self,
        base_bgr: np.ndarray,
        upscaled_bgr: np.ndarray,
        blend_weight: float = 0.85,
    ) -> tuple[np.ndarray, int]:
        """Detect faces via YuNet, restore from clean base_bgr via GFPGANv1.4, and blend onto upscaled_bgr."""
        if not hasattr(cv2, "FaceDetectorYN"):
            return upscaled_bgr, 0

        yunet_path = self.ensure_aux_model("yunet")
        gfpgan_path = self.ensure_aux_model("gfpgan-v1.4")

        up_h, up_w = upscaled_bgr.shape[:2]
        det_scale = min(1.0, 1024.0 / max(up_h, up_w))
        det_w = max(64, int(round(up_w * det_scale)))
        det_h = max(64, int(round(up_h * det_scale)))
        det_img = cv2.resize(base_bgr, (det_w, det_h), interpolation=cv2.INTER_AREA) if det_scale < 1.0 else base_bgr

        detector = cv2.FaceDetectorYN.create(str(yunet_path), "", (det_w, det_h), 0.62, 0.3, 5000)
        _, faces = detector.detect(det_img)
        if faces is None or len(faces) == 0:
            return upscaled_bgr, 0

        keep_cached = _get_free_ram_mb() > 1400.0
        gfp_sess = self._create_ort_session(gfpgan_path, "gfpgan-v1.4", cache=keep_cached)
        in_name = gfp_sess.get_inputs()[0].name
        out_name = gfp_sess.get_outputs()[0].name

        if base_bgr.shape[:2] != (up_h, up_w):
            base_full = cv2.resize(base_bgr, (up_w, up_h), interpolation=cv2.INTER_LANCZOS4)
        else:
            base_full = base_bgr

        result = upscaled_bgr.astype(np.float32)
        soft_mask = self._get_soft_face_mask()
        restored_count = 0

        for face in faces:
            score = float(face[14])
            bw = float(face[2]) / det_scale
            bh = float(face[3]) / det_scale
            if score < 0.62 or min(bw, bh) < 28:
                continue

            landmarks = np.array(
                [
                    [face[4] / det_scale, face[5] / det_scale],
                    [face[6] / det_scale, face[7] / det_scale],
                    [face[8] / det_scale, face[9] / det_scale],
                    [face[10] / det_scale, face[11] / det_scale],
                    [face[12] / det_scale, face[13] / det_scale],
                ],
                dtype=np.float32,
            )

            M, _ = cv2.estimateAffinePartial2D(landmarks, _FFHQ_TEMPLATE_512, method=cv2.LMEDS)
            if M is None:
                continue

            cropped = cv2.warpAffine(
                base_full,
                M,
                (512, 512),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REFLECT_101,
            )

            rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB).astype(np.float32) / 127.5 - 1.0
            inp = np.transpose(rgb, (2, 0, 1))[None, ...]
            try:
                pred = gfp_sess.run([out_name], {in_name: inp})[0]
            except Exception:
                with self._lock:
                    self._sessions.pop("gfpgan-v1.4", None)
                gc.collect()
                gfp_sess = self._create_ort_session(gfpgan_path, "gfpgan-v1.4", force_cpu=True, cache=keep_cached)
                in_name = gfp_sess.get_inputs()[0].name
                out_name = gfp_sess.get_outputs()[0].name
                pred = gfp_sess.run([out_name], {in_name: inp})[0]

            out_rgb = np.transpose(pred[0], (1, 2, 0))
            out_rgb = np.clip((out_rgb + 1.0) * 127.5, 0.0, 255.0).astype(np.uint8)
            out_bgr = cv2.cvtColor(out_rgb, cv2.COLOR_RGB2BGR)

            M_inv = cv2.invertAffineTransform(M)
            warped_face = cv2.warpAffine(
                out_bgr,
                M_inv,
                (up_w, up_h),
                flags=cv2.INTER_LANCZOS4,
                borderMode=cv2.BORDER_REFLECT_101,
            ).astype(np.float32)
            warped_mask = cv2.warpAffine(
                soft_mask,
                M_inv,
                (up_w, up_h),
                flags=cv2.INTER_LINEAR,
            )[..., None] * float(np.clip(blend_weight, 0.1, 1.0))

            result = warped_face * warped_mask + result * (1.0 - warped_mask)
            restored_count += 1

        if not keep_cached:
            del gfp_sess
            gc.collect()

        return np.clip(result, 0.0, 255.0).astype(np.uint8), restored_count


model_manager = ModelManager()
