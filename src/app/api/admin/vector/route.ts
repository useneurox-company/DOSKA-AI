/**
 * API для управления векторной базой данных
 *
 * GET - статус и статистика
 * POST - инициализация или переиндексация
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isQdrantAvailable,
  initVectorStorage,
  getCollectionStats,
  upsertCardsBatch,
  CardPayload,
} from "@/lib/vector";

export const dynamic = "force-dynamic";

// GET /api/admin/vector - статус и статистика
export async function GET() {
  try {
    const available = await isQdrantAvailable();

    if (!available) {
      return NextResponse.json({
        available: false,
        message: "Qdrant не доступен. Запустите: docker-compose -f docker-compose.vector.yml up -d",
      });
    }

    // Инициализируем коллекцию если нужно
    await initVectorStorage();

    const stats = await getCollectionStats();

    // Считаем карточки в PostgreSQL для сравнения
    const pgCount = await prisma.rawMessage.count({
      where: {
        enrichedAt: { not: null },
        enrichedData: { not: null },
      },
    });

    return NextResponse.json({
      available: true,
      vectorsCount: stats.vectorsCount,
      pointsCount: stats.pointsCount,
      pgEnrichedCount: pgCount,
      needsReindex: pgCount > stats.pointsCount,
    });
  } catch (error) {
    console.error("GET /api/admin/vector error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/vector - инициализация или переиндексация
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = "init" } = body;

    const available = await isQdrantAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "Qdrant не доступен" },
        { status: 503 }
      );
    }

    if (action === "init") {
      // Просто инициализируем коллекцию
      await initVectorStorage();
      return NextResponse.json({ success: true, action: "init" });
    }

    if (action === "reindex") {
      // Переиндексируем все обогащённые карточки
      await initVectorStorage();

      // Получаем все обогащённые карточки
      const cards = await prisma.rawMessage.findMany({
        where: {
          enrichedAt: { not: null },
          enrichedData: { not: null },
        },
        select: {
          id: true,
          enrichedData: true,
          enrichmentCategoryId: true,
          enrichedAt: true,
        },
      });

      // Парсим и готовим для batch upsert
      const batchData: Array<{
        id: string;
        data: Omit<CardPayload, "id" | "enrichedAt">;
        enrichedAt?: Date;
      }> = [];

      for (const card of cards) {
        if (!card.enrichedData) continue;

        try {
          const data = JSON.parse(card.enrichedData);

          batchData.push({
            id: card.id,
            data: {
              type: data.type || "REQUEST",
              title: data.title || "",
              subcategory: data.subcategory,
              subcategoryId: data.subcategoryId,
              categoryId: card.enrichmentCategoryId || undefined,
              city: data.city,
              region: data.region,
              price: data.price,
              priceUnit: data.priceUnit,
              quantity: data.items?.[0]?.quantity,
              description: data.description,
              contacts: data.contacts,
            },
            enrichedAt: card.enrichedAt || undefined,
          });
        } catch {
          // Пропускаем невалидные
        }
      }

      // Индексируем батчами по 50
      let indexed = 0;
      const batchSize = 50;

      for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        const count = await upsertCardsBatch(batch);
        indexed += count;
      }

      return NextResponse.json({
        success: true,
        action: "reindex",
        total: cards.length,
        indexed,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/vector error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
