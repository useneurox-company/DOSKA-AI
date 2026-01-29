import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Получить одобренные карточки для клиентов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // REQUEST | OFFER
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    const messages = await prisma.rawMessage.findMany({
      where: {
        enrichedAt: { not: null },
        enrichedData: { not: null },
        moderationStatus: "approved", // Только одобренные
        ...(type && {
          aiMessageType: type === "REQUEST" ? "request" : "offer",
        }),
        ...(category && {
          aiProductCategory: category,
        }),
      },
      take: limit,
      skip: offset,
      orderBy: { date: "desc" }, // По дате сообщения, новые сверху
      select: {
        id: true,
        text: true,
        date: true,
        senderName: true,
        senderUsername: true,
        senderPhone: true,
        hasMedia: true,
        mediaType: true,
        mediaUrl: true,
        mediaFileName: true,
        enrichedData: true,
        source: {
          select: { name: true, username: true },
        },
      },
    })

    // Подсчёт общего количества
    const total = await prisma.rawMessage.count({
      where: {
        enrichedAt: { not: null },
        enrichedData: { not: null },
        moderationStatus: "approved",
        ...(type && {
          aiMessageType: type === "REQUEST" ? "request" : "offer",
        }),
        ...(category && {
          aiProductCategory: category,
        }),
      },
    })

    const cards = messages
      .map((m: any) => {
        try {
          const enriched = JSON.parse(m.enrichedData)

          // Вычисляем количество дней с момента публикации
          const messageDate = new Date(m.date)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - messageDate.getTime())
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

          return {
            id: m.id,
            rawMessageId: enriched.rawMessageId,
            type: enriched.type,
            category: enriched.category,
            subcategory: enriched.subcategory,
            title: enriched.title,
            items: enriched.items || [],
            services: enriched.services,
            description: enriched.description,
            price: enriched.price,
            city: enriched.city,
            region: enriched.region,
            company: enriched.company,
            urgency: enriched.urgency,
            date: m.date,
            daysAgo: diffDays,
            sourceGroup: enriched.sourceGroup || m.source?.name,
            mediaFiles: enriched.mediaFiles || [],
            hasMedia: m.hasMedia,
            mediaType: m.mediaType,
            mediaUrl: m.mediaUrl,
            // Контакты скрыты для неавторизованных
            contacts: {
              hasPhone: !!(enriched.contacts?.phone || m.senderPhone),
              hasTelegram: !!(enriched.contacts?.telegram || m.senderUsername),
              hasWhatsapp: !!enriched.contacts?.whatsapp,
              hasEmail: !!enriched.contacts?.email,
              name: enriched.contacts?.name,
            },
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return NextResponse.json(
      {
        cards,
        total,
        hasMore: offset + limit < total,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  } catch (error) {
    console.error("GET /api/telegram-cards error:", error)
    return NextResponse.json(
      { error: "Ошибка загрузки карточек", cards: [], total: 0 },
      { status: 500 }
    )
  }
}
