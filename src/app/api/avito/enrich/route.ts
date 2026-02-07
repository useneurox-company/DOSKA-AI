/**
 * API для обогащения Avito объявлений
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  startAvitoEnrichment,
  stopAvitoEnrichment,
  getAvitoEnrichmentJob,
  clearAvitoEnrichmentJob,
  getAvitoEnrichmentStats,
} from "@/lib/avito/enricher";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/avito/enrich
 * Query params:
 * - action: "status" | "stats"
 * - sourceId: string (для фильтрации)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const sourceId = searchParams.get("sourceId") || undefined;

    // Статус текущей задачи
    if (action === "status") {
      const job = getAvitoEnrichmentJob();
      return NextResponse.json(
        { job },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // Статистика обогащения
    if (action === "stats") {
      const stats = await getAvitoEnrichmentStats(prisma, sourceId);
      return NextResponse.json(stats, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    // Получить обогащённые объявления
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const moderation = searchParams.get("moderation");

    const where: any = {
      enrichedAt: { not: null },
    };

    if (sourceId) {
      where.sourceId = sourceId;
    }

    if (moderation) {
      where.moderationStatus = moderation;
    }

    const [ads, total] = await Promise.all([
      prisma.avitoAd.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { enrichedAt: "desc" },
        include: {
          source: {
            select: { name: true },
          },
        },
      }),
      prisma.avitoAd.count({ where }),
    ]);

    return NextResponse.json(
      { ads, total, limit, offset },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("GET /api/avito/enrich error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки данных" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/avito/enrich
 * Запустить обогащение
 *
 * Body:
 * - sourceId?: string
 * - limit?: number | "all"
 * - batchSize?: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sourceId, limit = 50, batchSize } = body;

    const jobId = await startAvitoEnrichment(prisma, {
      sourceId,
      limit: limit === "all" ? "all" : parseInt(limit) || 50,
      batchSize,
    });

    return NextResponse.json({ jobId, message: "Обогащение запущено" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка запуска";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/avito/enrich
 * Остановить обогащение
 */
export async function DELETE() {
  try {
    stopAvitoEnrichment();
    return NextResponse.json({ stopped: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка остановки";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * PATCH /api/avito/enrich
 * Очистить завершённую задачу или модерировать объявление
 *
 * Body:
 * - action: "clear" | "moderate"
 * - adId?: string (для moderate)
 * - status?: "approved" | "rejected" (для moderate)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, adId, status } = body;

    if (action === "clear") {
      clearAvitoEnrichmentJob();
      return NextResponse.json({ success: true });
    }

    if (action === "moderate" && adId && status) {
      await prisma.avitoAd.update({
        where: { id: adId },
        data: {
          moderationStatus: status,
          moderatedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
