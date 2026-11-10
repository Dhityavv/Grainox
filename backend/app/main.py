from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import shutil
import threading
import time
import uuid
from typing import Any, Dict, Optional

import cv2
import imageio_ffmpeg
import numpy as np
import onnxruntime as ort
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import (
    IMAGE_EXTENSIONS,
    MODEL_REGISTRY,
    OUTPUTS_DIR,
    PREVIEWS_DIR,
    UPLOADS_DIR,
    VIDEO_EXTENSIONS,
    compute_target_dimensions,
)
from .enhancer import (
    _center_crop_to_aspect,
    _fit_with_letterbox,
    extract_video_preview,
    probe_media,
    process_image_file,
    process_video_file,
)
from .models_manager import model_manager

app = FastAPI(title="Archyl AI — Video & Photo 1K/2K/4K Enhancer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/files/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")
app.mount("/files/previews", StaticFiles(directory=str(PREVIEWS_DIR)), name="previews")

executor = ThreadPoolExecutor(max_workers=1)
jobs_lock = threading.Lock()
uploads_registry: Dict[str, Dict[str, Any]] = {}
jobs_registry: Dict[str, Dict[str, Any]] = {}


class EnhanceRequest(BaseModel):
    file_id: str
    resolution: str = Field(default="4K", pattern="^(1K|2K|4K)$")
    aspect_mode: str = Field(default="preserve", pattern="^(preserve|16:9-crop|16:9-pad|9:16-crop)$")
    model_id: str = Field(default="4x-clear-reality")
    profile: str = Field(default="general", pattern="^(general|portrait|anime|restore)$")
    face_restore: bool = Field(default=True)
    deblock_clean: bool = Field(default=True)
    natural_fidelity: float = Field(default=20.0, ge=0.0, le=100.0)
    sharpness: float = Field(default=25.0, ge=0.0, le=100.0)
    denoise: float = Field(default=15.0, ge=0.0, le=100.0)
    hdr_contrast: float = Field(default=15.0, ge=0.0, le=100.0)
    vibrance: float = Field(default=10.0, ge=0.0, le=100.0)
    quality: int = Field(default=92, ge=50, le=100)
    output_format: str = Field(default="auto")
    preserve_audio: bool = Field(default=True)
    target_fps: str = Field(default="original", pattern="^(original|30|60)$")


class PreviewFrameRequest(EnhanceRequest):
    timestamp_sec: float = Field(default=0.5, ge=0.0)


class TargetCalcRequest(BaseModel):
    width: int
    height: int
    resolution: str = "4K"
    aspect_mode: str = "preserve"


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    providers = ort.get_available_providers()
    ffmpeg_ok = Path(imageio_ffmpeg.get_ffmpeg_exe()).exists()
    return {
        "status": "ok",
        "providers": providers,
        "gpu_accelerated": "DmlExecutionProvider" in providers or "CUDAExecutionProvider" in providers,
        "ffmpeg_ready": ffmpeg_ok,
    }


@app.get("/api/models")
def list_models() -> Dict[str, Any]:
    return {"models": model_manager.get_models_status()}


@app.post("/api/models/{model_id}/download")
def trigger_model_download(model_id: str, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=404, detail="Model not found.")
    if model_manager.is_model_downloaded(model_id):
        return {"status": "ready", "model_id": model_id}

    def _run_dl() -> None:
        try:
            model_manager.download_model(model_id)
        except Exception:
            pass

    background_tasks.add_task(_run_dl)
    return {"status": "downloading", "model_id": model_id}


@app.post("/api/calc-targets")
def calc_targets(req: TargetCalcRequest) -> Dict[str, Any]:
    targets = {}
    for res in ("1K", "2K", "4K"):
        w, h = compute_target_dimensions(req.width, req.height, res, req.aspect_mode)
        targets[res] = {"width": w, "height": h}
    return {"targets": targets}


@app.post("/api/upload")
async def upload_media(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    ext = Path(file.filename).suffix.lower()
    if ext not in IMAGE_EXTENSIONS and ext not in VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Supported: images ({', '.join(sorted(IMAGE_EXTENSIONS))}) and videos ({', '.join(sorted(VIDEO_EXTENSIONS))}).",
        )

    file_id = uuid.uuid4().hex[:12]
    safe_stem = "".join(c if c.isalnum() or c in "-_" else "_" for c in Path(file.filename).stem)[:48] or "media"
    stored_name = f"{file_id}_{safe_stem}{ext}"
    dest_path = UPLOADS_DIR / stored_name

    with open(dest_path, "wb") as out_f:
        shutil.copyfileobj(file.file, out_f)

    try:
        meta = probe_media(dest_path)
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Failed to read media file: {exc}")

    targets = {}
    for res in ("1K", "2K", "4K"):
        tw, th = compute_target_dimensions(meta["width"], meta["height"], res, "preserve")
        targets[res] = {"width": tw, "height": th}

    record = {
        "file_id": file_id,
        "original_name": file.filename,
        "stored_name": stored_name,
        "path": str(dest_path),
        "url": f"/files/uploads/{stored_name}",
        **meta,
        "targets": targets,
    }
    uploads_registry[file_id] = record
    return record


@app.post("/api/load-sample")
def load_sample_media(kind: str = "photo") -> Dict[str, Any]:
    """Generate a built-in low-res sample photo or short video so users can test 1K/2K/4K immediately."""
    file_id = f"sample_{uuid.uuid4().hex[:8]}"
    if kind == "video":
        w, h, fps, frames = 480, 270, 24.0, 48
        stored_name = f"{file_id}_demo_clip.mp4"
        dest_path = UPLOADS_DIR / stored_name
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(dest_path), fourcc, fps, (w, h))
        try:
            for i in range(frames):
                frame = _render_rich_demo_frame(w, h, step=i)
                writer.write(frame)
        finally:
            writer.release()
        original_name = "demo_city_night_480x270.mp4"
    else:
        w, h = 480, 270
        stored_name = f"{file_id}_demo_photo.png"
        dest_path = UPLOADS_DIR / stored_name
        frame = _render_rich_demo_frame(w, h, step=12)
        cv2.imwrite(str(dest_path), frame)
        original_name = "demo_landscape_480x270.png"

    meta = probe_media(dest_path)
    targets = {}
    for res in ("1K", "2K", "4K"):
        tw, th = compute_target_dimensions(meta["width"], meta["height"], res, "preserve")
        targets[res] = {"width": tw, "height": th}

    record = {
        "file_id": file_id,
        "original_name": original_name,
        "stored_name": stored_name,
        "path": str(dest_path),
        "url": f"/files/uploads/{stored_name}",
        **meta,
        "targets": targets,
    }
    uploads_registry[file_id] = record
    return record


def _render_rich_demo_frame(w: int, h: int, step: int = 0) -> np.ndarray:
    """Create a rich, textured low-resolution test scene with fine details for demonstrating upscaling."""
    y_grad = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    x_grad = np.linspace(0, 1, w, dtype=np.float32)[None, :]

    img = np.zeros((h, w, 3), dtype=np.float32)
    # Twilight sky gradient (BGR)
    img[:, :, 0] = 65 + 110 * (1.0 - y_grad) + 25 * x_grad
    img[:, :, 1] = 32 + 55 * (1.0 - y_grad) * (1.0 - x_grad * 0.5)
    img[:, :, 2] = 28 + 125 * np.power(y_grad, 1.5) * (0.4 + 0.6 * x_grad)
    canvas = np.clip(img, 0, 255).astype(np.uint8)

    # Glowing sun/moon orb
    cx = int(w * (0.28 + 0.004 * step))
    cy = int(h * 0.34)
    cv2.circle(canvas, (cx, cy), 34, (130, 200, 255), -1, cv2.LINE_AA)
    cv2.circle(canvas, (cx, cy), 22, (200, 240, 255), -1, cv2.LINE_AA)

    # Layered mountain silhouettes
    pts1 = np.array([[0, h], [0, int(h * 0.65)], [int(w * 0.22), int(h * 0.45)], [int(w * 0.48), int(h * 0.62)], [int(w * 0.75), int(h * 0.40)], [w, int(h * 0.58)], [w, h]], np.int32)
    cv2.fillPoly(canvas, [pts1], (52, 42, 48))

    pts2 = np.array([[0, h], [0, int(h * 0.76)], [int(w * 0.18), int(h * 0.63)], [int(w * 0.42), int(h * 0.74)], [int(w * 0.68), int(h * 0.59)], [w, int(h * 0.72)], [w, h]], np.int32)
    cv2.fillPoly(canvas, [pts2], (28, 24, 30))

    # Crisp architectural silhouette + illuminated windows for upscaling clarity checks
    bx = int(w * 0.55)
    by = int(h * 0.52)
    cv2.rectangle(canvas, (bx, by), (bx + 68, h), (18, 18, 24), -1)
    for row in range(6):
        for col in range(4):
            wx = bx + 10 + col * 14
            wy = by + 12 + row * 18
            color = (120, 220, 255) if (row + col + step) % 3 != 0 else (70, 120, 180)
            cv2.rectangle(canvas, (wx, wy), (wx + 8, wy + 10), color, -1)

    cv2.putText(canvas, "4K STUDIO DEMO", (18, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230, 240, 255), 1, cv2.LINE_AA)
    # Add light compression-like softness/noise so enhancement contrast is clearly visible
    rng = np.random.default_rng(seed=42 + step)
    noise = rng.normal(0, 3.5, canvas.shape).astype(np.float32)
    canvas = np.clip(canvas.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return canvas


@app.post("/api/preview-frame")
def preview_frame(req: PreviewFrameRequest) -> Dict[str, Any]:
    upload = uploads_registry.get(req.file_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Uploaded media not found.")

    src_path = Path(upload["path"])
    if not src_path.exists():
        raise HTTPException(status_code=404, detail="Source file missing on disk.")

    options = req.model_dump()
    preview_id = uuid.uuid4().hex[:10]
    orig_prev = PREVIEWS_DIR / f"orig_{preview_id}.jpg"
    enh_prev = PREVIEWS_DIR / f"enh_{preview_id}.jpg"

    if upload["media_type"] == "video":
        info = extract_video_preview(src_path, orig_prev, enh_prev, req.timestamp_sec, options)
    else:
        # Fast photo preview using a temporary enhanced copy
        img = cv2.imread(str(src_path), cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to decode image.")
        from .enhancer import enhance_bgr_frame

        enhanced = enhance_bgr_frame(img, options, is_video=False)
        out_h, out_w = enhanced.shape[:2]
        orig_matched = img
        if req.aspect_mode in ("16:9-crop", "9:16-crop"):
            orig_matched = _center_crop_to_aspect(orig_matched, out_w, out_h)
        if req.aspect_mode == "16:9-pad":
            orig_matched = _fit_with_letterbox(orig_matched, out_w, out_h)
        else:
            orig_matched = cv2.resize(orig_matched, (out_w, out_h), interpolation=cv2.INTER_LINEAR)

        cv2.imwrite(str(orig_prev), orig_matched, [cv2.IMWRITE_JPEG_QUALITY, 94])
        cv2.imwrite(str(enh_prev), enhanced, [cv2.IMWRITE_JPEG_QUALITY, 94])
        info = {
            "width": out_w,
            "height": out_h,
            "orig_width": upload["width"],
            "orig_height": upload["height"],
        }

    return {
        "orig_url": f"/files/previews/{orig_prev.name}",
        "enhanced_url": f"/files/previews/{enh_prev.name}",
        **info,
    }


def _update_job(job_id: str, **updates: Any) -> None:
    with jobs_lock:
        if job_id in jobs_registry:
            jobs_registry[job_id].update(updates)


def _execute_enhance_job(job_id: str, upload: Dict[str, Any], options: Dict[str, Any]) -> None:
    try:
        with jobs_lock:
            if jobs_registry[job_id].get("cancel_requested"):
                jobs_registry[job_id]["status"] = "cancelled"
                return

        model_id = options["model_id"]
        if model_id in MODEL_REGISTRY and MODEL_REGISTRY[model_id]["is_ai"]:
            if not model_manager.is_model_downloaded(model_id):
                _update_job(job_id, status="downloading_model", stage=f"Downloading {MODEL_REGISTRY[model_id]['name']}...", progress=2.0)
                model_manager.download_model(
                    model_id,
                    progress_cb=lambda pct: _update_job(
                        job_id,
                        progress=round(pct * 0.1, 1),
                        stage=f"Downloading AI model ({pct:.0f}%)",
                    ),
                )

        _update_job(job_id, status="processing", started_at=time.time(), stage="Initializing pipeline...", progress=5.0)
        src_path = Path(upload["path"])
        stem = Path(upload["original_name"]).stem
        safe_stem = "".join(c if c.isalnum() or c in "-_" else "_" for c in stem)[:40] or "enhanced"
        res_tag = options["resolution"]
        out_base = OUTPUTS_DIR / f"{safe_stem}_{res_tag}_{job_id}"

        if upload["media_type"] == "image":
            def on_img_progress(pct: float, stage: str) -> None:
                _update_job(job_id, progress=round(pct, 1), stage=stage)

            result = process_image_file(src_path, out_base, options, progress_cb=on_img_progress)

            # Generate geometry-matched before image if cropped/letterboxed for clean Before/After slider
            before_url = upload["url"]
            if options.get("aspect_mode", "preserve") != "preserve":
                orig_bgr = cv2.imread(str(src_path), cv2.IMREAD_COLOR)
                if orig_bgr is not None:
                    ow, oh = result["width"], result["height"]
                    if options["aspect_mode"] in ("16:9-crop", "9:16-crop"):
                        orig_bgr = _center_crop_to_aspect(orig_bgr, ow, oh)
                    if options["aspect_mode"] == "16:9-pad":
                        orig_bgr = _fit_with_letterbox(orig_bgr, ow, oh)
                    else:
                        orig_bgr = cv2.resize(orig_bgr, (ow, oh), interpolation=cv2.INTER_LINEAR)
                    before_prev = PREVIEWS_DIR / f"before_{job_id}.jpg"
                    cv2.imwrite(str(before_prev), orig_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
                    before_url = f"/files/previews/{before_prev.name}"

            _update_job(
                job_id,
                status="completed",
                progress=100.0,
                stage="Completed",
                finished_at=time.time(),
                output_filename=result["output_filename"],
                output_url=f"/files/outputs/{result['output_filename']}",
                download_url=f"/api/download/{result['output_filename']}",
                before_url=before_url,
                output_width=result["width"],
                output_height=result["height"],
                file_size=result["file_size"],
                elapsed_sec=result["elapsed_sec"],
            )
        else:
            start_ts = time.time()

            def on_vid_progress(pct: float, stage: str, done_frames: int, total_frames: int) -> None:
                elapsed = max(0.01, time.time() - start_ts)
                fps_rate = done_frames / elapsed
                eta = int(round((total_frames - done_frames) / fps_rate)) if fps_rate > 0.05 and total_frames > done_frames else None
                _update_job(
                    job_id,
                    progress=round(pct, 1),
                    stage=stage,
                    frames_done=done_frames,
                    frames_total=total_frames,
                    eta_sec=eta,
                )

            def is_cancelled() -> bool:
                with jobs_lock:
                    return bool(jobs_registry.get(job_id, {}).get("cancel_requested"))

            result = process_video_file(
                src_path,
                out_base,
                options,
                progress_cb=on_vid_progress,
                cancel_check=is_cancelled,
            )

            _update_job(
                job_id,
                status="completed",
                progress=100.0,
                stage="Completed",
                eta_sec=0,
                finished_at=time.time(),
                output_filename=result["output_filename"],
                output_url=f"/files/outputs/{result['output_filename']}",
                download_url=f"/api/download/{result['output_filename']}",
                before_url=upload["url"],
                output_width=result["width"],
                output_height=result["height"],
                file_size=result["file_size"],
                elapsed_sec=result["elapsed_sec"],
            )
    except Exception as exc:
        with jobs_lock:
            cancelled = bool(jobs_registry.get(job_id, {}).get("cancel_requested"))
        _update_job(
            job_id,
            status="cancelled" if cancelled else "failed",
            stage="Cancelled" if cancelled else "Failed",
            error=None if cancelled else str(exc),
            finished_at=time.time(),
        )


@app.post("/api/enhance")
def start_enhance_job(req: EnhanceRequest) -> Dict[str, Any]:
    upload = uploads_registry.get(req.file_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Uploaded media not found.")

    job_id = uuid.uuid4().hex[:10]
    target_w, target_h = compute_target_dimensions(upload["width"], upload["height"], req.resolution, req.aspect_mode)

    job_record: Dict[str, Any] = {
        "job_id": job_id,
        "file_id": req.file_id,
        "original_name": upload["original_name"],
        "media_type": upload["media_type"],
        "source_width": upload["width"],
        "source_height": upload["height"],
        "target_width": target_w,
        "target_height": target_h,
        "resolution": req.resolution,
        "aspect_mode": req.aspect_mode,
        "model_id": req.model_id,
        "profile": req.profile,
        "status": "queued",
        "progress": 0.0,
        "stage": "Queued...",
        "frames_done": 0,
        "frames_total": upload.get("frame_count", 1),
        "eta_sec": None,
        "created_at": time.time(),
        "started_at": None,
        "finished_at": None,
        "elapsed_sec": None,
        "output_filename": None,
        "output_url": None,
        "download_url": None,
        "before_url": upload["url"],
        "file_size": None,
        "error": None,
        "cancel_requested": False,
    }

    with jobs_lock:
        jobs_registry[job_id] = job_record

    options = req.model_dump()
    executor.submit(_execute_enhance_job, job_id, upload, options)
    return job_record


@app.get("/api/jobs")
def list_jobs() -> Dict[str, Any]:
    with jobs_lock:
        ordered = sorted(jobs_registry.values(), key=lambda x: x["created_at"], reverse=True)
        return {"jobs": [dict(j) for j in ordered]}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> Dict[str, Any]:
    with jobs_lock:
        job = jobs_registry.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        return dict(job)


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str) -> Dict[str, Any]:
    with jobs_lock:
        job = jobs_registry.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        if job["status"] in ("completed", "failed", "cancelled"):
            return dict(job)
        job["cancel_requested"] = True
        if job["status"] == "queued":
            job["status"] = "cancelled"
            job["stage"] = "Cancelled"
        else:
            job["stage"] = "Cancelling..."
        return dict(job)


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str) -> Dict[str, Any]:
    with jobs_lock:
        job = jobs_registry.pop(job_id, None)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
    if job.get("output_filename"):
        out_path = OUTPUTS_DIR / job["output_filename"]
        out_path.unlink(missing_ok=True)
    return {"deleted": job_id}


@app.get("/api/download/{filename}")
def download_output(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    target = OUTPUTS_DIR / safe_name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Output file not found.")
    return FileResponse(path=str(target), filename=safe_name, media_type="application/octet-stream")


# Serve built frontend in production if frontend/dist exists
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

