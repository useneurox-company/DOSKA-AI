/**
 * API для работы с черновиками (Этап 1 классификации)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runClassification,
  getClassificationJob,
  stopClassificationJob,
  clearClassificationJob,
} from "@/lib/ai/classifier";

/**
 * GET /api/drafts - Получить список черновиков
 *
 * Query params:
 * - type: "request" | "offer" | "all" (default: "all")
 * - sourceId: string (optional)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - stats: "true" - вернуть только статистику
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const sourceId = searchParams.get("sourceId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const statsOnly = searchParams.get("stats") === "true";
    const jobStatus = searchParams.get("job") === "true";

    // Вернуть статус задачи
    if (jobStatus) {
      return NextResponse.json({
        job: getClassificationJob(),
      });
    }

    // Фильтр для черновиков (только request/offer)
    const where: any = {
      aiAnalyzed: true,
      aiMessageType: type === "all"
        ? { in: ["request", "offer"] }
        : type,
    };

    if (sourceId) {
      where.sourceId = sourceId;
    }

    // Только статистика
    if (statsOnly) {
      const [total, requests, offers, pending, sources] = await Promise.all([
        prisma.rawMessage.count({
          where: { aiAnalyzed: true, aiMessageType: { in: ["request", "offer"] } },
        }),
        prisma.rawMessage.count({
          where: { aiAnalyzed: true, aiMessageType: "request" },
        }),
        prisma.rawMessage.count({
          where: { aiAnalyzed: true, aiMessageType: "offer" },
        }),
        prisma.rawMessage.count({
          where: { aiAnalyzed: false, text: { not: null } },
        }),
        prisma.telegramSource.findMany({
          select: {
            id: true,
            name: true,
            username: true,
            _count: {
              select: { rawMessages: true },
            },
          },
          orderBy: { name: "asc" },
        }),
      ]);

      // Подсчитаем pending для каждого источника
      const sourcesWithPending = await Promise.all(
        sources.map(async (source) => {
          const pendingCount = await prisma.rawMessage.count({
            where: {
              sourceId: source.id,
              aiAnalyzed: false,
              text: { not: null },
            },
          });
          return {
            id: source.id,
            name: source.name,
            username: source.username,
            total: source._count.rawMessages,
            pending: pendingCount,
          };
        })
      );

      return NextResponse.json({
        total,
        requests,
        offers,
        pending,
        sources: sourcesWithPending,
      });
    }

    // Получить сообщения
    const [messages, total] = await Promise.all([
      prisma.rawMessage.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date: "desc" },
        select: {
          id: true,
          messageId: true,
          text: true,
          date: true,
          senderId: true,
          senderName: true,
          senderUsername: true,
          senderPhone: true,
          hasMedia: true,
          mediaType: true,
          mediaUrl: true,
          mediaFileName: true,
          aiMessageType: true,
          aiProductCategory: true,
          aiHasContacts: true,
          aiConfidence: true,
          aiReason: true,
          aiCity: true,
          aiModel: true,
          aiAnalyzedAt: true,
          source: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }),
      prisma.rawMessage.count({ where }),
    ]);

    return NextResponse.json({
      messages,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Drafts API] GET Error:", error);
    return NextResponse.json(
      { error: "Ошибка получения данных" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drafts - Запустить классификацию
 *
 * Body:
 * - sourceIds: string[] (optional)
 * - count: number | "all" (default: 100)
 * - model: "lite" | "smart" (default: "lite")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceIds, count = 100, model = "lite" } = body;

    const job = await runClassification(prisma, {
      sourceIds,
      limit: count === "all" ? "all" : parseInt(count),
      model: model === "smart" ? "smart" : "lite",
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[Drafts API] POST Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка запуска" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drafts - Остановить классификацию
 */
export async function DELETE() {
  try {
    stopClassificationJob();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Drafts API] DELETE Error:", error);
    return NextResponse.json(
      { error: "Ошибка остановки" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/drafts - Очистить завершённую задачу
 */
export async function PATCH() {
  try {
    clearClassificationJob();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Drafts API] PATCH Error:", error);
    return NextResponse.json(
      { error: "Ошибка очистки" },
      { status: 500 }
    );
  }
}
