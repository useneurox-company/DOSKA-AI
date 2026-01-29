/**
 * API для справочника предложений (offer)
 * GET /api/catalog/offer - категории, номенклатуры, детали
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const nomenclatureId = searchParams.get("nomenclatureId");

  try {
    // Если запрашиваем детали по номенклатуре
    if (nomenclatureId) {
      const details = await prisma.offerDetail.findMany({
        where: { nomenclatureId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      });
      return NextResponse.json({ details });
    }

    // Если запрашиваем номенклатуры по категории
    if (categoryId) {
      const nomenclatures = await prisma.offerNomenclature.findMany({
        where: { categoryId },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          _count: { select: { details: true } },
        },
      });
      return NextResponse.json({
        nomenclatures: nomenclatures.map((n) => ({
          id: n.id,
          code: n.code,
          name: n.name,
          detailsCount: n._count.details,
        })),
      });
    }

    // Иначе возвращаем все категории
    const categories = await prisma.offerCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { nomenclatures: true } },
      },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        nomenclaturesCount: c._count.nomenclatures,
      })),
    });
  } catch (error) {
    console.error("Error fetching offer catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}
