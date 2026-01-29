/**
 * API для обогащения сообщений
 * Поддерживает мульти-категорийное обогащение
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  startEnrichmentJob,
  stopEnrichmentJob,
  stopAllJobs,
  getActiveJobs,
  getJobHistory,
  getEnrichmentStats,
} from "@/lib/ai/enricher";

// Отключаем кэширование для этого роута
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/drafts/enrich
 * Query params:
 * - action: "status" | "stats" | "history"
 * - categoryId: string (для фильтрации)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const categoryId = searchParams.get("categoryId");

    // Статус активных заданий
    if (action === "status") {
      const jobs = await getActiveJobs(prisma);
      return NextResponse.json(
        { jobs },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // История заданий
    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = parseInt(searchParams.get("offset") || "0");

      const jobs = await getJobHistory(prisma, {
        categoryId: categoryId || undefined,
        limit,
        offset,
      });
      return NextResponse.json(
        { jobs },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // Статистика по обогащённым
    if (action === "stats") {
      const stats = await getEnrichmentStats(prisma, categoryId);
      return NextResponse.json(stats, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    // Получить обогащённые карточки
    const type = searchParams.get("type") as "REQUEST" | "OFFER" | undefined;
    const category = searchParams.get("category"); // slug категории (metal, construction, etc.)
    const moderation = searchParams.get("moderation"); // pending, approved, rejected
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const messages = await prisma.rawMessage.findMany({
      where: {
        enrichedAt: { not: null },
        enrichedData: { not: null },
        ...(type && {
          aiMessageType: type === "REQUEST" ? "request" : "offer",
        }),
        ...(categoryId && {
          enrichmentCategoryId: categoryId,
        }),
        ...(category && {
          aiProductCategory: category,  // Фильтр по slug категории из классификации
        }),
        ...(moderation && {
          moderationStatus: moderation,
        }),
      },
      take: limit,
      skip: offset,
      orderBy: { enrichedAt: "desc" },
      select: {
        id: true,
        text: true,
        date: true,
        senderName: true,
        senderUsername: true,
        senderPhone: true,
        hasMedia: true,
        mediaType: true,
        mediaUrl: true,
        mediaFileName: true,
        enrichedData: true,
        moderationStatus: true,
        moderatedAt: true,
        enrichmentCategory: {
          select: { id: true, name: true, slug: true },
        },
        source: {
          select: { name: true, username: true },
        },
      },
    });

    const cards = messages
      .map((m: any) => {
        try {
          const enriched = JSON.parse(m.enrichedData);
          // Пропускаем skipped (photo-only) карточки
          if (enriched.skipped) return null;
          return {
            ...enriched,
            enrichmentCategory: m.enrichmentCategory,
            moderationStatus: m.moderationStatus,
            moderatedAt: m.moderatedAt,
            originalMessage: {
              id: m.id,
              text: m.text,
              date: m.date,
              senderName: m.senderName,
              senderUsername: m.senderUsername,
              senderPhone: m.senderPhone,
              hasMedia: m.hasMedia,
              mediaType: m.mediaType,
              mediaUrl: m.mediaUrl,
              mediaFileName: m.mediaFileName,
              sourceName: m.source?.name,
              sourceUsername: m.source?.username,
            },
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json(
      { cards },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("GET /api/drafts/enrich error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки данных", cards: [] },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

/**
 * POST /api/drafts/enrich
 * Запустить обогащение для выбранных категорий
 *
 * Body:
 * - categoryIds: string[]  // Массив ID категорий для обогащения
 * - uncategorized?: boolean  // Обогатить сообщения БЕЗ категории (AI определит)
 * - limit?: number | "all"
 * - batchSize?: number
 * - aiModel?: "lite" | "smart"
 *
 * Или для обратной совместимости:
 * - limit?: number | "all"  // Без categoryIds - использует первую активную категорию
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { categoryIds, uncategorized, limit = 50, batchSize, aiModel = "smart" } = body;

    // Режим обогащения сообщений БЕЗ категории
    if (uncategorized) {
      const jobId = await startEnrichmentJob(prisma, {
        uncategorized: true,
        limit: limit === "all" ? "all" : parseInt(limit) || 50,
        batchSize,
        aiModel,
      });

      const job = await prisma.enrichmentJob.findUnique({
        where: { id: jobId },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      return NextResponse.json({
        jobs: [job],
        message: "Запущено обогащение сообщений без категории. AI определит категорию автоматически."
      });
    }

    // Если categoryIds не указаны - используем первую активную категорию (legacy)
    let categories: string[] = [];

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      const defaultCategory = await prisma.enrichmentCategory.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      if (!defaultCategory) {
        return NextResponse.json(
          { error: "Нет активных категорий обогащения" },
          { status: 400 }
        );
      }

      categories = [defaultCategory.id];
    } else {
      categories = categoryIds;
    }

    // Запускаем job для каждой категории
    const jobPromises = categories.map((catId) =>
      startEnrichmentJob(prisma, {
        categoryId: catId,
        limit: limit === "all" ? "all" : parseInt(limit) || 50,
        batchSize,
        aiModel,
      })
    );

    const jobIds = await Promise.all(jobPromises);

    // Получаем созданные jobs
    const jobs = await prisma.enrichmentJob.findMany({
      where: { id: { in: jobIds } },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка запуска";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/drafts/enrich
 * Остановить задание(я)
 *
 * Query params:
 * - jobId: string (конкретное задание)
 * - all: "true" (все активные)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const stopAll = searchParams.get("all") === "true";

    if (stopAll) {
      const count = await stopAllJobs(prisma);
      return NextResponse.json({ stopped: count });
    }

    if (jobId) {
      await stopEnrichmentJob(prisma, jobId);
      return NextResponse.json({ stopped: true, jobId });
    }

    // Legacy: остановить все активные
    const count = await stopAllJobs(prisma);
    return NextResponse.json({ stopped: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка остановки";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
