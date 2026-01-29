import cron, { ScheduledTask } from "node-cron";
import { parseAllSources, getSettings } from "./parser";
import { prisma } from "@/lib/prisma";
import { pipelineManager } from "@/lib/pipeline";

let schedulerTask: ScheduledTask | null = null;
let isRunning = false;
let lastRun: Date | null = null;
let lastResult: { total: number; errors: number } | null = null;

export function getSchedulerStatus() {
  return {
    isActive: schedulerTask !== null,
    isRunning,
    lastRun,
    lastResult,
  };
}

export async function runParserNow(): Promise<{ total: number; errors: number }> {
  if (isRunning) {
    return { total: 0, errors: 0 };
  }

  isRunning = true;
  console.log("[Scheduler] Starting manual parse...");

  try {
    const result = await parseAllSources();
    const errors = result.results.filter((r) => !r.success).length;

    lastRun = new Date();
    lastResult = { total: result.total, errors };

    console.log(`[Scheduler] Parse complete. New messages: ${result.total}, Errors: ${errors}`);

    return { total: result.total, errors };
  } catch (error) {
    console.error("[Scheduler] Parse error:", error);
    return { total: 0, errors: 1 };
  } finally {
    isRunning = false;
  }
}

export async function startScheduler(): Promise<void> {
  if (schedulerTask) {
    console.log("[Scheduler] Already running");
    return;
  }

  const settings = await getSettings();

  if (!settings.isSchedulerEnabled) {
    console.log("[Scheduler] Disabled in settings");
    return;
  }

  const interval = settings.intervalMinutes;
  const cronExpression = `*/${interval} * * * *`;

  console.log(`[Scheduler] Starting with interval: every ${interval} minutes`);

  schedulerTask = cron.schedule(cronExpression, async () => {
    // Check if scheduler is still enabled
    const currentSettings = await getSettings();
    if (!currentSettings.isSchedulerEnabled) {
      console.log("[Scheduler] Disabled, skipping run");
      return;
    }

    if (isRunning) {
      console.log("[Scheduler] Previous run still in progress, skipping");
      return;
    }

    isRunning = true;

    try {
      // Проверяем настройки pipeline
      const pipelineSettings = await pipelineManager.getSettings();

      if (pipelineSettings.autoPipelineEnabled) {
        // ПОЛНЫЙ PIPELINE: парсинг + классификация + обогащение + матчинг
        console.log(`[Scheduler] Starting FULL PIPELINE at ${new Date().toISOString()}`);

        const pipelineState = pipelineManager.getState();
        if (pipelineState.isRunning) {
          console.log("[Scheduler] Pipeline already running, skipping");
          return;
        }

        const cycleStats = await pipelineManager.runPipelineCycle();

        lastRun = new Date();
        lastResult = { total: cycleStats.parsed, errors: 0 };

        console.log(`[Scheduler] Pipeline complete:`, cycleStats);

      } else {
        // ТОЛЬКО ПАРСИНГ (стандартное поведение)
        console.log(`[Scheduler] Starting scheduled parse at ${new Date().toISOString()}`);

        const result = await parseAllSources();
        const errors = result.results.filter((r) => !r.success).length;

        lastRun = new Date();
        lastResult = { total: result.total, errors };

        console.log(`[Scheduler] Parse complete. New messages: ${result.total}, Errors: ${errors}`);
      }
    } catch (error) {
      console.error("[Scheduler] Error:", error);
    } finally {
      isRunning = false;
    }
  });

  schedulerTask.start();
}

export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log("[Scheduler] Stopped");
  }
}

export async function restartScheduler(): Promise<void> {
  stopScheduler();
  await startScheduler();
}

// Initialize default settings if not exist
export async function initializeSettings(): Promise<void> {
  const existing = await prisma.parserSettings.findUnique({
    where: { id: "default" },
  });

  if (!existing) {
    await prisma.parserSettings.create({
      data: {
        id: "default",
        intervalMinutes: 15,
        messagesPerRequest: 100,
        delayBetweenRequests: 1000,
        isSchedulerEnabled: true,
      },
    });
    console.log("[Scheduler] Default settings created");
  }
}
