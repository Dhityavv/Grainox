from pathlib import Path
from typing import Dict, Literal, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
PREVIEWS_DIR = STORAGE_DIR / "previews"

for directory in (MODELS_DIR, STORAGE_DIR, UPLOADS_DIR, OUTPUTS_DIR, PREVIEWS_DIR):
    directory.mkdir(parents=True, exist_ok=True)

ResolutionPreset = Literal["1K", "2K", "4K"]
AspectMode = Literal["preserve", "16:9-crop", "16:9-pad", "9:16-crop"]

RESOLUTION_BOXES: Dict[str, Tuple[int, int]] = {
    "1K": (1920, 1080),
    "2K": (2560, 1440),
    "4K": (3840, 2160),
}

MODEL_REGISTRY = {
    "4x-clear-reality": {
        "id": "4x-clear-reality",
        "name": "ClearReality v1 Soft (Natural Photo AI)",
        "description_id": "Rekomendasi utama untuk foto — natural, tajam alami tanpa bercak/lukisan kartun.",
        "description_en": "Recommended for photos — natural crisp restoration without harsh GAN artifacts.",
        "filename": "4x-ClearRealityV1_Soft.onnx",
        "url": "https://huggingface.co/Rennart/RennartDenoise-onnx/resolve/main/upscale/4x-ClearRealityV1_Soft.onnx",
        "size_mb": 1.6,
        "scale": 4,
        "is_ai": True,
        "tile_size": 256,
        "tile_pad": 24,
    },
    "realesr-general-x4v3": {
        "id": "realesr-general-x4v3",
        "name": "Real-ESRGAN General v3 (AI 4x Fast)",
        "description_id": "Model AI cepat untuk video & animasi; ringan dan responsif di GPU.",
        "description_en": "Fast neural network AI upscaler ideal for videos and clean graphics.",
        "filename": "realesr-general-x4v3.onnx",
        "url": "https://huggingface.co/CoderViking/realesr-general-x4v3-onnx/resolve/main/realesr-general-x4v3.onnx",
        "size_mb": 4.9,
        "scale": 4,
        "is_ai": True,
        "tile_size": 256,
        "tile_pad": 24,
    },
    "realesrgan-x4plus": {
        "id": "realesrgan-x4plus",
        "name": "Real-ESRGAN x4plus (AI Texture Boost)",
        "description_id": "Model RRDBNet bertekstur agresif (cocok untuk foto tajam yang butuh detail ekstra).",
        "description_en": "Aggressive RRDBNet texture synthesizer (best on already-clean sharp photos).",
        "filename": "realesrgan_x4plus.onnx",
        "url": "https://huggingface.co/anakhiu/realesrgan-onnx/resolve/main/realesrgan_x4plus.onnx",
        "size_mb": 67.0,
        "scale": 4,
        "is_ai": True,
        "tile_size": 256,
        "tile_pad": 24,
    },
    "studio-fast": {
        "id": "studio-fast",
        "name": "Studio Crisp Pro (Algorithmic)",
        "description_id": "Pipeline Lanczos4 + Multi-Scale Detail + Denoise + Tone tanpa beban VRAM.",
        "description_en": "Fast Lanczos4 + multi-scale detail, denoise & tone pipeline with zero model wait.",
        "filename": None,
        "url": None,
        "size_mb": 0.0,
        "scale": 1,
        "is_ai": False,
        "tile_size": 0,
        "tile_pad": 0,
    },
}

AUX_MODELS = {
    "yunet": {
        "filename": "face_detection_yunet_2023mar.onnx",
        "url": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    },
    "gfpgan-v1.4": {
        "filename": "GFPGANv1.4.onnx",
        "url": "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.4.onnx",
    },
    "scunet-psnr": {
        "filename": "scunet_color_real_psnr.onnx",
        "url": "https://huggingface.co/Rennart/RennartDenoise-onnx/resolve/main/denoise/scunet_color_real_psnr.onnx",
    },
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}


def _make_even(value: int) -> int:
    value = max(2, int(round(value)))
    return value if value % 2 == 0 else value + 1


def compute_target_dimensions(
    src_w: int,
    src_h: int,
    preset: str = "4K",
    aspect_mode: str = "preserve",
) -> Tuple[int, int]:
    """Compute even target (width, height) for 1K, 2K, or 4K output."""
    if src_w <= 0 or src_h <= 0:
        raise ValueError("Source dimensions must be positive integers.")

    base_w, base_h = RESOLUTION_BOXES.get(preset.upper(), RESOLUTION_BOXES["4K"])

    if aspect_mode == "16:9-crop" or aspect_mode == "16:9-pad":
        return base_w, base_h
    if aspect_mode == "9:16-crop":
        return base_h, base_w

    if src_w >= src_h:
        box_w, box_h = base_w, base_h
    else:
        box_w, box_h = base_h, base_w

    scale = min(box_w / src_w, box_h / src_h)
    out_w = _make_even(src_w * scale)
    out_h = _make_even(src_h * scale)
    return out_w, out_h
