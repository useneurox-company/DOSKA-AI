/**
 * Vector Storage - операции с Qdrant
 * Сохранение и поиск карточек в векторной базе
 */

import { getQdrantClient, COLLECTION_NAME, initCollection } from "./client";
import { generateEmbedding, createEmbeddingText } from "./embeddings";

/**
 * Конвертирует string ID в UUID формат для Qdrant
 * Используем детерминистичный хеш для консистентности
 */
function stringToUuid(str: string): string {
  // Простой хеш строки в hex
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Генерируем детерминистичный UUID-like строку
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const strHash = str.split('').reduce((acc, char, i) => {
    return acc + char.charCodeAt(0) * (i + 1);
  }, 0);
  const hex2 = Math.abs(strHash).toString(16).padStart(12, '0');

  // Формат UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return `${hex.slice(0, 8)}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-8${hex2.slice(7, 10)}-${str.slice(0, 12).split('').map(c => c.charCodeAt(0).toString(16).slice(-2)).join('').padEnd(12, '0').slice(0, 12)}`;
}

// Payload карточки в Qdrant
export interface CardPayload {
  id: string;                    // ID из PostgreSQL (RawMessage.id)
  type: "REQUEST" | "OFFER";
  title: string;
  subcategory?: string;
  subcategoryId?: string;
  categoryId?: string;
  city?: string;
  region?: string;
  price?: number;
  priceUnit?: string;
  quantity?: string;
  description?: string;
  contacts?: {
    name?: string;
    username?: string;
    phone?: string;
  };
  sourceId?: string;
  enrichedAt: string;            // ISO date
}

/**
 * Сохранить карточку в векторную базу
 */
export async function upsertCard(
  cardId: string,
  cardData: Omit<CardPayload, "id" | "enrichedAt">,
  enrichedAt: Date = new Date()
): Promise<void> {
  const qdrant = getQdrantClient();

  // Создаём текст для embedding
  const embeddingText = createEmbeddingText(cardData);

  // Генерируем embedding
  const embedding = await generateEmbedding(embeddingText);

  // Payload для хранения
  const payload: CardPayload = {
    id: cardId,
    ...cardData,
    enrichedAt: enrichedAt.toISOString(),
  };

  // Сохраняем в Qdrant (конвертируем cardId в UUID формат)
  const pointId = stringToUuid(cardId);
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: pointId,
        vector: embedding,
        payload: payload as unknown as Record<string, unknown>,
      },
    ],
  });
}

/**
 * Batch сохранение карточек
 */
export async function upsertCardsBatch(
  cards: Array<{
    id: string;
    data: Omit<CardPayload, "id" | "enrichedAt">;
    enrichedAt?: Date;
  }>
): Promise<number> {
  if (cards.length === 0) return 0;

  const qdrant = getQdrantClient();

  // Генерируем embeddings batch
  const texts = cards.map((c) => createEmbeddingText(c.data));

  // Импортируем batch функцию
  const { generateEmbeddingsBatch } = await import("./embeddings");
  const embeddings = await generateEmbeddingsBatch(texts);

  // Формируем points (конвертируем ID в UUID)
  const points = cards.map((card, idx) => ({
    id: stringToUuid(card.id),
    vector: embeddings[idx],
    payload: {
      id: card.id, // Оригинальный ID в payload
      ...card.data,
      enrichedAt: (card.enrichedAt || new Date()).toISOString(),
    } as unknown as Record<string, unknown>,
  }));

  // Сохраняем в Qdrant
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  return cards.length;
}

/**
 * Поиск похожих карточек
 */
export async function searchSimilar(
  query: string | number[], // текст или готовый embedding
  options: {
    type?: "REQUEST" | "OFFER";
    categoryId?: string;
    city?: string;
    limit?: number;
    scoreThreshold?: number;
  } = {}
): Promise<Array<CardPayload & { score: number }>> {
  const qdrant = getQdrantClient();
  // Feature Hashing scores гораздо ниже чем у ML моделей (0.01-0.1 vs 0.5-0.9)
  const { type, categoryId, city, limit = 10, scoreThreshold = 0.01 } = options;

  // Если передан текст - генерируем embedding
  let queryVector: number[];
  if (typeof query === "string") {
    queryVector = await generateEmbedding(query);
  } else {
    queryVector = query;
  }

  // Строим фильтры
  const must: Array<{ key: string; match: { value: string } }> = [];

  if (type) {
    must.push({ key: "type", match: { value: type } });
  }
  if (categoryId) {
    must.push({ key: "categoryId", match: { value: categoryId } });
  }
  if (city) {
    must.push({ key: "city", match: { value: city } });
  }

  // Поиск
  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    limit,
    score_threshold: scoreThreshold,
    filter: must.length > 0 ? { must } : undefined,
    with_payload: true,
  });

  return results.map((r) => ({
    ...(r.payload as unknown as CardPayload),
    score: r.score,
  }));
}

/**
 * Найти OFFER карточки похожие на REQUEST
 */
export async function findMatchingOffers(
  requestCard: CardPayload,
  options: {
    limit?: number;
    scoreThreshold?: number;
  } = {}
): Promise<Array<CardPayload & { score: number }>> {
  const embeddingText = createEmbeddingText(requestCard);

  return searchSimilar(embeddingText, {
    type: "OFFER",
    categoryId: requestCard.categoryId,
    // city: requestCard.city, // Опционально - можно искать в любом городе
    limit: options.limit || 20,
    scoreThreshold: options.scoreThreshold || 0.01, // Feature Hashing
  });
}

/**
 * Найти REQUEST карточки похожие на OFFER
 */
export async function findMatchingRequests(
  offerCard: CardPayload,
  options: {
    limit?: number;
    scoreThreshold?: number;
  } = {}
): Promise<Array<CardPayload & { score: number }>> {
  const embeddingText = createEmbeddingText(offerCard);

  return searchSimilar(embeddingText, {
    type: "REQUEST",
    categoryId: offerCard.categoryId,
    limit: options.limit || 20,
    scoreThreshold: options.scoreThreshold || 0.01, // Feature Hashing
  });
}

/**
 * Удалить карточку из векторной базы
 */
export async function deleteCard(cardId: string): Promise<void> {
  const qdrant = getQdrantClient();
  await qdrant.delete(COLLECTION_NAME, {
    wait: true,
    points: [stringToUuid(cardId)],
  });
}

/**
 * Получить статистику коллекции
 */
export async function getCollectionStats(): Promise<{
  vectorsCount: number;
  pointsCount: number;
}> {
  const qdrant = getQdrantClient();
  const info = await qdrant.getCollection(COLLECTION_NAME);

  return {
    vectorsCount: info.indexed_vectors_count || 0,
    pointsCount: info.points_count || 0,
  };
}

/**
 * Инициализация (вызывать при старте)
 */
export async function initVectorStorage(): Promise<boolean> {
  try {
    await initCollection();
    return true;
  } catch (error) {
    console.error("Failed to init vector storage:", error);
    return false;
  }
}
