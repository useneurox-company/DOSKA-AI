import { NextRequest, NextResponse } from "next/server";
import { getTelegramClient, saveSession } from "@/lib/telegram/client";

// Store phone code hash temporarily (in production use Redis or similar)
const phoneCodeHashes: Map<string, string> = new Map();

// POST /api/telegram/auth - Send code or verify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phone, code, password } = body;

    const client = await getTelegramClient(phone);

    if (!client.connected) {
      await client.connect();
    }

    if (action === "sendCode") {
      // Send verification code
      if (!phone) {
        return NextResponse.json({ error: "Phone is required" }, { status: 400 });
      }

      const result = await client.sendCode(
        { apiId: parseInt(process.env.TELEGRAM_API_ID || "0"), apiHash: process.env.TELEGRAM_API_HASH || "" },
        phone
      );

      phoneCodeHashes.set(phone, result.phoneCodeHash);

      return NextResponse.json({
        success: true,
        message: "Code sent to Telegram",
        phoneCodeHash: result.phoneCodeHash,
      });
    }

    if (action === "verifyCode") {
      // Verify the code
      if (!phone || !code) {
        return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
      }

      const phoneCodeHash = phoneCodeHashes.get(phone);
      if (!phoneCodeHash) {
        return NextResponse.json({ error: "Please request code first" }, { status: 400 });
      }

      try {
        await client.invoke(
          new (await import("telegram/tl")).Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash,
            phoneCode: code,
          })
        );
      } catch (error: unknown) {
        // Check if 2FA is required
        if (error && typeof error === "object" && "errorMessage" in error && error.errorMessage === "SESSION_PASSWORD_NEEDED") {
          return NextResponse.json({
            success: false,
            requires2FA: true,
            message: "Two-factor authentication required",
          });
        }
        throw error;
      }

      // Save session to database
      const sessionString = client.session.save() as unknown as string;
      await saveSession(phone, sessionString);

      phoneCodeHashes.delete(phone);

      return NextResponse.json({
        success: true,
        message: "Successfully authorized",
      });
    }

    if (action === "verify2FA") {
      // Verify 2FA password
      if (!phone || !password) {
        return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
      }

      await client.signInWithPassword(
        { apiId: parseInt(process.env.TELEGRAM_API_ID || "0"), apiHash: process.env.TELEGRAM_API_HASH || "" },
        {
          password: async () => password,
          onError: (err) => { throw err; }
        }
      );

      // Save session to database
      const sessionString = client.session.save() as unknown as string;
      await saveSession(phone, sessionString);

      return NextResponse.json({
        success: true,
        message: "Successfully authorized with 2FA",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/telegram/auth - Check status
export async function GET() {
  try {
    const client = await getTelegramClient();

    if (!client.connected) {
      await client.connect();
    }

    const isAuthorized = await client.isUserAuthorized();

    if (isAuthorized) {
      const me = await client.getMe();
      return NextResponse.json({
        authorized: true,
        user: {
          id: me?.id?.toString(),
          firstName: me?.firstName,
          lastName: me?.lastName,
          phone: me?.phone,
          username: me?.username,
        },
      });
    }

    return NextResponse.json({ authorized: false });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authorized: false, error: String(error) });
  }
}
