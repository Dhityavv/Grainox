import subprocess
import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageOps

from .config import MODEL_REGISTRY, compute_target_dimensions
from .models_manager import model_manager


def get_ffmpeg_exe() -> str:
    return imageio_ffmpeg.get_ffmpeg_exe()


def probe_media(file_path: Path) -> Dict[str, Any]:
    """Inspect image or video dimensions, fps, duration, and audio presence."""
    suffix = file_path.suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}:
        with Image.open(file_path) as im:
            im = ImageOps.exif_transpose(im)
            w, h = im.size
            has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        return {
            "media_type": "image",
            "width": w,
            "height": h,
            "has_alpha": has_alpha,
            "file_size": file_path.stat().st_size,
        }

    cap = cv2.VideoCapture(str(file_path))
    if not cap.isOpened():
        raise ValueError("Unable to open video file.")
    try:
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
        if fps <= 0 or fps > 240:
            fps = 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = frame_count / fps if frame_count > 0 else 0.0
    finally:
        cap.release()

    has_audio = _video_has_audio(file_path)
    return {
        "media_type": "video",
        "width": w,
        "height": h,
        "fps": round(fps, 3),
        "frame_count": frame_count,
        "duration": round(duration, 2),
        "has_audio": has_audio,
        "file_size": file_path.stat().st_size,
    }


def _video_has_audio(file_path: Path) -> bool:
    ffmpeg = get_ffmpeg_exe()
    try:
        proc = subprocess.run(
            [ffmpeg, "-hide_banner", "-i", str(file_path)],
            capture_output=True,
            text=True,
            timeout=10,
        )
        stderr = proc.stderr or ""
        return "Audio:" in stderr
    except Exception:
        return False


def _center_crop_to_aspect(img: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    h, w = img.shape[:2]
    target_ratio = target_w / target_h
    src_ratio = w / h

    if abs(src_ratio - target_ratio) < 1e-3:
        return img

    if src_ratio > target_ratio:
        new_w = max(2, int(round(h * target_ratio)))
        x0 = (w - new_w) // 2
        return img[:, x0 : x0 + new_w]
    else:
        new_h = max(2, int(round(w / target_ratio)))
        y0 = (h - new_h) // 2
        return img[y0 : y0 + new_h, :]


def _fit_with_letterbox(img: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    h, w = img.shape[:2]
    scale = min(target_w / w, target_h / h)
    resized_w = max(2, int(round(w * scale)))
    resized_h = max(2, int(round(h * scale)))
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LANCZOS4
    resized = cv2.resize(img, (resized_w, resized_h), interpolation=interp)

    channels = img.shape[2] if img.ndim == 3 else 1
    canvas = (
        np.zeros((target_h, target_w, channels), dtype=img.dtype)
        if channels > 1
        else np.zeros((target_h, target_w), dtype=img.dtype)
    )
    x0 = (target_w - resized_w) // 2
    y0 = (target_h - resized_h) // 2
    canvas[y0 : y0 + resized_h, x0 : x0 + resized_w] = resized
    return canvas


def _apply_enhancements(
    img_bgr: np.ndarray,
    sharpness: float,
    denoise: float,
    hdr_contrast: float,
    vibrance: float,
    profile: str,
    is_video: bool = False,
    faces_restored: int = 0,
) -> np.ndarray:
    out = img_bgr

    # 1. Edge-preserving Denoise
    if denoise > 1.0:
        d_norm = min(1.0, denoise / 100.0)
        if is_video or d_norm < 0.45:
            sigma_color = 10.0 + d_norm * 28.0
            sigma_space = 4.0 + d_norm * 4.0
            denoised = cv2.bilateralFilter(out, d=5, sigmaColor=sigma_color, sigmaSpace=sigma_space)
            blend = 0.2 + d_norm * 0.45
            out = cv2.addWeighted(out, 1.0 - blend, denoised, blend, 0)
        else:
            h_strength = 2.5 + d_norm * 5.5
            denoised = cv2.fastNlMeansDenoisingColored(out, None, h_strength, h_strength, 7, 15)
            out = cv2.addWeighted(out, 0.35, denoised, 0.65, 0)

    # 2. Shadow-Safe HDR Tone & Halo-Free Luminance Sharpening in LAB space
    if hdr_contrast > 1.0 or sharpness > 1.0:
        lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        l_float = l_ch.astype(np.float32)

        # Protect deep shadows (like upper gums, dark eyes, hair) from black clipping
        shadow_guard = np.clip((l_float - 20.0) / 60.0, 0.15, 1.0)

        if hdr_contrast > 1.0:
            c_norm = min(1.0, hdr_contrast / 100.0)
            clahe = cv2.createCLAHE(clipLimit=1.0 + c_norm * 0.85, tileGridSize=(4, 4))
            l_clahe = clahe.apply(l_ch).astype(np.float32)
            # Only lift/enhance tone safely without crushing dark regions
            alpha = c_norm * (0.20 if profile == "portrait" else 0.30) * shadow_guard
            l_float = l_float * (1.0 - alpha) + l_clahe * alpha

        if sharpness > 1.0:
            s_norm = min(1.0, sharpness / 100.0)
            sigma = 0.9 if profile == "anime" else 1.15
            l_blur = cv2.GaussianBlur(l_float, (0, 0), sigmaX=sigma)
            detail = l_float - l_blur

            # Asymmetric halo suppression: prevents dark ringing borders around bright teeth/eyes
            detail = np.clip(detail, -9.0, 15.0)
            face_atten = 0.45 if faces_restored > 0 else 1.0
            gain = s_norm * (0.55 if profile == "portrait" else 0.80) * face_atten
            l_float = l_float + detail * gain * shadow_guard

        l_final = np.clip(l_float, 0.0, 255.0).astype(np.uint8)
        out = cv2.cvtColor(cv2.merge([l_final, a_ch, b_ch]), cv2.COLOR_LAB2BGR)

    # 3. Smart Vibrance (boost muted colors gently without oversaturating skin tones)
    if vibrance > 1.0:
        v_norm = min(1.0, vibrance / 100.0)
        hsv = cv2.cvtColor(out, cv2.COLOR_BGR2HSV).astype(np.float32)
        s = hsv[:, :, 1] / 255.0
        boost = v_norm * 0.42 * (1.0 - s)
        hsv[:, :, 1] = np.clip((s + s * boost) * 255.0, 0.0, 255.0)
        out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    return out


def enhance_bgr_frame(
    img_bgr: np.ndarray,
    options: Dict[str, Any],
    is_video: bool = False,
    tile_progress_cb: Optional[Callable[[int, int], None]] = None,
) -> np.ndarray:
    """Upscale and enhance a single BGR image/frame to target 1K/2K/4K resolution."""
    resolution = options.get("resolution", "4K")
    aspect_mode = options.get("aspect_mode", "preserve")
    model_id = options.get("model_id", "4x-clear-reality")
    profile = options.get("profile", "general")
    face_restore = bool(options.get("face_restore", not is_video))
    deblock_clean = bool(options.get("deblock_clean", not is_video))
    natural_fidelity = float(options.get("natural_fidelity", 20.0))
    sharpness = float(options.get("sharpness", 25.0))
    denoise = float(options.get("denoise", 15.0))
    hdr_contrast = float(options.get("hdr_contrast", 15.0))
    vibrance = float(options.get("vibrance", 10.0))

    if model_id not in MODEL_REGISTRY:
        model_id = "studio-fast"

    model_info = MODEL_REGISTRY[model_id]
    src_h, src_w = img_bgr.shape[:2]
    target_w, target_h = compute_target_dimensions(src_w, src_h, resolution, aspect_mode)

    working = img_bgr
    if aspect_mode in ("16:9-crop", "9:16-crop"):
        working = _center_crop_to_aspect(working, target_w, target_h)

    work_h, work_w = working.shape[:2]
    if aspect_mode == "16:9-pad":
        fit_scale = min(target_w / work_w, target_h / work_h)
        needed_w = max(2, int(round(work_w * fit_scale)))
        needed_h = max(2, int(round(work_h * fit_scale)))
    else:
        needed_w, needed_h = target_w, target_h

    scale_ratio = max(needed_w / work_w, needed_h / work_h)

    # Clean compression blocks (JPEG/MPEG macroblocks) via SCUNet PSNR on compressed/low-res inputs
    ai_input = working
    deblocked = False
    if model_info["is_ai"] and deblock_clean and not is_video:
        if min(work_w, work_h) < 900 or profile == "restore":
            try:
                ai_input = model_manager.deblock_scunet_psnr(working, prefer_ai=(profile == "restore"))
                deblocked = True
            except Exception:
                ai_input = working
        else:
            ai_input = cv2.bilateralFilter(working, d=5, sigmaColor=16, sigmaSpace=4)

    if model_info["is_ai"] and not deblocked and denoise > 40.0:
        ai_input = cv2.bilateralFilter(ai_input, d=5, sigmaColor=20, sigmaSpace=5)

    # Clean Lanczos4 reference at target resolution (used for fidelity anchoring & clean GFPGAN input)
    if work_w != needed_w or work_h != needed_h:
        base_interp = cv2.INTER_AREA if scale_ratio < 1.0 else cv2.INTER_LANCZOS4
        base_resized = cv2.resize(ai_input, (needed_w, needed_h), interpolation=base_interp)
    else:
        base_resized = ai_input.copy()

    use_ai = model_info["is_ai"] and (scale_ratio > 1.05 or profile == "restore")
    if use_ai:
        upscaled = model_manager.upscale_image_ai(
            ai_input,
            model_id=model_id,
            tile_progress_cb=tile_progress_cb,
        )
        up_h, up_w = upscaled.shape[:2]
        if needed_w > up_w * 1.15 or needed_h > up_h * 1.15:
            upscaled = cv2.resize(upscaled, (needed_w, needed_h), interpolation=cv2.INTER_LANCZOS4)
        elif up_w != needed_w or up_h != needed_h:
            interp = cv2.INTER_AREA if (needed_w < up_w or needed_h < up_h) else cv2.INTER_LANCZOS4
            upscaled = cv2.resize(upscaled, (needed_w, needed_h), interpolation=interp)

        # Natural texture fidelity blend: prevents GANs from over-darkening shadows or hallucinating edges
        if natural_fidelity > 1.0:
            fid_alpha = min(0.45, (natural_fidelity / 100.0) * 0.45)
            upscaled = cv2.addWeighted(upscaled, 1.0 - fid_alpha, base_resized, fid_alpha, 0)

        effective_sharpness = sharpness * 0.65
        effective_denoise = 0.0 if deblocked else (max(0.0, denoise - 20.0) if denoise > 20.0 else denoise * 0.35)
    else:
        upscaled = base_resized
        effective_sharpness = sharpness
        effective_denoise = 0.0 if deblocked else denoise

    # Face Restoration (GFPGAN v1.4) fed from clean base_resized so blurred teeth/eyes restore naturally
    faces_restored = 0
    if face_restore and profile != "anime":
        try:
            face_blend = 0.88 if profile in ("portrait", "restore") else 0.78
            upscaled, faces_restored = model_manager.restore_faces_gfpgan(
                base_bgr=base_resized,
                upscaled_bgr=upscaled,
                blend_weight=face_blend,
            )
        except Exception:
            faces_restored = 0

    enhanced = _apply_enhancements(
        upscaled,
        sharpness=effective_sharpness,
        denoise=effective_denoise,
        hdr_contrast=hdr_contrast,
        vibrance=vibrance,
        profile=profile,
        is_video=is_video,
        faces_restored=faces_restored,
    )

    if aspect_mode == "16:9-pad":
        enhanced = _fit_with_letterbox(enhanced, target_w, target_h)

    return enhanced


def process_image_file(
    input_path: Path,
    output_path: Path,
    options: Dict[str, Any],
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> Dict[str, Any]:
    """Process a photo to 1K/2K/4K and save with metadata."""
    start = time.time()
    if progress_cb:
        progress_cb(5.0, "Reading image...")

    with Image.open(input_path) as im:
        im = ImageOps.exif_transpose(im)
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        if has_alpha:
            rgba = im.convert("RGBA")
            arr = np.array(rgba)
            bgr = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR)
            alpha = arr[:, :, 3]
        else:
            rgb = im.convert("RGB")
            bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
            alpha = None

    if progress_cb:
        progress_cb(15.0, "Enhancing & upscaling...")

    def on_tile(done: int, total: int) -> None:
        if progress_cb and total > 0:
            pct = 15.0 + (done / total) * 75.0
            progress_cb(pct, f"AI tile {done}/{total}")

    enhanced_bgr = enhance_bgr_frame(bgr, options, is_video=False, tile_progress_cb=on_tile)
    out_h, out_w = enhanced_bgr.shape[:2]

    if progress_cb:
        progress_cb(92.0, "Encoding output image...")

    out_fmt = options.get("output_format", "auto").lower()
    if out_fmt == "auto":
        src_ext = input_path.suffix.lower()
        if alpha is not None or src_ext == ".png":
            out_fmt = "png"
        elif src_ext == ".webp":
            out_fmt = "webp"
        else:
            out_fmt = "jpg"

    final_path = output_path.with_suffix(f".{out_fmt}")
    quality = int(max(50, min(100, int(options.get("quality", 92)))))

    rgb_out = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)
    if alpha is not None and out_fmt in ("png", "webp"):
        aspect_mode = options.get("aspect_mode", "preserve")
        if aspect_mode in ("16:9-crop", "9:16-crop"):
            alpha = _center_crop_to_aspect(alpha, out_w, out_h)
        if aspect_mode == "16:9-pad":
            alpha_resized = _fit_with_letterbox(alpha, out_w, out_h)
        else:
            alpha_resized = cv2.resize(alpha, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4)
        pil_out = Image.fromarray(np.dstack([rgb_out, alpha_resized]), mode="RGBA")
    else:
        pil_out = Image.fromarray(rgb_out, mode="RGB")

    save_kwargs: Dict[str, Any] = {}
    if out_fmt in ("jpg", "jpeg"):
        save_kwargs = {"quality": quality, "subsampling": 0, "optimize": True}
    elif out_fmt == "webp":
        save_kwargs = {"quality": quality, "method": 4}
    elif out_fmt == "png":
        save_kwargs = {"compress_level": 4}

    pil_out.save(final_path, **save_kwargs)

    if progress_cb:
        progress_cb(100.0, "Completed")

    return {
        "output_path": str(final_path),
        "output_filename": final_path.name,
        "width": out_w,
        "height": out_h,
        "file_size": final_path.stat().st_size,
        "elapsed_sec": round(time.time() - start, 2),
    }


def extract_video_preview(
    video_path: Path,
    orig_preview_path: Path,
    enh_preview_path: Path,
    timestamp_sec: float,
    options: Dict[str, Any],
) -> Dict[str, Any]:
    """Extract one video frame and generate an enhanced preview for fast Before/After tuning."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError("Unable to open video for preview.")

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        target_frame = max(0, int(round(timestamp_sec * fps)))
        if total_frames > 0:
            target_frame = min(target_frame, total_frames - 1)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ok, frame = cap.read()
        if not ok or frame is None:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
        if not ok or frame is None:
            raise ValueError("Failed to read video frame.")
    finally:
        cap.release()

    enhanced = enhance_bgr_frame(frame, options, is_video=True)
    out_h, out_w = enhanced.shape[:2]

    aspect_mode = options.get("aspect_mode", "preserve")
    orig_matched = frame
    if aspect_mode in ("16:9-crop", "9:16-crop"):
        orig_matched = _center_crop_to_aspect(orig_matched, out_w, out_h)
    if aspect_mode == "16:9-pad":
        orig_matched = _fit_with_letterbox(orig_matched, out_w, out_h)
    else:
        orig_matched = cv2.resize(orig_matched, (out_w, out_h), interpolation=cv2.INTER_LINEAR)

    cv2.imwrite(str(orig_preview_path), orig_matched, [cv2.IMWRITE_JPEG_QUALITY, 94])
    cv2.imwrite(str(enh_preview_path), enhanced, [cv2.IMWRITE_JPEG_QUALITY, 94])

    return {
        "width": out_w,
        "height": out_h,
        "orig_width": int(frame.shape[1]),
        "orig_height": int(frame.shape[0]),
    }


def process_video_file(
    input_path: Path,
    output_path: Path,
    options: Dict[str, Any],
    progress_cb: Optional[Callable[[float, str, int, int], None]] = None,
    cancel_check: Optional[Callable[[], bool]] = None,
) -> Dict[str, Any]:
    """Upscale and enhance a video frame-by-frame, piping to FFmpeg with original audio preserved."""
    start = time.time()
    ffmpeg = get_ffmpeg_exe()
    meta = probe_media(input_path)
    src_w = meta["width"]
    src_h = meta["height"]
    src_fps = float(meta["fps"])
    total_frames = max(1, int(meta.get("frame_count", 0)))
    has_audio = bool(meta.get("has_audio", False))

    resolution = options.get("resolution", "4K")
    aspect_mode = options.get("aspect_mode", "preserve")
    target_w, target_h = compute_target_dimensions(src_w, src_h, resolution, aspect_mode)

    preserve_audio = bool(options.get("preserve_audio", True)) and has_audio
    target_fps_opt = str(options.get("target_fps", "original"))
    quality = int(max(50, min(100, int(options.get("quality", 90)))))
    crf = int(round(25 - ((quality - 50) / 50.0) * 12))
    crf = max(12, min(26, crf))

    final_path = output_path.with_suffix(".mp4")

    cmd = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-vcodec",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{target_w}x{target_h}",
        "-r",
        f"{src_fps:.3f}",
        "-i",
        "-",
    ]

    if preserve_audio:
        cmd.extend(["-i", str(input_path), "-map", "0:v:0", "-map", "1:a:0?"])
    else:
        cmd.extend(["-map", "0:v:0"])

    if target_fps_opt in ("30", "60"):
        cmd.extend(["-vf", f"fps={target_fps_opt}"])

    cmd.extend(
        [
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            str(crf),
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
        ]
    )

    if preserve_audio:
        cmd.extend(["-c:a", "aac", "-b:a", "192k", "-shortest"])

    cmd.append(str(final_path))

    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        raise ValueError("Unable to open video file for processing.")

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    processed_frames = 0
    cancelled = False
    try:
        while True:
            if cancel_check and cancel_check():
                cancelled = True
                break

            ok, frame = cap.read()
            if not ok or frame is None:
                break

            enhanced = enhance_bgr_frame(frame, options, is_video=True)
            if enhanced.shape[1] != target_w or enhanced.shape[0] != target_h:
                enhanced = cv2.resize(enhanced, (target_w, target_h), interpolation=cv2.INTER_AREA)

            assert proc.stdin is not None
            proc.stdin.write(enhanced.tobytes())
            processed_frames += 1

            if progress_cb:
                pct = min(98.0, (processed_frames / max(total_frames, processed_frames)) * 98.0)
                progress_cb(
                    pct,
                    f"Frame {processed_frames}/{total_frames}",
                    processed_frames,
                    total_frames,
                )

        if proc.stdin:
            proc.stdin.close()

        stderr_bytes = proc.stderr.read() if proc.stderr else b""
        ret_code = proc.wait()

        if cancelled:
            if final_path.exists():
                final_path.unlink(missing_ok=True)
            raise RuntimeError("Job cancelled by user.")

        if ret_code != 0:
            err_msg = stderr_bytes.decode("utf-8", errors="ignore").strip()
            raise RuntimeError(f"FFmpeg encoding failed ({ret_code}): {err_msg}")
    finally:
        cap.release()
        if proc.poll() is None:
            proc.kill()

    if progress_cb:
        progress_cb(100.0, "Completed", processed_frames, total_frames)

    return {
        "output_path": str(final_path),
        "output_filename": final_path.name,
        "width": target_w,
        "height": target_h,
        "frames_processed": processed_frames,
        "file_size": final_path.stat().st_size,
        "elapsed_sec": round(time.time() - start, 2),
    }
