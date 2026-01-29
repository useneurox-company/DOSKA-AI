/**
 * API для получения контекста черновика
 * GET /api/drafts/[id]/context - получить переписку и файлы
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Получаем основное сообщение
    const message = await prisma.rawMessage.findUnique({
      where: { id },
      select: {
        id: true,
        text: true,
        date: true,
        sourceId: true,
        senderId: true,
        senderName: true,
        senderUsername: true,
        hasMedia: true,
        mediaUrl: true,
        mediaType: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
    }

    // Получаем контекст переписки (±10 минут)
    const windowMinutes = 10;
    const windowBefore = new Date(new Date(message.date).getTime() - windowMinutes * 60 * 1000);
    const windowAfter = new Date(new Date(message.date).getTime() + windowMinutes * 60 * 1000);

    const contextMessages = await prisma.rawMessage.findMany({
      where: {
        sourceId: message.sourceId,
        date: {
          gte: windowBefore,
          lte: windowAfter,
        },
        text: { not: null },
      },
      orderBy: { date: "asc" },
      take: 30,
      select: {
        id: true,
        text: true,
        date: true,
        senderName: true,
        senderUsername: true,
        senderId: true,
        hasMedia: true,
        mediaUrl: true,
        mediaType: true,
        aiMessageType: true,
      },
    });

    // Получаем файлы/фото от этого автора ТОЛЬКО в окне переписки (±10 минут)
    const senderConditions = [];
    if (message.senderId) senderConditions.push({ senderId: message.senderId });
    if (message.senderUsername) senderConditions.push({ senderUsername: message.senderUsername });

    const senderMedia = senderConditions.length > 0
      ? await prisma.rawMessage.findMany({
          where: {
            sourceId: message.sourceId,
            hasMedia: true,
            date: {
              gte: windowBefore,
              lte: windowAfter,
            },
            OR: senderConditions,
          },
          orderBy: { date: "asc" },
          take: 20,
          select: {
            id: true,
            date: true,
            mediaUrl: true,
            mediaType: true,
            mediaFileName: true,
            text: true,
          },
        })
      : [];

    return NextResponse.json({
      message,
      context: contextMessages,
      senderMedia,
      currentMessageId: id,
    });
  } catch (error) {
    console.error("[Context API] Error:", error);
    return NextResponse.json(
      { error: "Ошибка получения контекста" },
      { status: 500 }
    );
  }
}
