/**
 * Qdrant Vector Database Client
 * Локальная векторная база для быстрого поиска похожих карточек
 */

import { QdrantClient } from "@qdrant/js-client-rest";

// Конфигурация
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION_NAME = "cards";
const VECTOR_SIZE = 768; // Feature Hashing (локальные эмбеддинги)

// Singleton клиент
let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({ url: QDRANT_URL });
  }
  return client;
}

// Инициализация коллекции
export async function initCollection(): Promise<void> {
  const qdrant = getQdrantClient();

  try {
    // Проверяем существует ли коллекция
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    // Проверяем размер вектора если коллекция существует
    if (exists) {
      const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
      const currentSize = collectionInfo.config?.params?.vectors;
      const vectorSize = typeof currentSize === 'object' && 'size' in currentSize
        ? currentSize.size
        : undefined;

      if (vectorSize && vectorSize !== VECTOR_SIZE) {
        console.log(`Vector size mismatch: collection has ${vectorSize}, expected ${VECTOR_SIZE}. Recreating...`);
        await qdrant.deleteCollection(COLLECTION_NAME);
        // После удаления будет создана заново ниже
      } else {
        return; // Коллекция существует и имеет правильный размер
      }
    }

    // Создаём коллекцию (если не существует или была удалена)
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      on_disk_payload: true,
    });

    // Создаём индексы для фильтрации
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "type",
      field_schema: "keyword",
    });

    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "categoryId",
      field_schema: "keyword",
    });

    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "subcategoryId",
      field_schema: "keyword",
    });

    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "city",
      field_schema: "keyword",
    });

    console.log(`Created Qdrant collection: ${COLLECTION_NAME} with vector size ${VECTOR_SIZE}`);
  } catch (error) {
    console.error("Failed to init Qdrant collection:", error);
    throw error;
  }
}

// Проверка доступности Qdrant
export async function isQdrantAvailable(): Promise<boolean> {
  try {
    const qdrant = getQdrantClient();
    await qdrant.getCollections();
    return true;
  } catch {
    return false;
  }
}

export { COLLECTION_NAME, VECTOR_SIZE };
