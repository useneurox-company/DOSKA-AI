/**
 * API для операций с конкретной категорией обогащения
 * GET - получить категорию
 * PUT - обновить категорию
 * DELETE - удалить категорию
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/enrichment/categories/[id] - Получить категорию
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const category = await prisma.enrichmentCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rawMessages: true, jobs: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { category },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[API] Error fetching category:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки категории" },
      { status: 500 }
    );
  }
}

// PUT /api/enrichment/categories/[id] - Обновить категорию
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, categoryPrompt, isActive, sortOrder } = body;

    // Проверяем существование
    const existing = await prisma.enrichmentCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 }
      );
    }

    const category = await prisma.enrichmentCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(categoryPrompt !== undefined && { categoryPrompt }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("[API] Error updating category:", error);
    return NextResponse.json(
      { error: "Ошибка обновления категории" },
      { status: 500 }
    );
  }
}

// DELETE /api/enrichment/categories/[id] - Удалить категорию
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Проверяем, есть ли связанные данные
    const category = await prisma.enrichmentCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rawMessages: true, jobs: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 }
      );
    }

    if (category._count.rawMessages > 0) {
      return NextResponse.json(
        {
          error: `Нельзя удалить: ${category._count.rawMessages} сообщений связано с этой категорией`,
        },
        { status: 400 }
      );
    }

    // Удаляем связанные job'ы
    if (category._count.jobs > 0) {
      await prisma.enrichmentJob.deleteMany({
        where: { categoryId: id },
      });
    }

    await prisma.enrichmentCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting category:", error);
    return NextResponse.json(
      { error: "Ошибка удаления категории" },
      { status: 500 }
    );
  }
}
