import { NextResponse } from "next/server";
import { testConnection, analyzeText, chatCompletion } from "@/lib/ai/openrouter";

// GET /api/ai/test - Проверка работы обеих моделей
export async function GET() {
  const results: {
    lite?: { success: boolean; response?: string; error?: string };
    vision?: { success: boolean; response?: string; error?: string };
  } = {};

  // Тест дешёвой модели (lite)
  try {
    const liteResponse = await chatCompletion(
      [{ role: "user", content: "Скажи 'Lite OK'" }],
      { model: "lite" }
    );
    results.lite = { success: true, response: liteResponse };
  } catch (error) {
    results.lite = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }

  // Тест дорогой модели (vision)
  try {
    const visionResponse = await chatCompletion(
      [{ role: "user", content: "Скажи 'Vision OK'" }],
      { model: "vision" }
    );
    results.vision = { success: true, response: visionResponse };
  } catch (error) {
    results.vision = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }

  const allSuccess = results.lite?.success && results.vision?.success;

  return NextResponse.json({
    success: allSuccess,
    models: {
      lite: "google/gemini-2.5-flash-lite",
      vision: "google/gemini-2.5-flash",
    },
    results,
  });
}

// POST /api/ai/test - Тестовый анализ текста
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const result = await analyzeText(text);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
