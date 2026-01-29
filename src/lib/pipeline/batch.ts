/**
 * Batch Processing Functions for Pipeline
 * Обёртки над существующими функциями для автоматического pipeline
 */

import { prisma } from "@/lib/prisma";
import {
  runClassification,
  getClassificationJob,
  AIModelType,
} from "@/lib/ai/classifier";
import { startEnrichmentJob, getJob } from "@/lib/ai/enricher";
import { runMatching, saveMatches } from "@/lib/crm/matcher";

// === Types ===

export interface ClassificationBatchResult {
  processed: number;
  requests: number;
  offers: number;
  errors: number;
}

export interface EnrichmentBatchResult {
  enriched: number;
  skipped: number;
  errors: number;
}

export interface MatchingBatchResult {
  candidates: number;
  evaluated: number;
  saved: number;
}

// === Classification ===

/**
 * Запустить классификацию и дождаться завершения
 */
export async function runClassificationBatch(options: {
  limit?: number;
  model?: AIModelType;
}): Promise<ClassificationBatchResult> {
  const { limit = 50, model = "lite" } = options;

  // Запускаем классификацию
  const job = await runClassification(prisma, {
    limit,
    model,
  });

  // Ждём завершения (polling)
  const result = await waitForClassificationJob(job.id, 5 * 60 * 1000); // 5 минут timeout

  return {
    processed: result.processed,
    requests: result.requests,
    offers: result.offers,
    errors: result.errors,
  };
}

/**
 * Ожидание завершения job классификации
 */
async function waitForClassificationJob(
  jobId: string,
  timeoutMs: number = 300000
): Promise<{
  processed: number;
  requests: number;
  offers: number;
  errors: number;
}> {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 секунда

  while (Date.now() - startTime < timeoutMs) {
    const job = getClassificationJob();

    if (!job || job.id !== jobId) {
      // Job уже завершён и очищен
      return { processed: 0, requests: 0, offers: 0, errors: 0 };
    }

    if (job.status === "completed" || job.status === "stopped" || job.status === "error") {
      return {
        processed: job.processed,
        requests: job.requests,
        offers: job.offers,
        errors: job.errors,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout - возвращаем последнее известное состояние
  const finalJob = getClassificationJob();
  return {
    processed: finalJob?.processed || 0,
    requests: finalJob?.requests || 0,
    offers: finalJob?.offers || 0,
    errors: finalJob?.errors || 0,
  };
}

// === Enrichment ===

/**
 * Запустить обогащение по всем категориям и uncategorized
 */
export async function runEnrichmentBatch(options: {
  limit?: number;
  model?: AIModelType;
}): Promise<EnrichmentBatchResult> {
  const { limit = 30, model = "lite" } = options;
  const aiModel = model === "smart" ? "smart" : "lite";

  let totalEnriched = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 1. Получаем все активные категории
  const categories = await prisma.enrichmentCategory.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  // 2. Запускаем обогащение для каждой категории (последовательно, чтобы не перегружать API)
  for (const category of categories) {
    try {
      // Проверяем есть ли сообщения для обогащения
      const pendingCount = await prisma.rawMessage.count({
        where: {
          aiMessageType: { in: ["request", "offer"] },
          aiProductCategory: category.slug,
          enrichedAt: null,
        },
      });

      if (pendingCount === 0) continue;

      // Запускаем job
      const jobId = await startEnrichmentJob(prisma, {
        categoryId: category.id,
        limit: Math.min(limit, pendingCount),
        aiModel,
      });

      // Ждём завершения
      const result = await waitForEnrichmentJob(jobId, 3 * 60 * 1000); // 3 минуты на категорию
      totalEnriched += result.enriched;
      totalSkipped += result.skipped;
      totalErrors += result.errors;

    } catch (error) {
      console.error(`[Batch] Enrichment error for category ${category.slug}:`, error);
      totalErrors++;
    }
  }

  // 3. Обогащаем uncategorized (AI сам определит категорию)
  try {
    const uncategorizedCount = await prisma.rawMessage.count({
      where: {
        aiMessageType: { in: ["request", "offer"] },
        aiProductCategory: null,
        enrichedAt: null,
      },
    });

    if (uncategorizedCount > 0) {
      const jobId = await startEnrichmentJob(prisma, {
        uncategorized: true,
        limit: Math.min(limit, uncategorizedCount),
        aiModel,
      });

      const result = await waitForEnrichmentJob(jobId, 3 * 60 * 1000);
      totalEnriched += result.enriched;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }
  } catch (error) {
    console.error("[Batch] Uncategorized enrichment error:", error);
    totalErrors++;
  }

  return {
    enriched: totalEnriched,
    skipped: totalSkipped,
    errors: totalErrors,
  };
}

/**
 * Ожидание завершения job обогащения
 */
async function waitForEnrichmentJob(
  jobId: string,
  timeoutMs: number = 180000
): Promise<{
  enriched: number;
  skipped: number;
  errors: number;
}> {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 секунда

  while (Date.now() - startTime < timeoutMs) {
    const job = await getJob(prisma, jobId);

    if (!job) {
      return { enriched: 0, skipped: 0, errors: 0 };
    }

    if (job.status === "completed" || job.status === "stopped" || job.status === "error") {
      return {
        enriched: job.enriched,
        skipped: job.skipped,
        errors: job.errors,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout - получаем финальное состояние
  const finalJob = await getJob(prisma, jobId);
  return {
    enriched: finalJob?.enriched || 0,
    skipped: finalJob?.skipped || 0,
    errors: finalJob?.errors || 0,
  };
}

// === Matching ===

/**
 * Запустить матчинг для всех обогащённых карточек
 *
 * МАКСИМАЛЬНОЕ КАЧЕСТВО:
 * - maxCandidates = 50000 — берём ВСЕ возможные пары REQUEST-OFFER
 * - maxAIEvaluations = переданное значение — AI оценивает топ кандидатов
 * - Каждая новая пара будет оценена AI (уже оценённые пропускаются)
 */
export async function runMatchingBatch(options: {
  maxCandidates?: number;
  model?: AIModelType;
}): Promise<MatchingBatchResult> {
  // maxCandidates из настроек = сколько AI оценит за цикл
  // Но SQL собирает ВСЕ возможные пары (50000 лимит)
  const { maxCandidates = 100, model = "lite" } = options;

  try {
    const result = await runMatching(prisma, {
      maxCandidates: 50000,        // SQL берёт ВСЕ возможные пары
      maxAIEvaluations: maxCandidates, // AI оценивает топ N за цикл
      aiModel: model,
      useVectors: true,            // Если Qdrant доступен - используем
      includeAggregation: true,    // Включаем агрегацию для полноты
    });

    return {
      candidates: result.candidates,
      evaluated: result.evaluated,
      saved: result.saved,
    };
  } catch (error) {
    console.error("[Batch] Matching error:", error);
    return {
      candidates: 0,
      evaluated: 0,
      saved: 0,
    };
  }
}
