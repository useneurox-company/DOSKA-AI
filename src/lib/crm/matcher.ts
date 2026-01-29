/**
 * CRM Matcher - Гибкий матчинг заявок и предложений
 *
 * Особенности:
 * 1. Похожие товары (опечатки, синонимы, близкие ГОСТы)
 * 2. Агрегация объёмов (сборка из нескольких продавцов)
 * 3. Логистика как опция (показываем все, отмечаем расстояние)
 * 4. Срочность как фактор (не главный)
 * 5. Приоритет свежим объявлениям
 */

import { PrismaClient } from "@prisma/client";
import {
  MatchCard,
  MatchCandidate,
  FullMatch,
  AggregatedMatch,
  MatchingResults,
  MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
} from "./types";
import { evaluateMatchWithAI, evaluateAggregation } from "./ai-evaluator";
import {
  isQdrantAvailable,
  findMatchingOffers,
  CardPayload,
} from "@/lib/vector";

// Расчёт свежести карточки (0-100)
function calculateFreshness(date?: Date | string): number {
  if (!date) return 50;

  const now = new Date();
  const cardDate = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - cardDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 1) return 100;
  if (diffDays <= 3) return 90;
  if (diffDays <= 7) return 75;
  if (diffDays <= 14) return 60;
  if (diffDays <= 30) return 40;
  if (diffDays <= 60) return 25;
  return 10;
}

// Парсинг количества из строки
function parseQuantity(quantity?: string): { num: number; unit: string } | null {
  if (!quantity) return null;

  const match = quantity.match(/(\d+(?:[.,]\d+)?)\s*(тн|тонн|т|кг|шт|м|п\.м|м2|м3)?/i);
  if (!match) return null;

  const num = parseFloat(match[1].replace(",", "."));
  const unit = (match[2] || "шт").toLowerCase();

  // Нормализуем единицы
  const normalizedUnit =
    unit === "тонн" || unit === "т" ? "тн" :
    unit === "п.м" ? "м" :
    unit;

  return { num, unit: normalizedUnit };
}

// Парсим enrichedData в MatchCard
function parseEnrichedCard(raw: {
  id: string;
  enrichedData: string | null;
  enrichmentCategoryId: string | null;
  date?: Date;
  enrichedAt?: Date | null;
}): MatchCard | null {
  if (!raw.enrichedData) return null;

  try {
    const data = JSON.parse(raw.enrichedData);
    const quantity = parseQuantity(data.quantity || data.items?.[0]?.quantity);

    return {
      id: raw.id,
      type: data.type || "REQUEST",
      title: data.title || "",
      subcategory: data.subcategory,
      subcategoryId: data.subcategoryId,
      city: data.city,
      region: data.region,
      price: typeof data.price === "object" ? data.price?.value : data.price,
      priceUnit: typeof data.price === "object" ? data.price?.per : undefined,
      quantity: data.quantity || data.items?.[0]?.quantity,
      quantityNum: quantity?.num,
      quantityUnit: quantity?.unit,
      description: data.description,
      contacts: data.contacts,
      categoryId: raw.enrichmentCategoryId || undefined,
      createdAt: raw.date,
      enrichedAt: raw.enrichedAt || undefined,
    };
  } catch {
    return null;
  }
}

// Нормализация строки для сравнения
function normalize(str?: string): string {
  if (!str) return "";
  return str.toLowerCase().trim();
}

// Уровень 1: SQL фильтрация - находим ВСЕ потенциальные пары
export async function findCandidates(
  prisma: PrismaClient,
  options: {
    categoryId?: string;
    limit?: number;
    config?: MatchingConfig;
  } = {}
): Promise<MatchCandidate[]> {
  const { categoryId, limit = 10000, config = DEFAULT_MATCHING_CONFIG } = options;

  // Получаем все обогащённые карточки (без фильтра по модерации - AI сам отфильтрует)
  const messages = await prisma.rawMessage.findMany({
    where: {
      enrichedAt: { not: null },
      enrichedData: { not: null },
      ...(categoryId && { enrichmentCategoryId: categoryId }),
    },
    select: {
      id: true,
      enrichedData: true,
      enrichmentCategoryId: true,
      date: true,
      enrichedAt: true,
    },
    orderBy: { date: "desc" }, // Сначала свежие
  });

  // Разделяем на REQUEST и OFFER
  const requestCards: MatchCard[] = [];
  const offerCards: MatchCard[] = [];

  for (const msg of messages) {
    const card = parseEnrichedCard(msg);
    if (!card) continue;

    if (card.type === "REQUEST") {
      requestCards.push(card);
    } else {
      offerCards.push(card);
    }
  }

  // Проверяем существующие матчи И оценки (чтобы не тратить токены повторно)
  const [existingMatches, existingEvaluations] = await Promise.all([
    prisma.match.findMany({
      select: { requestId: true, offerId: true },
    }),
    prisma.matchEvaluation.findMany({
      select: { requestId: true, offerId: true },
    }),
  ]);

  const existingPairs = new Set([
    ...existingMatches.map((m) => `${m.requestId}:${m.offerId}`),
    ...existingEvaluations.map((e) => `${e.requestId}:${e.offerId}`),
  ]);

  // Собираем кандидатов с учётом свежести
  const candidates: MatchCandidate[] = [];

  for (const request of requestCards) {
    for (const offer of offerCards) {
      // Пропускаем существующие матчи
      if (existingPairs.has(`${request.id}:${offer.id}`)) continue;

      // Базовый score - все пары получают шанс, AI разберётся
      let sqlScore = 10; // Базовый score для всех пар

      // Категория (бонус за совпадение, но НЕ фильтруем)
      if (request.categoryId && offer.categoryId) {
        if (request.categoryId === offer.categoryId) {
          sqlScore += 30;
        }
        // Разные категории - не пропускаем, пусть AI решит
      }

      // Подкатегория (бонус)
      if (
        request.subcategoryId &&
        offer.subcategoryId &&
        request.subcategoryId === offer.subcategoryId
      ) {
        sqlScore += 25;
      } else if (
        request.subcategory &&
        offer.subcategory &&
        normalize(request.subcategory) === normalize(offer.subcategory)
      ) {
        sqlScore += 20;
      }

      // Город (бонус)
      if (
        request.city &&
        offer.city &&
        normalize(request.city) === normalize(offer.city)
      ) {
        sqlScore += 15;
      } else if (
        request.region &&
        offer.region &&
        normalize(request.region) === normalize(offer.region)
      ) {
        sqlScore += 8;
      }

      // Свежесть (бонус)
      const requestFreshness = calculateFreshness(request.createdAt);
      const offerFreshness = calculateFreshness(offer.createdAt);
      const avgFreshness = (requestFreshness + offerFreshness) / 2;
      const freshnessBonus = Math.round(avgFreshness * config.freshnessWeight * 0.2);
      sqlScore += freshnessBonus;

      // Добавляем ВСЕ пары - AI разберётся с качеством
      candidates.push({
        request,
        offer,
        sqlScore,
        freshnessScore: avgFreshness,
      });
    }
  }

  // Сортируем: сначала по score, потом по свежести
  candidates.sort((a, b) => {
    const scoreDiff = b.sqlScore - a.sqlScore;
    if (Math.abs(scoreDiff) > 5) return scoreDiff;
    return (b.freshnessScore || 0) - (a.freshnessScore || 0);
  });

  return candidates.slice(0, limit);
}

// Уровень 2: Векторный поиск (если Qdrant доступен)
export async function findCandidatesWithVectors(
  prisma: PrismaClient,
  options: {
    categoryId?: string;
    limit?: number;
    config?: MatchingConfig;
  } = {}
): Promise<MatchCandidate[]> {
  const { categoryId, limit = 100, config = DEFAULT_MATCHING_CONFIG } = options;

  // Получаем REQUEST карточки (без фильтра по модерации)
  const messages = await prisma.rawMessage.findMany({
    where: {
      enrichedAt: { not: null },
      enrichedData: { not: null },
      ...(categoryId && { enrichmentCategoryId: categoryId }),
    },
    select: {
      id: true,
      enrichedData: true,
      enrichmentCategoryId: true,
      date: true,
      enrichedAt: true,
    },
    orderBy: { date: "desc" },
  });

  const requestCards: MatchCard[] = [];
  for (const msg of messages) {
    const card = parseEnrichedCard(msg);
    if (card && card.type === "REQUEST") {
      requestCards.push(card);
    }
  }

  // Существующие матчи И оценки (чтобы не тратить токены повторно)
  const [existingMatches, existingEvaluations] = await Promise.all([
    prisma.match.findMany({
      select: { requestId: true, offerId: true },
    }),
    prisma.matchEvaluation.findMany({
      select: { requestId: true, offerId: true },
    }),
  ]);

  const existingPairs = new Set([
    ...existingMatches.map((m) => `${m.requestId}:${m.offerId}`),
    ...existingEvaluations.map((e) => `${e.requestId}:${e.offerId}`),
  ]);

  const candidates: MatchCandidate[] = [];

  // Для каждого REQUEST ищем похожие OFFER через векторы
  for (const request of requestCards.slice(0, 30)) {
    try {
      const cardPayload: CardPayload = {
        id: request.id,
        type: "REQUEST",
        title: request.title,
        subcategory: request.subcategory,
        subcategoryId: request.subcategoryId,
        categoryId: request.categoryId,
        city: request.city,
        region: request.region,
        price: request.price,
        priceUnit: request.priceUnit,
        quantity: request.quantity,
        description: request.description,
        contacts: request.contacts,
        enrichedAt: new Date().toISOString(),
      };

      // Ищем похожие с низким порогом (AI разберётся)
      const similarOffers = await findMatchingOffers(cardPayload, {
        limit: 15,
        scoreThreshold: 0.01, // Feature Hashing scores низкие (0.01-0.1)
      });

      for (const offer of similarOffers) {
        if (existingPairs.has(`${request.id}:${offer.id}`)) continue;

        const offerFreshness = calculateFreshness(offer.enrichedAt);
        const requestFreshness = calculateFreshness(request.createdAt);

        candidates.push({
          request,
          offer: {
            id: offer.id,
            type: offer.type,
            title: offer.title,
            subcategory: offer.subcategory,
            subcategoryId: offer.subcategoryId,
            city: offer.city,
            region: offer.region,
            price: offer.price,
            priceUnit: offer.priceUnit,
            quantity: offer.quantity,
            description: offer.description,
            contacts: offer.contacts,
            categoryId: offer.categoryId,
          },
          sqlScore: Math.round(offer.score * 100),
          vectorScore: offer.score,
          freshnessScore: (offerFreshness + requestFreshness) / 2,
        });
      }
    } catch (error) {
      console.error(`Vector search error for ${request.id}:`, error);
    }
  }

  // Сортируем по векторному score + свежесть
  candidates.sort((a, b) => {
    const vectorDiff = (b.vectorScore || 0) - (a.vectorScore || 0);
    if (Math.abs(vectorDiff) > 0.1) return vectorDiff;
    return (b.freshnessScore || 0) - (a.freshnessScore || 0);
  });

  return candidates.slice(0, limit);
}

// Уровень 3: AI оценка с группировкой по confidence
// Сохраняет ВСЕ оценки в MatchEvaluation (чтобы не тратить токены повторно)
export async function evaluateCandidates(
  prisma: PrismaClient,
  candidates: MatchCandidate[],
  aiModel: "lite" | "smart" = "lite",
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): Promise<MatchingResults & { totalEvaluated: number; skippedLowScore: number }> {
  const results: MatchingResults = {
    exact: [],
    high: [],
    possible: [],
    aggregated: [],
  };

  let totalEvaluated = 0;
  let skippedLowScore = 0;

  for (const candidate of candidates) {
    try {
      const evaluation = await evaluateMatchWithAI(
        candidate.request,
        candidate.offer,
        aiModel,
        config
      );

      totalEvaluated++;
      const wasAccepted = evaluation.score >= 40;

      // Сохраняем ВСЕ оценки в MatchEvaluation (даже с низким score)
      try {
        await prisma.matchEvaluation.upsert({
          where: {
            requestId_offerId: {
              requestId: candidate.request.id,
              offerId: candidate.offer.id,
            },
          },
          update: {
            score: evaluation.score,
            wasAccepted,
          },
          create: {
            requestId: candidate.request.id,
            offerId: candidate.offer.id,
            score: evaluation.score,
            wasAccepted,
          },
        });
      } catch (evalSaveError) {
        console.error("Save evaluation error:", evalSaveError);
      }

      const fullMatch: FullMatch = {
        ...candidate,
        evaluation,
      };

      // Группируем по confidence
      if (evaluation.score >= 80) {
        results.exact.push(fullMatch);
      } else if (evaluation.score >= 60) {
        results.high.push(fullMatch);
      } else if (evaluation.score >= 40) {
        results.possible.push(fullMatch);
      } else {
        skippedLowScore++;
      }

    } catch (error) {
      console.error("AI evaluation error:", error);
    }
  }

  // Сортируем каждую группу по score и свежести
  const sortFn = (a: FullMatch, b: FullMatch) => {
    const scoreDiff = b.evaluation.score - a.evaluation.score;
    if (Math.abs(scoreDiff) > 5) return scoreDiff;
    return b.evaluation.freshnessScore - a.evaluation.freshnessScore;
  };

  results.exact.sort(sortFn);
  results.high.sort(sortFn);
  results.possible.sort(sortFn);

  return { ...results, totalEvaluated, skippedLowScore };
}

// Агрегация: собираем объём из нескольких офферов
export async function findAggregatedMatches(
  prisma: PrismaClient,
  options: {
    categoryId?: string;
    aiModel?: "lite" | "smart";
    config?: MatchingConfig;
  } = {}
): Promise<AggregatedMatch[]> {
  const { categoryId, aiModel = "lite", config = DEFAULT_MATCHING_CONFIG } = options;

  if (!config.allowAggregation) return [];

  // Получаем REQUEST с указанным количеством
  const messages = await prisma.rawMessage.findMany({
    where: {
      enrichedAt: { not: null },
      enrichedData: { not: null },
      moderationStatus: "approved",
      ...(categoryId && { enrichmentCategoryId: categoryId }),
    },
    select: {
      id: true,
      enrichedData: true,
      enrichmentCategoryId: true,
      date: true,
      enrichedAt: true,
    },
  });

  // Группируем по типу
  const requestsWithQuantity: MatchCard[] = [];
  const allOffers: MatchCard[] = [];

  for (const msg of messages) {
    const card = parseEnrichedCard(msg);
    if (!card) continue;

    if (card.type === "REQUEST" && card.quantityNum && card.quantityNum > 0) {
      requestsWithQuantity.push(card);
    } else if (card.type === "OFFER") {
      allOffers.push(card);
    }
  }

  const aggregatedMatches: AggregatedMatch[] = [];

  // Для каждого REQUEST ищем комбинацию офферов
  for (const request of requestsWithQuantity.slice(0, 10)) {
    // Фильтруем подходящие офферы (та же категория/подкатегория)
    const relevantOffers = allOffers.filter(
      (o) =>
        o.categoryId === request.categoryId &&
        (o.subcategoryId === request.subcategoryId ||
          normalize(o.subcategory) === normalize(request.subcategory))
    );

    if (relevantOffers.length < 2) continue;

    // AI оценит возможность агрегации
    try {
      const aggregation = await evaluateAggregation(
        request,
        relevantOffers.slice(0, 5),
        aiModel
      );

      if (aggregation.totalCoverage >= config.minCoveragePercent) {
        aggregatedMatches.push({
          request,
          offers: aggregation.contributions.map((c) => ({
            offer: relevantOffers.find((o) => o.id === c.offerId) || relevantOffers[0],
            contribution: c.contribution,
            score: c.score,
          })),
          totalCoverage: aggregation.totalCoverage,
          evaluation: aggregation.evaluation,
        });
      }
    } catch (error) {
      console.error("Aggregation error:", error);
    }
  }

  return aggregatedMatches;
}

// Сохраняем матчи в БД
export async function saveMatches(
  prisma: PrismaClient,
  results: MatchingResults
): Promise<number> {
  let saved = 0;

  const allMatches = [
    ...results.exact,
    ...results.high,
    ...results.possible,
  ];

  for (const match of allMatches) {
    try {
      await prisma.match.upsert({
        where: {
          requestId_offerId: {
            requestId: match.request.id,
            offerId: match.offer.id,
          },
        },
        update: {
          score: match.evaluation.score,
          reason: match.evaluation.reason,
          marginPercent: match.evaluation.margin?.percent,
          marginAbsolute: match.evaluation.margin?.absolute,
          marginNote: match.evaluation.margin?.note,
          risks: match.evaluation.risks,
        },
        create: {
          requestId: match.request.id,
          offerId: match.offer.id,
          score: match.evaluation.score,
          reason: match.evaluation.reason,
          marginPercent: match.evaluation.margin?.percent,
          marginAbsolute: match.evaluation.margin?.absolute,
          marginNote: match.evaluation.margin?.note,
          risks: match.evaluation.risks,
          status: "new",
        },
      });
      saved++;
    } catch (error) {
      console.error("Save match error:", error);
    }
  }

  return saved;
}

// Полный процесс матчинга
export async function runMatching(
  prisma: PrismaClient,
  options: {
    categoryId?: string;
    maxCandidates?: number;
    maxAIEvaluations?: number;
    aiModel?: "lite" | "smart";
    useVectors?: boolean;
    includeAggregation?: boolean;
    config?: MatchingConfig;
  } = {}
): Promise<{
  candidates: number;
  evaluated: number;
  skippedLowScore: number;
  results: MatchingResults;
  saved: number;
  usedVectors: boolean;
}> {
  const {
    categoryId,
    maxCandidates = 20000, // Увеличен для полного охвата всех пар
    maxAIEvaluations = 100, // Увеличен для большего покрытия за один запуск
    aiModel = "lite",
    useVectors = true,
    includeAggregation = true,
    config = DEFAULT_MATCHING_CONFIG,
  } = options;

  let allCandidates: MatchCandidate[];
  let usedVectors = false;

  // Выбираем метод поиска кандидатов
  if (useVectors && (await isQdrantAvailable())) {
    console.log("[Matcher] Using vector search (Qdrant)");
    allCandidates = await findCandidatesWithVectors(prisma, {
      categoryId,
      limit: maxCandidates,
      config,
    });
    usedVectors = true;
  } else {
    console.log("[Matcher] Using SQL + text search");
    allCandidates = await findCandidates(prisma, {
      categoryId,
      limit: maxCandidates,
      config,
    });
  }

  // Берём топ для AI оценки
  const topCandidates = allCandidates.slice(0, maxAIEvaluations);

  // Если нет новых кандидатов - возвращаем пустой результат
  if (topCandidates.length === 0) {
    console.log("[Matcher] Нет новых кандидатов для оценки (все пары уже оценены)");
    return {
      candidates: allCandidates.length,
      evaluated: 0,
      skippedLowScore: 0,
      results: { exact: [], high: [], possible: [], aggregated: [] },
      saved: 0,
      usedVectors,
    };
  }

  // AI оценка с группировкой (сохраняет все оценки в MatchEvaluation)
  const { totalEvaluated, skippedLowScore, ...results } = await evaluateCandidates(prisma, topCandidates, aiModel, config);

  // Агрегация (опционально)
  if (includeAggregation && config.allowAggregation) {
    const aggregated = await findAggregatedMatches(prisma, {
      categoryId,
      aiModel,
      config,
    });
    results.aggregated = aggregated;
  }

  // Сохраняем в БД
  const saved = await saveMatches(prisma, results);

  return {
    candidates: allCandidates.length,
    evaluated: totalEvaluated,
    skippedLowScore,
    results,
    saved,
    usedVectors,
  };
}
