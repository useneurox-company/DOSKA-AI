import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/fix - Исправление ошибок AI
 *
 * Body:
 * - action: "unlink" | "reclassify"
 * - messageIds: string[] - ID сообщений
 * - newType?: string - новый тип для reclassify ("other", "spam", etc)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, messageIds, newType } = body;

    if (!action || !messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json(
        { error: "action и messageIds обязательны" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "unlink":
        // Отвязать сообщения от заявок (requestId = null)
        result = await prisma.rawMessage.updateMany({
          where: { id: { in: messageIds } },
          data: { requestId: null },
        });
        console.log(`[Fix] Отвязано ${result.count} сообщений от заявок`);
        break;

      case "reclassify":
        // Изменить тип сообщения
        if (!newType) {
          return NextResponse.json(
            { error: "newType обязателен для reclassify" },
            { status: 400 }
          );
        }
        result = await prisma.rawMessage.updateMany({
          where: { id: { in: messageIds } },
          data: {
            aiMessageType: newType,
            requestId: null, // Также отвязываем от заявки
          },
        });
        console.log(`[Fix] Переклассифицировано ${result.count} сообщений в "${newType}"`);
        break;

      default:
        return NextResponse.json(
          { error: `Неизвестное действие: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      count: result.count,
    });
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/fix?requestId=xxx - Удалить пустые заявки
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (requestId) {
      // Удалить конкретную заявку
      const deleted = await prisma.request.delete({
        where: { id: requestId },
      });
      return NextResponse.json({ success: true, deleted: deleted.id });
    }

    // Удалить все пустые заявки (без сообщений)
    const emptyRequests = await prisma.request.findMany({
      where: {
        rawMessages: { none: {} },
      },
      select: { id: true },
    });

    if (emptyRequests.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const result = await prisma.request.deleteMany({
      where: { id: { in: emptyRequests.map((r) => r.id) } },
    });

    console.log(`[Fix] Удалено ${result.count} пустых заявок`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
