/**
 * Replicate API client for image generation
 * Models: Recraft V3 (logos), Nano-Banana-Pro (banners)
 */

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

export interface GenerateImageOptions {
  prompt: string;
  model?: "recraft-v3" | "recraft-v3-svg" | "nano-banana" | "flux-schnell";
  width?: number;
  height?: number;
  style?: string;
}

interface ReplicateResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed";
  output?: string | string[];
  error?: string;
}

const MODEL_VERSIONS: Record<string, string> = {
  "recraft-v3": "recraft-ai/recraft-v3",
  "recraft-v3-svg": "recraft-ai/recraft-v3-svg",
  "nano-banana": "google/nano-banana-pro",
  "flux-schnell": "black-forest-labs/flux-schnell",
};

/**
 * Generate image using Replicate API
 */
export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const {
    prompt,
    model = "recraft-v3",
    width = 1024,
    height = 1024,
    style,
  } = options;

  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const modelId = MODEL_VERSIONS[model];
  if (!modelId) {
    throw new Error(`Unknown model: ${model}`);
  }

  // Build input based on model
  let input: Record<string, any> = { prompt };

  if (model === "recraft-v3" || model === "recraft-v3-svg") {
    input = {
      prompt,
      size: `${width}x${height}`,
      style: style || "digital_illustration",
    };
  } else if (model === "nano-banana") {
    input = {
      prompt,
      aspect_ratio: width > height ? "16:9" : width < height ? "9:16" : "1:1",
    };
  } else if (model === "flux-schnell") {
    input = {
      prompt,
      aspect_ratio: width > height ? "16:9" : width < height ? "9:16" : "1:1",
      output_format: "webp",
    };
  }

  // Create prediction
  const createResponse = await fetch(REPLICATE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      "Prefer": "wait", // Wait for result
    },
    body: JSON.stringify({
      model: modelId,
      input,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Replicate API error: ${error}`);
  }

  const prediction: ReplicateResponse = await createResponse.json();

  // If already succeeded (with Prefer: wait)
  if (prediction.status === "succeeded" && prediction.output) {
    return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  }

  // Otherwise poll for result
  const resultUrl = `${REPLICATE_API_URL}/${prediction.id}`;
  const maxAttempts = 60;
  const pollInterval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const pollResponse = await fetch(resultUrl, {
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
      },
    });

    if (!pollResponse.ok) {
      continue;
    }

    const result: ReplicateResponse = await pollResponse.json();

    if (result.status === "succeeded" && result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }

    if (result.status === "failed") {
      throw new Error(`Generation failed: ${result.error || "Unknown error"}`);
    }
  }

  throw new Error("Timeout waiting for image generation");
}

/**
 * Generate multiple images in parallel
 */
export async function generateImages(
  options: GenerateImageOptions,
  count: number
): Promise<string[]> {
  const promises = Array(count)
    .fill(null)
    .map(() => generateImage(options));

  return Promise.all(promises);
}
