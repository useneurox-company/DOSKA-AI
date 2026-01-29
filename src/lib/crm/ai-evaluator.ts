/**
 * AI Evaluator - гибкая оценка матча с помощью AI
 *
 * Правила матчинга:
 * 1. Продукт: ищем похожие по сути (опечатки, синонимы, близкие ГОСТы)
 * 2. Объём: можем собирать из нескольких предложений
 * 3. Логистика: показываем все варианты, даже далёкие
 * 4. Срочность: учитываем, но не главное
 * 5. Свежесть: приоритет свежим, но показываем все
 */

import { chatCompletion } from "@/lib/ai/openrouter";
import {
  MatchCard,
  MatchEvaluation,
  MatchConfidence,
  MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
} from "./types";

// Расчёт свежести (0-100)
function calculateFreshness(date?: Date): number {
  if (!date) return 50; // Неизвестно - средний балл

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 1) return 100; // Сегодня/вчера
  if (diffDays <= 3) return 90;
  if (diffDays <= 7) return 75;
  if (diffDays <= 14) return 60;
  if (diffDays <= 30) return 40;
  if (diffDays <= 60) return 25;
  return 10; // Старше 2 месяцев
}

// Форматирование карточки для промпта
function formatCard(card: MatchCard, role: string): string {
  const lines: string[] = [];
  const freshness = calculateFreshness(card.createdAt || card.enrichedAt);

  lines.push(`${role}:`);
  lines.push(`- Тип: ${card.type === "REQUEST" ? "ПОКУПАТЕЛЬ (ищет)" : "ПРОДАВЕЦ (предлагает)"}`);

  if (card.title) lines.push(`- Товар: ${card.title}`);
  if (card.subcategory) lines.push(`- Подкатегория: ${card.subcategory}`);
  if (card.description) lines.push(`- Описание: ${card.description}`);
  if (card.quantity) lines.push(`- Количество: ${card.quantity}`);
  if (card.price) {
    lines.push(`- Цена: ${card.price}${card.priceUnit ? ` ${card.priceUnit}` : " руб"}`);
  }
  if (card.city) lines.push(`- Город: ${card.city}`);
  if (card.region) lines.push(`- Регион: ${card.region}`);
  lines.push(`- Свежесть объявления: ${freshness >= 75 ? "свежее" : freshness >= 40 ? "актуальное" : "старое"} (${freshness}/100)`);

  if (card.contacts) {
    const c = card.contacts;
    if (c.name) lines.push(`- Контакт: ${c.name}`);
    if (c.username) lines.push(`- Telegram: @${c.username}`);
  }

  return lines.join("\n");
}

// Основной промпт для гибкого матчинга (универсальный для всех категорий)
function buildPrompt(request: MatchCard, offer: MatchCard, config: MatchingConfig): string {
  return `Ты B2B эксперт по сопоставлению заявок и предложений. Работаешь с ЛЮБЫМИ товарами и услугами.

ЗАДАЧА: Определи, подходит ли ПРОДАВЕЦ для ПОКУПАТЕЛЯ. Оценивай ОБЪЕКТИВНО.

${formatCard(request, "ПОКУПАТЕЛЬ")}

${formatCard(offer, "ПРОДАВЕЦ")}

═══════════════════════════════════════════════════════════════
КРИТЕРИИ ОЦЕНКИ (по важности):
═══════════════════════════════════════════════════════════════

▸ КРИТЕРИЙ 1: ТОВАР (вес 50%)
  Оценивай:
  - Точное совпадение названия = 100%
  - Синонимы/вариации написания = 90% (пример: "балка" = "балка двутавровая")
  - Опечатки = 85% (пример: "арматура" = "арматра")
  - Похожие товары в той же категории = 60-80%
  - Товары-заменители = 40-60%
  - Совсем разные товары = 0-20%

▸ КРИТЕРИЙ 2: ОБЪЁМ/КОЛИЧЕСТВО (вес 20%)
  Оценивай:
  - Продавец имеет >= нужного = 100%
  - Продавец имеет 50-99% = пропорционально (частичное покрытие ОК)
  - Продавец имеет < 50% = снижай оценку
  - Если объём не указан - ставь 70% (неизвестно)

▸ КРИТЕРИЙ 3: ГЕОГРАФИЯ (вес 15%)
  ВАЖНО: Разные города НЕ ОЗНАЧАЮТ отказ! Оценивай:
  - Один город = 100% (+бонус к доставке)
  - Один регион = 80%
  - Соседние регионы = 60%
  - Далеко (1000+ км) = 40% (но показывай! с пометкой о доставке)
  - География не указана = 60%

▸ КРИТЕРИЙ 4: ЦЕНА (вес 10%)
  - Если указаны обе цены - рассчитай маржу
  - Если цена не указана - не снижай оценку

▸ КРИТЕРИЙ 5: СВЕЖЕСТЬ (вес 5%)
  - Свежие объявления (<7 дней) = бонус
  - Старые (>30 дней) = небольшой минус

═══════════════════════════════════════════════════════════════
ВАЖНЫЕ ПРАВИЛА:
═══════════════════════════════════════════════════════════════

1. ВСЕГДА ПОКАЗЫВАЙ ВАРИАНТЫ ИЗ ДРУГИХ ГОРОДОВ
   - Добавь пометку "требуется доставка из [город]"
   - Не отбрасывай только из-за географии

2. УЧИТЫВАЙ СИНОНИМЫ И ВАРИАЦИИ
   - "г/к" = "горячекатаный", "х/к" = "холоднокатаный"
   - "тн" = "тонн" = "т", "шт" = "штук"
   - Разные ГОСТы на похожую продукцию - могут подойти

3. ЧАСТИЧНОЕ ПОКРЫТИЕ = ОК
   - Если нужно 10тн, а есть 5тн - это 50% покрытия, показывай

4. ОБЪЯСНЯЙ РЕШЕНИЕ ПОНЯТНО
   - В reason напиши КОНКРЕТНО почему подходит/не подходит
   - Укажи главный фактор совпадения

═══════════════════════════════════════════════════════════════

Ответь ТОЛЬКО валидным JSON:
{
  "score": <число 0-100>,
  "confidence": "<exact|high|possible|weak>",
  "reason": "<КОНКРЕТНОЕ объяснение: что совпало, что нет, почему такой score>",

  "productMatch": {
    "score": <0-100>,
    "whatMatches": "<что именно совпадает>",
    "differences": ["<различие1>", "<различие2>"],
    "canSubstitute": <true если товар-заменитель>
  },

  "volumeMatch": {
    "requested": "<сколько нужно>",
    "available": "<сколько есть>",
    "coverage": <% покрытия 0-100>,
    "needsAggregation": <true если нужно собирать из нескольких>
  },

  "logistics": {
    "sameCity": <true/false>,
    "sameRegion": <true/false>,
    "buyerCity": "<город покупателя или null>",
    "sellerCity": "<город продавца или null>",
    "deliveryNote": "<комментарий: 'в одном городе' / 'доставка из Москвы в СПб ~700км' / 'география не указана'>"
  },

  "priceAnalysis": {
    "buyerPrice": <цена покупателя или null>,
    "sellerPrice": <цена продавца или null>,
    "marginPercent": <маржа % или null>,
    "priceNote": "<комментарий о цене>"
  },

  "freshnessScore": <0-100>,

  "risks": ["<риск1>", "<риск2>"],
  "opportunities": ["<возможность1>"],

  "recommendation": "<ИТОГ: одно предложение - брать в работу или нет и почему>"
}

ШКАЛА SCORE:
• 80-100 (exact): Идеальное/почти идеальное совпадение
• 60-79 (high): Хорошее совпадение, мелкие различия
• 40-59 (possible): Возможный вариант, стоит рассмотреть
• 20-39 (weak): Слабое совпадение, запасной вариант
• 0-19: Не подходит (разные товары)`;
}

// Парсинг ответа AI (поддержка нового и старого формата)
function parseAIResponse(text: string): MatchEvaluation {
  // Убираем markdown если есть
  let cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Ищем JSON в тексте
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }

  const data = JSON.parse(jsonMatch[0]);

  // Определяем confidence по score если не указан
  const score = Math.max(0, Math.min(100, Number(data.score) || 0));
  let confidence: MatchConfidence = data.confidence || "weak";
  if (!data.confidence) {
    if (score >= 80) confidence = "exact";
    else if (score >= 60) confidence = "high";
    else if (score >= 40) confidence = "possible";
    else confidence = "weak";
  }

  // Собираем reason с recommendation если есть
  let reason = String(data.reason || "");
  if (data.recommendation && !reason.includes(data.recommendation)) {
    reason = reason ? `${reason}. ${data.recommendation}` : data.recommendation;
  }

  // Обработка logistics - поддержка обоих форматов
  const logistics = data.logistics || {};
  const deliveryNote = logistics.deliveryNote || logistics.note;

  // Обработка margin/priceAnalysis - поддержка обоих форматов
  const priceData = data.priceAnalysis || data.margin || {};
  const margin = {
    percent: priceData.marginPercent ?? priceData.percent ?? undefined,
    absolute: priceData.absolute ?? undefined,
    note: priceData.priceNote ?? priceData.note ?? undefined,
  };

  return {
    score,
    confidence,
    reason,

    productMatch: {
      score: data.productMatch?.score ?? 0,
      differences: Array.isArray(data.productMatch?.differences)
        ? data.productMatch.differences.map(String)
        : [],
      canSubstitute: Boolean(data.productMatch?.canSubstitute),
    },

    volumeMatch: {
      requested: String(data.volumeMatch?.requested || "не указано"),
      available: String(data.volumeMatch?.available || "не указано"),
      coverage: Number(data.volumeMatch?.coverage) || 0,
      needsAggregation: Boolean(data.volumeMatch?.needsAggregation),
    },

    logistics: {
      sameCity: Boolean(logistics.sameCity),
      sameRegion: Boolean(logistics.sameRegion),
      distance: logistics.distance ?? undefined,
      note: deliveryNote ?? undefined,
    },

    margin: (margin.percent !== undefined || margin.note) ? margin : undefined,

    urgencyMatch: Boolean(data.urgencyMatch),
    freshnessScore: Number(data.freshnessScore) || 50,

    risks: Array.isArray(data.risks) ? data.risks.map(String) : [],
    opportunities: Array.isArray(data.opportunities)
      ? data.opportunities.map(String)
      : [],
  };
}

// Основная функция оценки одной пары
export async function evaluateMatchWithAI(
  request: MatchCard,
  offer: MatchCard,
  modelType: "lite" | "smart" = "lite",
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): Promise<MatchEvaluation> {
  const prompt = buildPrompt(request, offer, config);

  try {
    const response = await chatCompletion(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.3,
        maxTokens: 800,
        model: modelType,
      }
    );

    return parseAIResponse(response);
  } catch (error) {
    console.error("AI evaluation error:", error);

    // Возвращаем базовую оценку при ошибке
    return createFallbackEvaluation(request, offer);
  }
}

// Fallback оценка без AI (простые правила)
function createFallbackEvaluation(
  request: MatchCard,
  offer: MatchCard
): MatchEvaluation {
  let score = 0;
  const differences: string[] = [];
  const risks: string[] = ["ai_error"];

  // Базовая проверка подкатегории
  if (request.subcategoryId && offer.subcategoryId) {
    if (request.subcategoryId === offer.subcategoryId) {
      score += 40;
    } else {
      differences.push("разные подкатегории");
    }
  }

  // Город
  const sameCity =
    request.city && offer.city
      ? request.city.toLowerCase() === offer.city.toLowerCase()
      : false;
  const sameRegion =
    request.region && offer.region
      ? request.region.toLowerCase() === offer.region.toLowerCase()
      : false;

  if (sameCity) score += 20;
  else if (sameRegion) score += 10;

  // Свежесть
  const freshnessScore = Math.round(
    (calculateFreshness(request.createdAt) +
      calculateFreshness(offer.createdAt)) /
      2
  );

  const confidence: MatchConfidence =
    score >= 60 ? "high" : score >= 40 ? "possible" : "weak";

  return {
    score,
    confidence,
    reason: "Автоматическая оценка (AI недоступен)",

    productMatch: {
      score: request.subcategoryId === offer.subcategoryId ? 70 : 30,
      differences,
      canSubstitute: false,
    },

    volumeMatch: {
      requested: request.quantity || "не указано",
      available: offer.quantity || "не указано",
      coverage: 50, // Неизвестно
      needsAggregation: false,
    },

    logistics: {
      sameCity,
      sameRegion,
      distance: undefined,
      note: sameCity ? "Один город" : sameRegion ? "Один регион" : "Разные регионы",
    },

    urgencyMatch: false,
    freshnessScore,

    risks,
    opportunities: [],
  };
}

// Batch оценка нескольких пар
export async function evaluateMatchesBatch(
  pairs: Array<{ request: MatchCard; offer: MatchCard }>,
  modelType: "lite" | "smart" = "lite",
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): Promise<MatchEvaluation[]> {
  const results: MatchEvaluation[] = [];

  for (const pair of pairs) {
    const evaluation = await evaluateMatchWithAI(
      pair.request,
      pair.offer,
      modelType,
      config
    );
    results.push(evaluation);

    // Пауза между запросами чтобы не превысить rate limit
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return results;
}

// Оценка возможности агрегации (несколько офферов для одного запроса)
export async function evaluateAggregation(
  request: MatchCard,
  offers: MatchCard[],
  modelType: "lite" | "smart" = "lite"
): Promise<{
  totalCoverage: number;
  contributions: Array<{ offerId: string; contribution: string; score: number }>;
  evaluation: MatchEvaluation;
}> {
  // Формируем промпт для агрегации
  const offersList = offers
    .map((o, i) => formatCard(o, `ПРОДАВЕЦ ${i + 1}`))
    .join("\n\n");

  const prompt = `Ты эксперт по B2B сделкам. Оцени возможность СОБРАТЬ заказ из нескольких продавцов.

${formatCard(request, "ПОКУПАТЕЛЬ")}

ДОСТУПНЫЕ ПРОДАВЦЫ:
${offersList}

Задача: определи, можно ли собрать нужный объём из этих продавцов.

Ответь JSON:
{
  "totalCoverage": число % от нужного объёма,
  "contributions": [
    {"offerId": "id продавца", "contribution": "5 тн из 10", "score": 0-100}
  ],
  "canFulfill": true/false,
  "reason": "объяснение",
  "risks": ["риск1"],
  "opportunities": ["возможность1"]
}`;

  try {
    const response = await chatCompletion(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.3,
        maxTokens: 600,
        model: modelType,
      }
    );

    const data = JSON.parse(
      response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    );

    return {
      totalCoverage: Number(data.totalCoverage) || 0,
      contributions: Array.isArray(data.contributions)
        ? data.contributions.map((c: Record<string, unknown>) => ({
            offerId: String(c.offerId || ""),
            contribution: String(c.contribution || ""),
            score: Number(c.score) || 0,
          }))
        : [],
      evaluation: {
        score: data.canFulfill ? 70 : 40,
        confidence: data.canFulfill ? "high" : "possible",
        reason: String(data.reason || ""),
        productMatch: { score: 70, differences: [], canSubstitute: true },
        volumeMatch: {
          requested: request.quantity || "",
          available: "сборный",
          coverage: Number(data.totalCoverage) || 0,
          needsAggregation: true,
        },
        logistics: { sameCity: false, sameRegion: false },
        urgencyMatch: false,
        freshnessScore: 50,
        risks: Array.isArray(data.risks) ? data.risks.map(String) : [],
        opportunities: Array.isArray(data.opportunities)
          ? data.opportunities.map(String)
          : [],
      },
    };
  } catch (error) {
    console.error("Aggregation evaluation error:", error);
    return {
      totalCoverage: 0,
      contributions: [],
      evaluation: createFallbackEvaluation(request, offers[0]),
    };
  }
}
