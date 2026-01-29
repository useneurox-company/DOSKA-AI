import { NextRequest, NextResponse } from "next/server";
import {
  getJobStatus,
  startJob,
  stopJob,
  clearJob,
  startAutoMode,
  stopAutoMode,
  isAutoModeEnabled
} from "@/lib/ai/jobManager";

// GET /api/ai/job - Get current job status and auto mode
export async function GET() {
  const job = getJobStatus();
  const autoMode = isAutoModeEnabled();
  return NextResponse.json({ job, autoMode });
}

// POST /api/ai/job - Start new analysis job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceIds, count, includeMedia = true } = body;

    const job = await startJob({ sourceIds, count, includeMedia });
    return NextResponse.json({ job });
  } catch (error) {
    console.error("Start job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/job - Stop current job
export async function DELETE() {
  const stopped = stopJob();
  if (stopped) {
    return NextResponse.json({ success: true, message: "Job stopped" });
  }
  return NextResponse.json({ success: false, message: "No running job to stop" });
}

// PATCH /api/ai/job - Clear completed job
export async function PATCH() {
  clearJob();
  return NextResponse.json({ success: true });
}

// PUT /api/ai/job - Toggle auto mode
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { autoMode } = body;

    if (autoMode) {
      await startAutoMode();
    } else {
      stopAutoMode();
    }

    return NextResponse.json({
      autoMode: isAutoModeEnabled(),
      job: getJobStatus()
    });
  } catch (error) {
    console.error("Toggle auto mode error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
