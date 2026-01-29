import { NextRequest, NextResponse } from "next/server";
import { getAllSessions, deleteSession, updateSessionName } from "@/lib/telegram/client";

// GET /api/telegram/accounts - Get all accounts
export async function GET() {
  try {
    const sessions = await getAllSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/telegram/accounts - Update account name
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name } = body;

    if (!phone || !name) {
      return NextResponse.json({ error: "Phone and name are required" }, { status: 400 });
    }

    await updateSessionName(phone, name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/telegram/accounts - Delete account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    await deleteSession(phone);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
