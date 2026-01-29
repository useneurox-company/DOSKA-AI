import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSchedulerStatus, restartScheduler, runParserNow } from "@/lib/telegram/scheduler";

// GET /api/telegram/settings - Get current settings
export async function GET() {
  try {
    let settings = await prisma.parserSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.parserSettings.create({
        data: {
          id: "default",
          intervalMinutes: 15,
          messagesPerRequest: 100,
          delayBetweenRequests: 1000,
          isSchedulerEnabled: true,
        },
      });
    }

    const schedulerStatus = getSchedulerStatus();

    return NextResponse.json({
      settings,
      scheduler: schedulerStatus,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/telegram/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      intervalMinutes,
      messagesPerRequest,
      delayBetweenRequests,
      maxMessagesPerChannel,
      isSchedulerEnabled,
    } = body;

    const settings = await prisma.parserSettings.upsert({
      where: { id: "default" },
      update: {
        intervalMinutes: intervalMinutes ?? undefined,
        messagesPerRequest: messagesPerRequest ?? undefined,
        delayBetweenRequests: delayBetweenRequests ?? undefined,
        maxMessagesPerChannel: maxMessagesPerChannel ?? undefined,
        isSchedulerEnabled: isSchedulerEnabled ?? undefined,
      },
      create: {
        id: "default",
        intervalMinutes: intervalMinutes ?? 15,
        messagesPerRequest: messagesPerRequest ?? 100,
        delayBetweenRequests: delayBetweenRequests ?? 1000,
        maxMessagesPerChannel: maxMessagesPerChannel ?? null,
        isSchedulerEnabled: isSchedulerEnabled ?? true,
      },
    });

    // Restart scheduler with new settings
    await restartScheduler();

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/telegram/settings - Actions (start/stop scheduler, run now)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "runNow") {
      const result = await runParserNow();
      return NextResponse.json({ success: true, result });
    }

    if (action === "restart") {
      await restartScheduler();
      return NextResponse.json({ success: true, message: "Scheduler restarted" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Settings action error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
