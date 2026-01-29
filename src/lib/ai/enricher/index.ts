/**
 * Модуль обогащения сообщений (Stage 2)
 * Публичный API
 */

// Типы
export type {
  EnrichedCard,
  EnrichedItem,
  Price,
  Contacts,
  RawMessageForEnrichment,
  PromptContext,
  JobState,
  StartJobOptions,
} from "./types";

// Job Manager
export {
  startEnrichmentJob,
  stopEnrichmentJob,
  stopAllJobs,
  getActiveJobs,
  getJobHistory,
  getJob,
  getEnrichmentStats,
} from "./jobManager";

// Worker (для тестирования)
export { enrichSingleMessage } from "./worker";

// Registry (для отладки)
export { EnrichmentJobRegistry } from "./registry";

// Prompt Builder (для тестирования)
export { buildPrompt, getBasePrompt } from "./promptBuilder";
