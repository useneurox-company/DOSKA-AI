import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/requests/[id] - Получить детали заявки с сообщениями
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        source: {
          select: { name: true, username: true },
        },
        rawMessages: {
          select: {
            id: true,
            text: true,
            date: true,
            senderName: true,
            hasMedia: true,
            mediaType: true,
            mediaUrl: true,
          },
          orderBy: { date: "asc" },
        },
        _count: {
          select: { rawMessages: true },
        },
      },
    });

    if (!requestData) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(requestData);
  } catch (error) {
    console.error("Get request details error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
