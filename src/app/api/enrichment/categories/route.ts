/**
 * API для управления категориями обогащения
 * GET - список категорий
 * POST - создание категории
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/enrichment/categories - Список категорий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const categories = await prisma.enrichmentCategory.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { rawMessages: true, jobs: true },
        },
      },
    });

    // Дополнительно считаем сообщения по aiProductCategory (из классификации)
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const pendingCount = await prisma.rawMessage.count({
          where: {
            aiProductCategory: cat.slug,
            aiMessageType: { in: ["request", "offer"] },
            enrichedAt: null,
          },
        });
        return {
          ...cat,
          _count: {
            ...cat._count,
            pending: pendingCount, // Ожидают обогащения
          },
        };
      })
    );

    return NextResponse.json(
      { categories: categoriesWithCounts },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[API] Error fetching categories:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки категорий" },
      { status: 500 }
    );
  }
}

// POST /api/enrichment/categories - Создать категорию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slug,
      name,
      description,
      categoryPrompt,
      isActive = true,
      sortOrder = 0,
    } = body;

    // Валидация
    if (!slug || !name || !categoryPrompt) {
      return NextResponse.json(
        { error: "Обязательные поля: slug, name, categoryPrompt" },
        { status: 400 }
      );
    }

    // Валидация slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug может содержать только a-z, 0-9 и дефис" },
        { status: 400 }
      );
    }

    // Проверка уникальности slug
    const existing = await prisma.enrichmentCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Категория с slug "${slug}" уже существует` },
        { status: 400 }
      );
    }

    const category = await prisma.enrichmentCategory.create({
      data: {
        slug,
        name,
        description,
        categoryPrompt,
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("[API] Error creating category:", error);
    return NextResponse.json(
      { error: "Ошибка создания категории" },
      { status: 500 }
    );
  }
}
