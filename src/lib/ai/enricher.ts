/**
 * Stage 2: Обогащение заявок и предложений
 *
 * ВНИМАНИЕ: Этот файл оставлен для обратной совместимости.
 * Новый код использует модуль ./enricher/
 *
 * @deprecated Используйте import from "@/lib/ai/enricher"
 */

// Реэкспорт из нового модуля
export * from "./enricher/index";

// Legacy API для обратной совместимости
import { prisma } from "@/lib/prisma";
import {
  startEnrichmentJob as _startEnrichmentJob,
  stopEnrichmentJob as _stopEnrichmentJob,
  getActiveJobs,
  getEnrichmentStats,
  enrichSingleMessage,
} from "./enricher/index";
import type { EnrichedCard, RawMessageForEnrichment } from "./enricher/types";

// Legacy интерфейс job'а
export interface EnrichmentJob {
  id: string;
  status: "running" | "completed" | "stopped" | "error";
  total: number;
  processed: number;
  enriched: number;
  errors: number;
  startedAt: Date;
  stoppedAt?: Date;
}

// Кеш для текущего job'а (legacy)
let currentJobId: string | null = null;

/**
 * @deprecated Используйте getActiveJobs() из нового API
 */
export async function getEnrichmentJob(): Promise<EnrichmentJob | null> {
  if (!currentJobId) {
    const activeJobs = await getActiveJobs(prisma);
    if (activeJobs.length > 0) {
      currentJobId = activeJobs[0].id;
    }
  }

  if (!currentJobId) return null;

  const job = await prisma.enrichmentJob.findUnique({
    where: { id: currentJobId },
  });

  if (!job) return null;

  return {
    id: job.id,
    status: job.status as "running" | "completed" | "stopped" | "error",
    total: job.total,
    processed: job.processed,
    enriched: job.enriched,
    errors: job.errors,
    startedAt: job.startedAt || new Date(),
    stoppedAt: job.stoppedAt || undefined,
  };
}

/**
 * @deprecated Используйте stopEnrichmentJob() из нового API
 */
export async function stopEnrichment(): Promise<void> {
  if (currentJobId) {
    await _stopEnrichmentJob(prisma, currentJobId);
  }
}

/**
 * @deprecated Используйте startEnrichmentJob() из нового API
 */
export async function runEnrichment(
  prismaClient: any,
  options: { limit?: number | "all" } = {}
): Promise<EnrichmentJob> {
  // Находим первую активную категорию
  const category = await prismaClient.enrichmentCategory.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!category) {
    throw new Error("Нет активных категорий обогащения");
  }

  const jobId = await _startEnrichmentJob(prismaClient, {
    categoryId: category.id,
    limit: options.limit,
  });

  currentJobId = jobId;

  const job = await prismaClient.enrichmentJob.findUnique({
    where: { id: jobId },
  });

  return {
    id: job.id,
    status: job.status as "running" | "completed" | "stopped" | "error",
    total: job.total,
    processed: job.processed,
    enriched: job.enriched,
    errors: job.errors,
    startedAt: job.startedAt || new Date(),
  };
}

/**
 * @deprecated Используйте enrichSingleMessage() из нового API
 */
export async function enrichMessage(
  message: RawMessageForEnrichment
): Promise<EnrichedCard | null> {
  // Находим первую активную категорию
  const category = await prisma.enrichmentCategory.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!category) {
    throw new Error("Нет активных категорий обогащения");
  }

  return enrichSingleMessage(prisma, category.id, message);
}

/**
 * Получение обогащённых карточек
 */
export async function getEnrichedCards(
  prismaClient: any,
  options: {
    type?: "REQUEST" | "OFFER";
    category?: string;
    city?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<EnrichedCard[]> {
  const messages = await prismaClient.rawMessage.findMany({
    where: {
      enrichedAt: { not: null },
      enrichedData: { not: null },
      ...(options.type && {
        aiMessageType: options.type === "REQUEST" ? "request" : "offer",
      }),
    },
    take: options.limit || 50,
    skip: options.offset || 0,
    orderBy: { enrichedAt: "desc" },
    select: {
      enrichedData: true,
    },
  });

  return messages
    .map((m: any) => {
      try {
        return JSON.parse(m.enrichedData);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
