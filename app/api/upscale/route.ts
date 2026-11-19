import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { incrementPlatformStats } from "@/lib/server-stats";

function getUpscaylPaths() {
  const exePath = ["C:", "Program Files", "Upscayl", "resources", "bin", "upscayl-bin.exe"].join(path.sep);
  const modelsPath = ["C:", "Program Files", "Upscayl", "resources", "models"].join(path.sep);
  return { exePath, modelsPath };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, model = "ultrasharp-4x", scale = 4 } = body;

    if (!image) {
      return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 400 });
    }

    const { exePath, modelsPath } = getUpscaylPaths();

    // 1. Detect if Local Upscayl NCNN Engine exists
    if (fs.existsSync(exePath) && fs.existsSync(modelsPath)) {
      const tempId = `grainox_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const tempInput = path.join(os.tmpdir(), `${tempId}_in.png`);
      const tempOutput = path.join(os.tmpdir(), `${tempId}_out.png`);

      // Strip Data URI prefix if present and save to temp file
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(tempInput, Buffer.from(base64Data, "base64"));

      // Model mapping (support user choices: UltraSharp, Digital Art / Anime, ReMacri)
      const validModels = [
        "ultrasharp-4x",
        "digital-art-4x",
        "remacri-4x",
        "ultramix-balanced-4x",
        "upscayl-standard-4x",
      ];
      const selectedModel = validModels.includes(model) ? model : "ultrasharp-4x";

      // Execute Upscayl NCNN Engine
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          exePath,
          [
            "-i", tempInput,
            "-o", tempOutput,
            "-m", modelsPath,
            "-n", selectedModel,
            "-s", scale.toString(),
            "-f", "png",
          ],
          { windowsHide: true }
        );

        let errorLog = "";
        proc.stderr?.on("data", (data) => {
          errorLog += data.toString();
        });

        proc.on("close", (code) => {
          if (code === 0 && fs.existsSync(tempOutput)) {
            resolve();
          } else {
            reject(new Error(`Upscayl exit code ${code}: ${errorLog}`));
          }
        });

        proc.on("error", (err) => reject(err));
      });

      // Read resulting output image
      const outputBuffer = fs.readFileSync(tempOutput);
      const outputBase64 = `data:image/png;base64,${outputBuffer.toString("base64")}`;
      const sizeBytes = outputBuffer.length;

      // Clean up temp files
      try {
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch {
        // safe ignore
      }

      // Auto increment server telemetry on successful upscale
      try {
        incrementPlatformStats("upscale", 1.8);
      } catch {}

      return NextResponse.json({
        success: true,
        dataUrl: outputBase64,
        sizeBytes,
        engine: `Upscayl Core (${selectedModel.toUpperCase()})`,
        scale,
      });
    }

    // 2. Cloud Fallback when deployed on Cloud / Vercel (HuggingFace Serverless Inference API)
    const hfToken = process.env.HF_TOKEN; // Optional HuggingFace token
    const hfModel = "caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr";
    const hfUrl = `https://api-inference.huggingface.co/models/${hfModel}`;

    const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const hfResponse = await fetch(hfUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
      },
      body: imageBuffer,
    });

    if (hfResponse.ok) {
      const arrayBuffer = await hfResponse.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuffer);
      const outputBase64 = `data:image/png;base64,${outputBuffer.toString("base64")}`;

      // Auto increment server telemetry on successful upscale
      try {
        incrementPlatformStats("upscale", 1.8);
      } catch {}

      return NextResponse.json({
        success: true,
        dataUrl: outputBase64,
        sizeBytes: outputBuffer.length,
        engine: "Cloud Swin2SR Super-Resolution",
        scale,
      });
    }

    return NextResponse.json(
      { error: "Engine Upscayl lokal tidak ditemukan dan cloud inference offline." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Upscale API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses AI upscale." },
      { status: 500 }
    );
  }
}
