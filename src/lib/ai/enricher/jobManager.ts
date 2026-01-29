/**
 * Менеджер заданий обогащения
 * Создание, остановка, статус job'ов
 */

import { EnrichmentJobRegistry } from "./registry";
import { processEnrichmentBatch } from "./worker";
import { StartJobOptions } from "./types";

/**
 * Создаёт и запускает новое задание обогащения
 */
export async function startEnrichmentJob(
  prisma: any,
  options: StartJobOptions
): Promise<string> {
  const {
    categoryId,
    limit,
    batchSize = 2,
    aiModel = "smart",
    uncategorized = false,
  } = options;

  // Режим для сообщений без категории
  if (uncategorized) {
    // Проверяем, нет ли уже запущенного uncategorized job
    const runningJob = await prisma.enrichmentJob.findFirst({
      where: {
        categoryId: null,
        status: "running",
      },
    });

    if (runningJob) {
      throw new Error(`Job для сообщений без категории уже запущен: ${runningJob.id}`);
    }

    // Считаем сообщения БЕЗ категории
    const whereCondition = {
      aiMessageType: { in: ["request", "offer"] },
      aiProductCategory: null,
      enrichedAt: null,
    };

    const totalCount = await prisma.rawMessage.count({ where: whereCondition });
    const jobLimit = limit === "all" ? totalCount : (limit || 50);

    // Создаём запись в БД (без categoryId)
    const job = await prisma.enrichmentJob.create({
      data: {
        categoryId: null,  // Без категории
        status: "pending",
        total: Math.min(jobLimit, totalCount),
        processed: 0,
        enriched: 0,
        skipped: 0,
        errors: 0,
        batchSize,
        aiModel,
      },
    });

    // Регистрируем в in-memory реестре
    EnrichmentJobRegistry.register(job.id, {
      shouldStop: false,
      status: "pending",
    });

    // Запускаем обработку асинхронно
    processEnrichmentBatch(prisma, job.id, { uncategorized: true }).catch(async (error) => {
      console.error(`[JobManager] Uncategorized job ${job.id} failed:`, error);
      await prisma.enrichmentJob.update({
        where: { id: job.id },
        data: {
          status: "error",
          errorMessage: error.message,
          stoppedAt: new Date(),
        },
      });
      EnrichmentJobRegistry.update(job.id, { status: "error" });
    });

    return job.id;
  }

  // Обычный режим с категорией
  if (!categoryId) {
    throw new Error("categoryId обязателен для обычного режима обогащения");
  }

  // Проверяем, нет ли уже запущенного job для этой категории
  const runningJob = await prisma.enrichmentJob.findFirst({
    where: {
      categoryId,
      status: "running",
    },
  });

  if (runningJob) {
    throw new Error(`Job для категории уже запущен: ${runningJob.id}`);
  }

  // Получаем slug категории для фильтрации
  const category = await prisma.enrichmentCategory.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });
  const categorySlug = category?.slug;

  // Считаем сообщения для обогащения ТОЛЬКО по этой категории
  const whereCondition = {
    aiMessageType: { in: ["request", "offer"] },
    aiProductCategory: categorySlug,  // Фильтр по категории!
    enrichedAt: null,
  };

  const totalCount = await prisma.rawMessage.count({ where: whereCondition });
  const jobLimit = limit === "all" ? totalCount : (limit || 50);

  // Создаём запись в БД
  const job = await prisma.enrichmentJob.create({
    data: {
      categoryId,
      status: "pending",
      total: Math.min(jobLimit, totalCount),
      processed: 0,
      enriched: 0,
      skipped: 0,
      errors: 0,
      batchSize,
      aiModel,
    },
  });

  // Регистрируем в in-memory реестре для отслеживания
  EnrichmentJobRegistry.register(job.id, {
    shouldStop: false,
    status: "pending",
  });

  // Запускаем обработку асинхронно
  processEnrichmentBatch(prisma, job.id).catch(async (error) => {
    console.error(`[JobManager] Job ${job.id} failed:`, error);
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: "error",
        errorMessage: error.message,
        stoppedAt: new Date(),
      },
    });
    EnrichmentJobRegistry.update(job.id, { status: "error" });
  });

  return job.id;
}

/**
 * Останавливает задание
 */
export async function stopEnrichmentJob(
  prisma: any,
  jobId: string
): Promise<void> {
  const state = EnrichmentJobRegistry.get(jobId);
  if (state) {
    state.shouldStop = true;
  }

  await prisma.enrichmentJob.update({
    where: { id: jobId },
    data: {
      status: "stopped",
      stoppedAt: new Date(),
    },
  });
}

/**
 * Останавливает все активные задания
 */
export async function stopAllJobs(prisma: any): Promise<number> {
  const activeJobs = await getActiveJobs(prisma);

  for (const job of activeJobs) {
    const state = EnrichmentJobRegistry.get(job.id);
    if (state) {
      state.shouldStop = true;
    }
  }

  const result = await prisma.enrichmentJob.updateMany({
    where: {
      status: { in: ["pending", "running"] },
    },
    data: {
      status: "stopped",
      stoppedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Получает статус всех активных заданий
 */
export async function getActiveJobs(prisma: any) {
  return prisma.enrichmentJob.findMany({
    where: {
      status: { in: ["pending", "running"] },
    },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Получает историю заданий
 */
export async function getJobHistory(
  prisma: any,
  options: {
    categoryId?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  return prisma.enrichmentJob.findMany({
    where: options.categoryId ? { categoryId: options.categoryId } : undefined,
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
    take: options.limit || 20,
    skip: options.offset || 0,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Получает один job по ID
 */
export async function getJob(prisma: any, jobId: string) {
  return prisma.enrichmentJob.findUnique({
    where: { id: jobId },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

/**
 * Получает статистику по обогащённым карточкам
 */
export async function getEnrichmentStats(
  prisma: any,
  categoryId?: string | null
) {
  const where = categoryId ? { enrichmentCategoryId: categoryId } : {};

  const [total, requests, offers, pending] = await Promise.all([
    prisma.rawMessage.count({
      where: { ...where, enrichedAt: { not: null } },
    }),
    prisma.rawMessage.count({
      where: { ...where, enrichedAt: { not: null }, aiMessageType: "request" },
    }),
    prisma.rawMessage.count({
      where: { ...where, enrichedAt: { not: null }, aiMessageType: "offer" },
    }),
    prisma.rawMessage.count({
      where: {
        aiMessageType: { in: ["request", "offer"] },
        enrichedAt: null,
      },
    }),
  ]);

  // Статистика по категориям
  const byCategory = await prisma.enrichmentCategory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { rawMessages: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return { total, requests, offers, pending, byCategory };
}
