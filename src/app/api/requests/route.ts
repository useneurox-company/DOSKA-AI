import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestStats } from "@/lib/ai/aggregator";

// GET /api/requests - Получить список заявок
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // request | offer
    const status = searchParams.get("status"); // new | approved | rejected
    const category = searchParams.get("category"); // metal | other
    const nomenclature = searchParams.get("nomenclature");
    const city = searchParams.get("city");
    const sourceId = searchParams.get("sourceId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const getStats = searchParams.get("stats") === "true";
    const getFilters = searchParams.get("filters") === "true";

    // Если запрашивают только статистику
    if (getStats) {
      const stats = await getRequestStats();
      return NextResponse.json(stats);
    }

    // Если запрашивают доступные фильтры
    if (getFilters) {
      const [categories, nomenclatures, cities, sources] = await Promise.all([
        prisma.request.groupBy({
          by: ["category"],
          _count: true,
          where: { category: { not: null } },
        }),
        prisma.request.groupBy({
          by: ["nomenclature"],
          _count: true,
          where: { nomenclature: { not: null } },
          orderBy: { _count: { nomenclature: "desc" } },
          take: 50,
        }),
        prisma.request.findMany({
          where: { city: { not: null } },
          select: { city: true },
          distinct: ["city"],
        }),
        prisma.telegramSource.findMany({
          select: { id: true, name: true },
          where: { isActive: true },
        }),
      ]);

      return NextResponse.json({
        categories: categories.map(c => ({
          value: c.category,
          count: c._count,
        })),
        nomenclatures: nomenclatures.map(n => ({
          value: n.nomenclature,
          count: n._count,
        })),
        cities: cities.map(c => c.city).filter(Boolean),
        sources,
      });
    }

    // Строим фильтр
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;
    if (nomenclature) where.nomenclature = nomenclature;
    if (city) where.city = city;
    if (sourceId) where.sourceId = sourceId;

    // Получаем заявки
    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          source: {
            select: { name: true, username: true },
          },
          _count: {
            select: { rawMessages: true },
          },
        },
      }),
      prisma.request.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get requests error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH /api/requests - Обновить статус заявки
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const validStatuses = ["new", "approved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.request.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...updateData,
      },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/requests - Удалить заявку
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Сначала отвязываем сообщения от заявки
    await prisma.rawMessage.updateMany({
      where: { requestId: id },
      data: { requestId: null },
    });

    // Удаляем заявку
    await prisma.request.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete request error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
