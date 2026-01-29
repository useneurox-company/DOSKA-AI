/**
 * API для CRM матчей
 *
 * GET - получить список матчей
 * POST - запустить поиск матчей
 * PATCH - обновить статус матча
 * DELETE - удалить матч
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMatching, MatchStatus } from "@/lib/crm";

export const dynamic = "force-dynamic";

// GET /api/admin/crm/matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as MatchStatus | null;
    const minScore = parseInt(searchParams.get("minScore") || "0");
    const categoryId = searchParams.get("categoryId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined; // undefined = без лимита
    const offset = parseInt(searchParams.get("offset") || "0");

    const matches = await prisma.match.findMany({
      where: {
        ...(status && { status }),
        ...(minScore > 0 && { score: { gte: minScore } }),
        ...(categoryId && {
          request: { enrichmentCategoryId: categoryId },
        }),
      },
      include: {
        request: {
          select: {
            id: true,
            text: true,
            enrichedData: true,
            enrichmentCategoryId: true,
            senderName: true,
            senderUsername: true,
            senderPhone: true,
            date: true,
            hasMedia: true,
            mediaType: true,
            mediaUrl: true,
            mediaFileName: true,
            source: {
              select: { name: true },
            },
            enrichmentCategory: {
              select: { slug: true, name: true },
            },
          },
        },
        offer: {
          select: {
            id: true,
            text: true,
            enrichedData: true,
            enrichmentCategoryId: true,
            senderName: true,
            senderUsername: true,
            senderPhone: true,
            date: true,
            hasMedia: true,
            mediaType: true,
            mediaUrl: true,
            mediaFileName: true,
            source: {
              select: { name: true },
            },
            enrichmentCategory: {
              select: { slug: true, name: true },
            },
          },
        },
      },
      orderBy: { score: "desc" },
      ...(limit && { take: limit }),
      ...(offset > 0 && { skip: offset }),
    });

    // Парсим enrichedData для удобства
    const formatted = matches.map((m) => {
      let requestData = null;
      let offerData = null;

      try {
        requestData = m.request.enrichedData
          ? JSON.parse(m.request.enrichedData)
          : null;
      } catch {}

      try {
        offerData = m.offer.enrichedData
          ? JSON.parse(m.offer.enrichedData)
          : null;
      } catch {}

      return {
        id: m.id,
        score: m.score,
        reason: m.reason,
        margin: {
          percent: m.marginPercent,
          absolute: m.marginAbsolute,
          note: m.marginNote,
        },
        risks: m.risks,
        status: m.status,
        statusNote: m.statusNote,
        createdAt: m.createdAt,
        contactedAt: m.contactedAt,
        dealAt: m.dealAt,
        request: {
          id: m.request.id,
          originalText: m.request.text,
          date: m.request.date,
          sourceName: m.request.source?.name,
          categorySlug: m.request.enrichmentCategory?.slug,
          categoryName: m.request.enrichmentCategory?.name,
          subcategoryId: requestData?.subcategoryId,
          hasMedia: m.request.hasMedia,
          mediaType: m.request.mediaType,
          mediaUrl: m.request.mediaUrl,
          mediaFileName: m.request.mediaFileName,
          ...requestData,
          contacts: {
            name: m.request.senderName,
            username: m.request.senderUsername,
            phone: m.request.senderPhone,
          },
        },
        offer: {
          id: m.offer.id,
          originalText: m.offer.text,
          date: m.offer.date,
          sourceName: m.offer.source?.name,
          categorySlug: m.offer.enrichmentCategory?.slug,
          categoryName: m.offer.enrichmentCategory?.name,
          subcategoryId: offerData?.subcategoryId,
          hasMedia: m.offer.hasMedia,
          mediaType: m.offer.mediaType,
          mediaUrl: m.offer.mediaUrl,
          mediaFileName: m.offer.mediaFileName,
          ...offerData,
          contacts: {
            name: m.offer.senderName,
            username: m.offer.senderUsername,
            phone: m.offer.senderPhone,
          },
        },
      };
    });

    // Счётчики по статусам
    const counts = await prisma.match.groupBy({
      by: ["status"],
      _count: true,
    });

    const statusCounts = {
      new: 0,
      contacted: 0,
      deal: 0,
      rejected: 0,
    };
    for (const c of counts) {
      if (c.status in statusCounts) {
        statusCounts[c.status as MatchStatus] = c._count;
      }
    }

    return NextResponse.json({
      matches: formatted,
      total: formatted.length,
      statusCounts,
    });
  } catch (error) {
    console.error("GET /api/admin/crm/matches error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки матчей" },
      { status: 500 }
    );
  }
}

// POST /api/admin/crm/matches - запустить поиск матчей
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      categoryId,
      maxCandidates = 20000, // Увеличено для полного охвата
      maxAIEvaluations = 100, // Увеличено для большего покрытия
      aiModel = "lite",
      useVectors = true,
    } = body;

    const result = await runMatching(prisma, {
      categoryId,
      maxCandidates,
      maxAIEvaluations,
      aiModel,
      useVectors,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("POST /api/admin/crm/matches error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка поиска матчей" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/crm/matches - обновить статус матча
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, statusNote } = body;

    if (!id) {
      return NextResponse.json({ error: "ID не указан" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;

      // Устанавливаем дату в зависимости от статуса
      if (status === "contacted") {
        updateData.contactedAt = new Date();
      } else if (status === "deal") {
        updateData.dealAt = new Date();
      }
    }

    if (statusNote !== undefined) {
      updateData.statusNote = statusNote;
    }

    const match = await prisma.match.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error("PATCH /api/admin/crm/matches error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления статуса" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/crm/matches - удалить матч
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID не указан" }, { status: 400 });
    }

    await prisma.match.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/crm/matches error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления матча" },
      { status: 500 }
    );
  }
}
