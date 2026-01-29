import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/telegram/sources - Get all sources
export async function GET() {
  try {
    const sources = await prisma.telegramSource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { rawMessages: true },
        },
      },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error("Get sources error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/telegram/sources - Add new source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, chatId, parseFromDate } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!username && !chatId) {
      return NextResponse.json({ error: "Username or chatId is required" }, { status: 400 });
    }

    // Normalize username
    const normalizedUsername = username ? (username.startsWith("@") ? username : `@${username}`) : null;

    const source = await prisma.telegramSource.create({
      data: {
        name,
        username: normalizedUsername,
        chatId: chatId || null,
        parseFromDate: parseFromDate ? new Date(parseFromDate) : null,
      },
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error("Create source error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/telegram/sources - Update source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, username, chatId, isActive, parseFromDate } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Normalize username
    const normalizedUsername = username ? (username.startsWith("@") ? username : `@${username}`) : undefined;

    const source = await prisma.telegramSource.update({
      where: { id },
      data: {
        name: name ?? undefined,
        username: normalizedUsername,
        chatId: chatId ?? undefined,
        isActive: isActive ?? undefined,
        parseFromDate: parseFromDate !== undefined
          ? (parseFromDate ? new Date(parseFromDate) : null)
          : undefined,
      },
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error("Update source error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/telegram/sources - Delete source
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.telegramSource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete source error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
