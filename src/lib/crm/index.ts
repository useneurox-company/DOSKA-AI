/**
 * CRM Module - Гибкий матчинг заявок и предложений
 *
 * Особенности:
 * 1. Похожие товары (опечатки, синонимы, близкие ГОСТы)
 * 2. Агрегация объёмов (сборка из нескольких продавцов)
 * 3. Логистика как опция (показываем все, отмечаем расстояние)
 * 4. Срочность как фактор (не главный)
 * 5. Приоритет свежим объявлениям
 */

// Типы
export * from "./types";

// Матчинг
export {
  findCandidates,
  findCandidatesWithVectors,
  evaluateCandidates,
  findAggregatedMatches,
  saveMatches,
  runMatching,
} from "./matcher";

// AI оценка
export {
  evaluateMatchWithAI,
  evaluateMatchesBatch,
  evaluateAggregation,
} from "./ai-evaluator";
