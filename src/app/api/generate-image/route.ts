import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

interface ReplicateResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
}

/**
 * POST /api/generate-image
 * Generate images using Replicate API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = "recraft-v3-svg", count = 1 } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 });
    }

    // Model mapping
    const modelMap: Record<string, string> = {
      "recraft-v3-svg": "recraft-ai/recraft-v3-svg",
      "recraft-v3": "recraft-ai/recraft-v3",
      "nano-banana": "google/nano-banana-pro",
    };

    const modelId = modelMap[model];
    if (!modelId) {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    // Generate images
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      // Build input based on model
      let input: Record<string, any>;

      if (model === "recraft-v3-svg") {
        input = {
          prompt,
          size: "1024x1024",
          style: "any", // SVG styles: any, engraving, line_art, line_circuit, linocut
        };
      } else if (model === "recraft-v3") {
        input = {
          prompt,
          size: "1365x1024", // 4:3 for banners
          style: "realistic_image",
        };
      } else {
        // nano-banana
        input = {
          prompt,
          aspect_ratio: "16:9", // banner format
        };
      }

      console.log(`[Generate] Starting ${model} generation ${i + 1}/${count}...`);

      // Create prediction using model endpoint
      const apiUrl = `https://api.replicate.com/v1/models/${modelId}/predictions`;

      const createResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          "Prefer": "wait=60", // Wait up to 60 seconds
        },
        body: JSON.stringify({ input }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`[Generate] Replicate error: ${errorText}`);
        continue;
      }

      const prediction: ReplicateResponse = await createResponse.json();

      // If already succeeded
      if (prediction.status === "succeeded" && prediction.output) {
        const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        images.push(url);
        console.log(`[Generate] ✓ Generated image ${i + 1}`);
        continue;
      }

      // Poll for result
      const resultUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
      const maxAttempts = 60;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pollResponse = await fetch(resultUrl, {
          headers: { "Authorization": `Bearer ${REPLICATE_API_TOKEN}` },
        });

        if (!pollResponse.ok) continue;

        const result: ReplicateResponse = await pollResponse.json();

        if (result.status === "succeeded" && result.output) {
          const url = Array.isArray(result.output) ? result.output[0] : result.output;
          images.push(url);
          console.log(`[Generate] ✓ Generated image ${i + 1}`);
          break;
        }

        if (result.status === "failed" || result.status === "canceled") {
          console.error(`[Generate] Failed: ${result.error}`);
          break;
        }
      }
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
