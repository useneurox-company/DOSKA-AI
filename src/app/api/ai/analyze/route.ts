import { NextRequest, NextResponse } from "next/server";
import { analyzeMessage, analyzeUnprocessed, getAnalysisStats, getSourceMediaStats } from "@/lib/ai/analyzer";
import { prisma } from "@/lib/prisma";

// GET /api/ai/analyze - Получить статистику анализа
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const getSourceStats = searchParams.get("sourceStats") === "true";

    // Статистика по источникам (группам) с медиа
    if (getSourceStats) {
      const stats = await getSourceMediaStats();
      return NextResponse.json(stats);
    }

    // Общая статистика анализа
    const stats = await getAnalysisStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/ai/analyze - Запустить анализ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messageId,
      batch,
      batchSize = 10,
      includeMedia = true,
      sourceIds,  // Массив ID источников для фильтрации
      count,      // Количество или "all"
    } = body;

    // Анализ одного сообщения
    if (messageId) {
      const result = await analyzeMessage(messageId, { includeMedia });
      return NextResponse.json(result);
    }

    // Пакетный анализ
    if (batch) {
      const result = await analyzeUnprocessed({
        batchSize,
        includeMedia,
        delayMs: 500,
        sourceIds,
        count,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Укажите messageId или batch: true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/ai/analyze - Сбросить анализ для повторного тестирования
export async function DELETE() {
  try {
    // 1. Удаляем все заявки
    const deletedRequests = await prisma.request.deleteMany({});

    // 2. Сбрасываем флаг анализа и связь с заявками
    const resetMessages = await prisma.rawMessage.updateMany({
      where: { aiAnalyzed: true },
      data: {
        aiAnalyzed: false,
        requestId: null,
        aiMessageType: null,
        aiProductCategory: null,
        aiNomenclature: null,
        aiMaterial: null,
        aiPrice: null,
        aiPriceUnit: null,
        aiQuantity: null,
        aiCity: null,
        aiPhone: null,
        aiConfidence: null,
      },
    });

    return NextResponse.json({
      success: true,
      deletedRequests: deletedRequests.count,
      resetMessages: resetMessages.count,
    });
  } catch (error) {
    console.error("Reset analysis error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
