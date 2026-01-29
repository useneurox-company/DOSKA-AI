import { NextRequest, NextResponse } from "next/server";
import { parseChannel, parseAllSources, parseChannelFullHistory } from "@/lib/telegram/parser";
import { prisma } from "@/lib/prisma";

// POST /api/telegram/parse - Parse channel(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, fullHistory, maxMessages } = body;

    if (sourceId) {
      // Parse specific channel
      if (fullHistory) {
        const result = await parseChannelFullHistory(sourceId, maxMessages);
        return NextResponse.json(result);
      } else {
        const result = await parseChannel(sourceId);
        return NextResponse.json(result);
      }
    } else {
      // Parse all active sources
      const results = await parseAllSources({ fullHistory, maxMessages });
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/telegram/parse - Get raw messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");
    const processed = searchParams.get("processed");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};

    if (sourceId) {
      where.sourceId = sourceId;
    }

    if (processed !== null) {
      where.isProcessed = processed === "true";
    }

    const [messages, total] = await Promise.all([
      prisma.rawMessage.findMany({
        where,
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
        include: {
          source: {
            select: { name: true, username: true },
          },
        },
      }),
      prisma.rawMessage.count({ where }),
    ]);

    return NextResponse.json({
      messages,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
