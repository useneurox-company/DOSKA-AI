/**
 * Embeddings Generation Module
 * Генерация векторных представлений для карточек
 * Использует Feature Hashing (локально, без API)
 */

import { VECTOR_SIZE } from "./client";

/**
 * MurmurHash3 - быстрый и равномерный хеш
 * Реализация для строк (32-bit)
 */
function murmurhash3(str: string, seed: number = 0): number {
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  for (let i = 0; i < str.length; i++) {
    let k1 = str.charCodeAt(i);

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }

  h1 ^= str.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/**
 * Токенизация текста
 * Разбивает на слова + создаёт биграммы для контекста
 */
function tokenize(text: string): string[] {
  // Нормализация: lowercase, убираем спецсимволы (сохраняем кириллицу и цифры)
  const normalized = text
    .toLowerCase()
    .replace(/[^\wа-яёА-ЯЁ\s\d]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Разбиваем на слова (минимум 2 символа)
  const words = normalized.split(' ').filter(w => w.length >= 2);

  if (words.length === 0) {
    return [];
  }

  // Униграммы (отдельные слова)
  const unigrams = words;

  // Биграммы (пары слов для контекста)
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`);
  }

  // Триграммы символов для частичного совпадения (опционально)
  const charTrigrams: string[] = [];
  for (const word of words) {
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        charTrigrams.push(`#${word.slice(i, i + 3)}`);
      }
    }
  }

  return [...unigrams, ...bigrams, ...charTrigrams];
}

/**
 * Генерация embedding для одного текста (Feature Hashing)
 * Работает локально, без API
 * Async для совместимости с существующим кодом
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const vector = new Array(VECTOR_SIZE).fill(0);

  // Токенизация
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    // Пустой текст - возвращаем нулевой вектор (нормализованный)
    return vector;
  }

  // Feature Hashing с signed projection
  for (const token of tokens) {
    // Основной хеш определяет позицию
    const hash = murmurhash3(token);
    const index = hash % VECTOR_SIZE;

    // Второй хеш определяет знак (+1 или -1) для уменьшения коллизий
    const signHash = murmurhash3(token, 42);
    const sign = (signHash & 1) ? 1 : -1;

    vector[index] += sign;
  }

  // L2 нормализация (длина вектора = 1)
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

/**
 * Генерация embeddings для нескольких текстов (batch)
 * Для совместимости с существующим API
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(text => generateEmbedding(text)));
}

/**
 * Создание текста для embedding из данных карточки
 * Объединяем все важные поля в один текст
 */
export function createEmbeddingText(cardData: {
  type?: string;
  title?: string;
  subcategory?: string;
  description?: string;
  city?: string;
  quantity?: string;
  price?: number;
  priceUnit?: string;
}): string {
  const parts: string[] = [];

  // Тип (важно для разделения запросов и предложений)
  if (cardData.type) {
    parts.push(cardData.type === "REQUEST" ? "Куплю" : "Продам");
  }

  // Название (главное)
  if (cardData.title) {
    parts.push(cardData.title);
  }

  // Подкатегория
  if (cardData.subcategory) {
    parts.push(cardData.subcategory);
  }

  // Описание
  if (cardData.description) {
    parts.push(cardData.description);
  }

  // Количество
  if (cardData.quantity) {
    parts.push(`Количество: ${cardData.quantity}`);
  }

  // Цена
  if (cardData.price) {
    parts.push(
      `Цена: ${cardData.price}${cardData.priceUnit ? ` ${cardData.priceUnit}` : " руб"}`
    );
  }

  // Город
  if (cardData.city) {
    parts.push(`Город: ${cardData.city}`);
  }

  return parts.join(". ");
}
