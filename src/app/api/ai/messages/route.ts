import { NextRequest, NextResponse } from "next/server";
import { getMessagesByCategory, getMessagesFiltered, getAvailableFilters } from "@/lib/ai/analyzer";
import { prisma } from "@/lib/prisma";

// GET /api/ai/messages - Получить проанализированные сообщения с фильтрами
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Новые фильтры
    const messageType = searchParams.get("messageType");
    const productCategory = searchParams.get("productCategory");
    const nomenclature = searchParams.get("nomenclature");
    const city = searchParams.get("city");

    // Старый фильтр (для обратной совместимости)
    const category = searchParams.get("category");

    // Пагинация
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Запрос на получение доступных фильтров
    const getFilters = searchParams.get("getFilters") === "true";

    if (getFilters) {
      const filters = await getAvailableFilters(
        messageType || undefined,
        productCategory || undefined
      );
      return NextResponse.json(filters);
    }

    // Если есть новые фильтры - используем новую функцию
    if (messageType || productCategory || nomenclature || city) {
      const result = await getMessagesFiltered({
        messageType: messageType || undefined,
        productCategory: productCategory || undefined,
        nomenclature: nomenclature || undefined,
        city: city || undefined,
        limit,
        offset,
      });
      return NextResponse.json(result);
    }

    // Старый фильтр по категории (для обратной совместимости)
    if (category) {
      const messages = await getMessagesByCategory(category, { limit, offset });
      return NextResponse.json({ messages, total: messages.length });
    }

    // Все проанализированные сообщения
    const [messages, total] = await Promise.all([
      prisma.rawMessage.findMany({
        where: { aiAnalyzed: true },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
        include: {
          source: {
            select: { name: true, username: true, defaultCity: true },
          },
        },
      }),
      prisma.rawMessage.count({ where: { aiAnalyzed: true } }),
    ]);

    return NextResponse.json({ messages, total });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
