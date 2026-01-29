/**
 * CRM Module Types
 * Типы для гибкого матчинга заявок и предложений
 */

// Карточка для матчинга (обогащённые данные)
export interface MatchCard {
  id: string;
  type: "REQUEST" | "OFFER";
  title: string;
  subcategory?: string;
  subcategoryId?: string;
  city?: string;
  region?: string;
  price?: number;
  priceUnit?: string;
  quantity?: string;
  quantityNum?: number; // Числовое значение для агрегации
  quantityUnit?: string; // тн, шт, м и т.д.
  description?: string;
  contacts?: {
    phone?: string;
    username?: string;
    name?: string;
  };
  categoryId?: string;
  categorySlug?: string;
  enrichedAt?: Date;
  createdAt?: Date; // Для расчёта свежести
}

// Уровень уверенности в матче
export type MatchConfidence = "exact" | "high" | "possible" | "weak";

// Результат AI оценки матча (расширенный)
export interface MatchEvaluation {
  score: number;           // 0-100 шанс сделки
  confidence: MatchConfidence; // Уровень уверенности
  reason: string;          // почему матч хороший/плохой

  // Детальный анализ продукта
  productMatch: {
    score: number;         // 0-100 совпадение продукта
    differences: string[]; // различия (другой ГОСТ, размер и т.д.)
    canSubstitute: boolean; // можно заменить?
  };

  // Анализ объёма
  volumeMatch: {
    requested: string;     // что хотят
    available: string;     // что есть
    coverage: number;      // % покрытия (может быть >100%)
    needsAggregation: boolean; // нужна сборка из нескольких?
  };

  // Логистика
  logistics: {
    sameCity: boolean;
    sameRegion: boolean;
    distance?: string;     // примерное расстояние
    note?: string;         // комментарий по доставке
  };

  // Маржа
  margin?: {
    percent?: number;
    absolute?: number;
    note?: string;
  };

  // Дополнительные факторы
  urgencyMatch: boolean;   // совпадает срочность
  freshnessScore: number;  // 0-100 свежесть объявлений

  risks: string[];
  opportunities: string[]; // возможности (скидка за объём и т.д.)
}

// Кандидат на матч (после фильтрации)
export interface MatchCandidate {
  request: MatchCard;
  offer: MatchCard;
  sqlScore: number;
  vectorScore?: number;    // Cosine similarity из Qdrant
  freshnessScore?: number; // Бонус за свежесть
}

// Полный матч с AI оценкой
export interface FullMatch extends MatchCandidate {
  evaluation: MatchEvaluation;
}

// Агрегированный матч (несколько OFFER для одного REQUEST)
export interface AggregatedMatch {
  request: MatchCard;
  offers: Array<{
    offer: MatchCard;
    contribution: string;  // "5 тн из 10"
    score: number;
  }>;
  totalCoverage: number;   // % покрытия объёма
  evaluation: MatchEvaluation;
}

// Результат матчинга с группировкой по уверенности
export interface MatchingResults {
  exact: FullMatch[];      // Точные совпадения (80-100)
  high: FullMatch[];       // Высокая вероятность (60-79)
  possible: FullMatch[];   // Возможные варианты (40-59)
  aggregated: AggregatedMatch[]; // Сборные (из нескольких офферов)
}

// Статусы матча
export type MatchStatus = "new" | "contacted" | "deal" | "rejected";

// Фильтры для API
export interface MatchFilters {
  status?: MatchStatus;
  minScore?: number;
  confidence?: MatchConfidence;
  categoryId?: string;
  includePossible?: boolean; // включать "возможные" варианты
  limit?: number;
  offset?: number;
}

// Результат поиска матчей
export interface MatchResult {
  jobId: string;
  total: number;
  processed: number;
  found: {
    exact: number;
    high: number;
    possible: number;
    aggregated: number;
  };
  status: "pending" | "running" | "completed" | "error";
  error?: string;
}

// Настройки матчинга
export interface MatchingConfig {
  // Продукт
  allowSimilarGost: boolean;      // разрешить похожие ГОСТы
  allowSizeTolerance: number;     // допуск по размеру в %

  // Объём
  allowAggregation: boolean;      // собирать из нескольких
  minCoveragePercent: number;     // минимальное покрытие %

  // Логистика
  includeAllRegions: boolean;     // показывать из других регионов

  // Срочность
  urgencyWeight: number;          // вес срочности 0-1

  // Свежесть
  freshnessWeight: number;        // вес свежести 0-1
  freshDays: number;              // сколько дней считается "свежим"
}

// Дефолтные настройки
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  allowSimilarGost: true,
  allowSizeTolerance: 10,
  allowAggregation: true,
  minCoveragePercent: 50,
  includeAllRegions: true,
  urgencyWeight: 0.3,
  freshnessWeight: 0.5,
  freshDays: 7,
};
