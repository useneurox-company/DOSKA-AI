/**
 * API для получения счётчиков фасетного фильтра
 * Возвращает количество карточек по типам, категориям, подкатегориям и статусам
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface EnrichedData {
  type?: string;
  subcategory?: string;
  subcategoryId?: string;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

export async function GET() {
  try {
    // Получаем все обогащённые карточки
    const cards = await prisma.rawMessage.findMany({
      where: {
        enrichedAt: { not: null },
        enrichedData: { not: null },
      },
      select: {
        enrichedData: true,
        enrichmentCategoryId: true,
        moderationStatus: true,
      },
    });

    // Получаем категории обогащения
    const categories = await prisma.enrichmentCategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { sortOrder: "asc" },
    });

    // Получаем подкатегории из справочника
    const subcategories = await prisma.subcategory.findMany({
      where: { isActive: true, mergedIntoId: null },
      select: { id: true, name: true, categoryId: true, usageCount: true },
      orderBy: { usageCount: "desc" },
    });

    // Инициализируем счётчики
    const counts = {
      total: cards.length,
      types: { REQUEST: 0, OFFER: 0 },
      categories: {} as Record<string, { name: string; count: number }>,
      subcategories: {} as Record<string, { name: string; categoryId: string; categorySlug: string; count: number }>,
      moderation: { pending: 0, approved: 0, rejected: 0 },
    };

    // Инициализируем категории
    for (const cat of categories) {
      counts.categories[cat.slug] = { name: cat.name, count: 0 };
    }

    // Инициализируем подкатегории с categorySlug для сопоставления
    for (const sub of subcategories) {
      const cat = categories.find((c: Category) => c.id === sub.categoryId);
      counts.subcategories[sub.id] = {
        name: sub.name,
        categoryId: sub.categoryId,
        categorySlug: cat?.slug || "",
        count: 0
      };
    }

    // Подсчитываем
    for (const card of cards) {
      // Парсим enrichedData
      let data: EnrichedData = {};
      try {
        data = JSON.parse(card.enrichedData as string);
      } catch {
        continue;
      }

      // Тип
      if (data.type === "REQUEST") counts.types.REQUEST++;
      if (data.type === "OFFER") counts.types.OFFER++;

      // Категория
      const catSlug = categories.find((c: Category) => c.id === card.enrichmentCategoryId)?.slug;
      if (catSlug && counts.categories[catSlug]) {
        counts.categories[catSlug].count++;
      }

      // Подкатегория (по subcategoryId из enrichedData или по имени)
      if (data.subcategoryId && counts.subcategories[data.subcategoryId]) {
        counts.subcategories[data.subcategoryId].count++;
      }

      // Модерация
      const status = card.moderationStatus as keyof typeof counts.moderation;
      if (counts.moderation[status] !== undefined) {
        counts.moderation[status]++;
      }
    }

    // Фильтруем подкатегории с count > 0
    const activeSubcategories: typeof counts.subcategories = {};
    for (const [id, sub] of Object.entries(counts.subcategories)) {
      if (sub.count > 0) {
        activeSubcategories[id] = sub;
      }
    }
    counts.subcategories = activeSubcategories;

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Error in filter-counts:", error);
    return NextResponse.json(
      { error: "Failed to get filter counts" },
      { status: 500 }
    );
  }
}
