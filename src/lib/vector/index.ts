/**
 * Vector Module - экспорт всех функций
 */

// Client
export { getQdrantClient, initCollection, isQdrantAvailable } from "./client";

// Embeddings
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  createEmbeddingText,
} from "./embeddings";

// Storage
export {
  upsertCard,
  upsertCardsBatch,
  searchSimilar,
  findMatchingOffers,
  findMatchingRequests,
  deleteCard,
  getCollectionStats,
  initVectorStorage,
} from "./storage";

// Types
export type { CardPayload } from "./storage";
