/**
 * API для экспорта сообщений для анализа
 * GET /api/export-messages?limit=500
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "500");

    console.log(`[Export] Fetching ${limit} messages...`);

    const messages = await prisma.rawMessage.findMany({
      where: {
        text: { not: null },
      },
      orderBy: { date: "asc" },
      take: limit,
      select: {
        id: true,
        messageId: true,
        text: true,
        date: true,
        senderId: true,
        senderName: true,
        senderUsername: true,
        hasMedia: true,
        mediaType: true,
        sourceId: true,
      },
    });

    console.log(`[Export] Found ${messages.length} messages, fetching context...`);

    const results = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const windowMinutes = 10;
      const msgDate = new Date(msg.date);
      const windowBefore = new Date(msgDate.getTime() - windowMinutes * 60 * 1000);
      const windowAfter = new Date(msgDate.getTime() + windowMinutes * 60 * 1000);

      const context = await prisma.rawMessage.findMany({
        where: {
          sourceId: msg.sourceId,
          id: { not: msg.id },
          date: { gte: windowBefore, lte: windowAfter },
          text: { not: null },
        },
        orderBy: { date: "asc" },
        take: 10,
        select: {
          text: true,
          senderName: true,
          senderId: true,
          hasMedia: true,
          mediaType: true,
        },
      });

      results.push({
        id: msg.id,
        text: msg.text,
        senderName: msg.senderName,
        senderUsername: msg.senderUsername,
        hasMedia: msg.hasMedia,
        mediaType: msg.mediaType,
        date: msg.date,
        context: context.map((c: any) => ({
          text: c.text?.substring(0, 200),
          sender: c.senderName || "Аноним",
          isSameAuthor: c.senderId === msg.senderId,
          hasMedia: c.hasMedia,
        })),
      });
    }

    console.log(`[Export] Done, returning ${results.length} messages`);

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Export] Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
