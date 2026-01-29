import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Изменить статус модерации карточки
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawMessageId, status } = body

    if (!rawMessageId) {
      return NextResponse.json(
        { error: "Не указан ID карточки" },
        { status: 400 }
      )
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Неверный статус. Допустимые: pending, approved, rejected" },
        { status: 400 }
      )
    }

    const updated = await prisma.rawMessage.update({
      where: { id: rawMessageId },
      data: {
        moderationStatus: status,
        moderatedAt: status !== "pending" ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      id: updated.id,
      status: updated.moderationStatus,
    })
  } catch (error) {
    console.error("Ошибка модерации:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении статуса" },
      { status: 500 }
    )
  }
}

// Массовая модерация
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, status } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Не указаны ID карточек" },
        { status: 400 }
      )
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Неверный статус" },
        { status: 400 }
      )
    }

    const result = await prisma.rawMessage.updateMany({
      where: { id: { in: ids } },
      data: {
        moderationStatus: status,
        moderatedAt: status !== "pending" ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch (error) {
    console.error("Ошибка массовой модерации:", error)
    return NextResponse.json(
      { error: "Ошибка при массовом обновлении" },
      { status: 500 }
    )
  }
}
