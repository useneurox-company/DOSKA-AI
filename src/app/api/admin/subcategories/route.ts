/**
 * API для управления подкатегориями
 * GET - список подкатегорий
 * PATCH - переименование / объединение
 * DELETE - удаление (скрытие)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const subcategories = await prisma.subcategory.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(includeInactive ? {} : { isActive: true }),
        mergedIntoId: null, // Не показываем объединённые
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        mergedFrom: {
          select: { id: true, name: true, normalized: true },
        },
      },
      orderBy: [
        { usageCount: "desc" },
        { name: "asc" },
      ],
    });

    // Получаем категории для фильтра
    const categories = await prisma.enrichmentCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      subcategories,
      categories,
      total: subcategories.length,
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return NextResponse.json(
      { error: "Failed to fetch subcategories" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, newName, mergeIntoId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID подкатегории обязателен" },
        { status: 400 }
      );
    }

    // Переименование
    if (action === "rename" && newName) {
      const updated = await prisma.subcategory.update({
        where: { id },
        data: {
          name: newName.trim(),
          normalized: newName.trim().toLowerCase(),
        },
      });
      return NextResponse.json({ success: true, subcategory: updated });
    }

    // Объединение (merge)
    if (action === "merge" && mergeIntoId) {
      // Проверяем что обе подкатегории существуют
      const [source, target] = await Promise.all([
        prisma.subcategory.findUnique({ where: { id } }),
        prisma.subcategory.findUnique({ where: { id: mergeIntoId } }),
      ]);

      if (!source || !target) {
        return NextResponse.json(
          { error: "Подкатегория не найдена" },
          { status: 404 }
        );
      }

      // Обновляем: source -> mergedInto target
      await prisma.$transaction([
        // Помечаем source как объединённую
        prisma.subcategory.update({
          where: { id },
          data: {
            mergedIntoId: mergeIntoId,
            isActive: false,
          },
        }),
        // Увеличиваем счётчик у target
        prisma.subcategory.update({
          where: { id: mergeIntoId },
          data: {
            usageCount: { increment: source.usageCount },
          },
        }),
      ]);

      return NextResponse.json({ success: true, mergedInto: mergeIntoId });
    }

    // Скрытие (деактивация)
    if (action === "hide") {
      const updated = await prisma.subcategory.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, subcategory: updated });
    }

    // Восстановление
    if (action === "restore") {
      const updated = await prisma.subcategory.update({
        where: { id },
        data: { isActive: true },
      });
      return NextResponse.json({ success: true, subcategory: updated });
    }

    return NextResponse.json(
      { error: "Неизвестное действие" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating subcategory:", error);
    return NextResponse.json(
      { error: "Failed to update subcategory" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID подкатегории обязателен" },
        { status: 400 }
      );
    }

    // Не удаляем, а скрываем
    await prisma.subcategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    return NextResponse.json(
      { error: "Failed to delete subcategory" },
      { status: 500 }
    );
  }
}
