/**
 * AI Analysis Job Manager
 * Manages background analysis jobs that persist across page refreshes
 */

import { analyzeMessage } from "./analyzer";
import { prisma } from "@/lib/prisma";

export interface AnalysisJob {
  id: string;
  status: "running" | "stopped" | "completed" | "error";
  total: number;
  processed: number;
  errors: number;
  sourceIds: string[] | null;
  includeMedia: boolean;
  startedAt: Date;
  stoppedAt: Date | null;
  errorMessage: string | null;
}

// In-memory job storage (single job at a time)
let currentJob: AnalysisJob | null = null;
let shouldStop = false;

/**
 * Get current job status
 */
export function getJobStatus(): AnalysisJob | null {
  return currentJob;
}

/**
 * Stop the current job
 */
export function stopJob(): boolean {
  if (currentJob && currentJob.status === "running") {
    shouldStop = true;
    return true;
  }
  return false;
}

/**
 * Check if a job is currently running
 */
export function isJobRunning(): boolean {
  return currentJob?.status === "running";
}

/**
 * Start a new analysis job
 */
export async function startJob(options: {
  sourceIds?: string[];
  count?: number | "all";
  includeMedia?: boolean;
}): Promise<AnalysisJob> {
  // If job is already running, return it
  if (currentJob?.status === "running") {
    return currentJob;
  }

  const { sourceIds, count, includeMedia = true } = options;

  // Build filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    aiAnalyzed: false,
    OR: [
      { text: { not: null } },
      { hasMedia: true },
    ],
  };

  if (sourceIds && sourceIds.length > 0) {
    where.sourceId = { in: sourceIds };
  }

  // Count total messages to analyze
  const totalCount = await prisma.rawMessage.count({ where });
  const total = count === "all" ? totalCount : Math.min(typeof count === "number" ? count : 50, totalCount);

  if (total === 0) {
    throw new Error("Нет сообщений для анализа");
  }

  // Create new job
  const jobId = `job_${Date.now()}`;
  shouldStop = false;

  currentJob = {
    id: jobId,
    status: "running",
    total,
    processed: 0,
    errors: 0,
    sourceIds: sourceIds || null,
    includeMedia,
    startedAt: new Date(),
    stoppedAt: null,
    errorMessage: null,
  };

  // Start processing in background (don't await)
  processJob(where, total, includeMedia).catch((error) => {
    if (currentJob) {
      currentJob.status = "error";
      currentJob.errorMessage = error.message;
      currentJob.stoppedAt = new Date();
    }
  });

  return currentJob;
}

/**
 * Process job in background
 */
async function processJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
  total: number,
  includeMedia: boolean
): Promise<void> {
  // Оптимизированные настройки для быстрой обработки
  // При 3 API ключах с ротацией можно обрабатывать ~180 запросов/мин
  const CHUNK_SIZE = 50;   // было 10 - больше сообщений за раз
  const DELAY_MS = 200;    // было 500 - меньше задержка между сообщениями

  let processed = 0;

  while (processed < total && !shouldStop && currentJob?.status === "running") {
    // Get next chunk of messages
    const messages = await prisma.rawMessage.findMany({
      where,
      take: Math.min(CHUNK_SIZE, total - processed),
      orderBy: { date: "asc" },  // От старых к новым для правильной агрегации
    });

    if (messages.length === 0) {
      break;
    }

    // Process each message
    for (const message of messages) {
      if (shouldStop) break;

      const result = await analyzeMessage(message.id, { includeMedia });

      if (result.success) {
        processed++;
      } else {
        if (currentJob) currentJob.errors++;
      }

      if (currentJob) {
        currentJob.processed = processed;
      }

      // Delay between messages
      if (DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  }

  // Update final status
  if (currentJob) {
    if (shouldStop) {
      currentJob.status = "stopped";
    } else {
      currentJob.status = "completed";
    }
    currentJob.stoppedAt = new Date();
  }

  shouldStop = false;
}

/**
 * Clear completed/stopped job
 */
export function clearJob(): void {
  if (currentJob && currentJob.status !== "running") {
    currentJob = null;
  }
}

// === AUTO MODE ===
// Автоматически анализирует новые сообщения после парсинга

let autoModeEnabled = false;
let autoModeInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check and start analysis if there are pending messages
 */
async function checkAndStartAnalysis(): Promise<void> {
  // Пропускаем если уже идёт анализ
  if (currentJob?.status === "running") return;

  try {
    // Проверяем есть ли неанализированные сообщения
    const pendingCount = await prisma.rawMessage.count({
      where: {
        aiAnalyzed: false,
        OR: [
          { text: { not: null } },
          { hasMedia: true },
        ],
      },
    });

    if (pendingCount > 0) {
      console.log(`[AutoMode] Найдено ${pendingCount} новых сообщений, запуск анализа...`);
      await startJob({ count: pendingCount, includeMedia: true });
    } else {
      console.log("[AutoMode] Нет новых сообщений для анализа");
    }
  } catch (error) {
    console.error("[AutoMode] Ошибка:", error);
  }
}

/**
 * Start auto mode - automatically analyze new messages
 */
export async function startAutoMode(): Promise<void> {
  if (autoModeEnabled) return;
  autoModeEnabled = true;
  console.log("[AutoMode] Авто-режим ВКЛЮЧЁН");

  // Сразу запускаем проверку и анализ
  await checkAndStartAnalysis();

  // Затем проверяем каждые 10 секунд
  autoModeInterval = setInterval(checkAndStartAnalysis, 10000);
}

/**
 * Stop auto mode
 */
export function stopAutoMode(): void {
  autoModeEnabled = false;
  if (autoModeInterval) {
    clearInterval(autoModeInterval);
    autoModeInterval = null;
  }
  console.log("[AutoMode] Авто-режим ВЫКЛЮЧЕН");
}

/**
 * Check if auto mode is enabled
 */
export function isAutoModeEnabled(): boolean {
  return autoModeEnabled;
}
