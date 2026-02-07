/**
 * AI Enricher для Avito объявлений
 * Извлекает структурированные данные из title + description
 */

import { PrismaClient } from "@prisma/client";
import { chatCompletion } from "@/lib/ai/openrouter";

// Промпт для обогащения Avito объявлений
const AVITO_ENRICHMENT_PROMPT = `Извлеки структурированные данные из объявления о продаже металлопроката.

ОБЪЯВЛЕНИЕ:
Заголовок: {title}
Описание: {description}
Цена: {price}
Город: {city}

Извлеки и верни JSON:
{
  "nomenclature": "тип товара (Труба, Балка, Лист, Швеллер, Уголок, Круг, Арматура и т.д.)",
  "material": "марка стали или материал (09Г2С, Ст3, 12Х18Н10Т, ст20 и т.д.)",
  "dimensions": "размеры (например: 219x8, 100x100x6, 12мм и т.д.)",
  "weight": "вес или количество если указано (5 тонн, 100 метров и т.д.)",
  "condition": "состояние (новая, б/у, лежалая, восстановленная, с хранения)",
  "phone": "телефон из описания если есть (в формате +7XXXXXXXXXX или 8XXXXXXXXXX)",
  "pricePerUnit": "цена за единицу если указана (руб/тн, руб/м, руб/шт)"
}

ВАЖНО:
- Если данные не указаны, ставь null
- Номенклатуру определяй КРАТКО — одно-два слова (например: "Труба профильная", "Арматура", "Швеллер"). НЕ перечисляй весь ассортимент!
- Размеры — укажи ОСНОВНОЙ размер или диапазон кратко (например: "20x20-200x200", "159x6"). НЕ перечисляй все размеры!
- Марку стали пиши заглавными буквами
- Все значения должны быть СТРОКАМИ (не массивами!)
- Верни ТОЛЬКО JSON без комментариев`;

interface EnrichmentResult {
  nomenclature: string | null;
  material: string | null;
  dimensions: string | null;
  weight: string | null;
  condition: string | null;
  phone: string | null;
  pricePerUnit: string | null;
}

interface EnrichmentJobState {
  id: string;
  status: "running" | "completed" | "stopped" | "error";
  total: number;
  processed: number;
  enriched: number;
  errors: number;
  startedAt: Date;
  stoppedAt?: Date;
  errorMessage?: string;
}

// Текущая задача обогащения
let currentJob: EnrichmentJobState | null = null;
let shouldStop = false;

/**
 * Обогатить одно объявление
 */
async function enrichAd(
  ad: { id: string; title: string; description: string | null; price: number | null; city: string | null }
): Promise<EnrichmentResult | null> {
  const prompt = AVITO_ENRICHMENT_PROMPT
    .replace("{title}", ad.title)
    .replace("{description}", ad.description || "не указано")
    .replace("{price}", ad.price ? `${ad.price} руб` : "не указана")
    .replace("{city}", ad.city || "не указан");

  try {
    // chatCompletion ожидает массив сообщений
    const messages = [{ role: "user" as const, content: prompt }];
    const response = await chatCompletion(messages, { model: "smart" });

    // Парсим JSON из ответа
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Avito Enricher] Не удалось найти JSON в ответе:", response.slice(0, 200));
      return null;
    }

    const result = JSON.parse(jsonMatch[0]) as EnrichmentResult;
    return result;
  } catch (error) {
    console.error("[Avito Enricher] Ошибка:", error);
    return null;
  }
}

/**
 * Запустить обогащение для необогащённых объявлений
 */
export async function startAvitoEnrichment(
  prisma: PrismaClient,
  options: {
    sourceId?: string;
    limit?: number | "all";
    batchSize?: number;
  } = {}
): Promise<string> {
  if (currentJob && currentJob.status === "running") {
    throw new Error("Обогащение уже запущено");
  }

  shouldStop = false;
  const limit = options.limit === "all" ? undefined : (options.limit || 50);
  const batchSize = options.batchSize || 3;

  // Получаем необогащённые объявления
  const where: any = {
    enrichedAt: null,
  };
  if (options.sourceId) {
    where.sourceId = options.sourceId;
  }

  const ads = await prisma.avitoAd.findMany({
    where,
    take: limit,
    orderBy: { parsedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      city: true,
    },
  });

  const jobId = Date.now().toString();
  currentJob = {
    id: jobId,
    status: "running",
    total: ads.length,
    processed: 0,
    enriched: 0,
    errors: 0,
    startedAt: new Date(),
  };

  // Запускаем обогащение в фоне
  (async () => {
    try {
      for (let i = 0; i < ads.length; i += batchSize) {
        if (shouldStop) {
          currentJob!.status = "stopped";
          currentJob!.stoppedAt = new Date();
          break;
        }

        const batch = ads.slice(i, i + batchSize);

        // Обрабатываем батч параллельно
        const results = await Promise.all(
          batch.map(async (ad) => {
            const result = await enrichAd(ad);
            return { ad, result };
          })
        );

        // Сохраняем результаты
        for (const { ad, result } of results) {
          currentJob!.processed++;

          if (result) {
            try {
              // AI может вернуть массив вместо строки — приводим к строке
              const toStr = (v: unknown): string | null => {
                if (v == null) return null;
                if (Array.isArray(v)) return v.join(", ");
                return String(v);
              };
              await prisma.avitoAd.update({
                where: { id: ad.id },
                data: {
                  enrichedAt: new Date(),
                  enrichedData: JSON.stringify(result),
                  aiNomenclature: toStr(result.nomenclature),
                  aiMaterial: toStr(result.material),
                  aiDimensions: toStr(result.dimensions),
                  aiWeight: toStr(result.weight),
                  aiCondition: toStr(result.condition),
                  aiPhone: toStr(result.phone),
                  aiPricePerUnit: toStr(result.pricePerUnit),
                },
              });
              currentJob!.enriched++;
              console.log(`[Avito Enricher] ✓ ${ad.title.slice(0, 50)} → ${result.nomenclature || "?"}`);
            } catch (dbError) {
              console.error(`[Avito Enricher] DB Error для "${ad.title}":`, dbError);
              currentJob!.errors++;
            }
          } else {
            console.error(`[Avito Enricher] AI вернул null для "${ad.title}"`);
            currentJob!.errors++;
          }
        }

        // Небольшая задержка между батчами
        await new Promise((r) => setTimeout(r, 500));
      }

      if (currentJob!.status === "running") {
        currentJob!.status = "completed";
        currentJob!.stoppedAt = new Date();
      }
    } catch (error) {
      currentJob!.status = "error";
      currentJob!.errorMessage = error instanceof Error ? error.message : "Unknown error";
      currentJob!.stoppedAt = new Date();
    }
  })();

  return jobId;
}

/**
 * Остановить текущее обогащение
 */
export function stopAvitoEnrichment(): void {
  shouldStop = true;
}

/**
 * Получить статус текущей задачи
 */
export function getAvitoEnrichmentJob(): EnrichmentJobState | null {
  return currentJob;
}

/**
 * Очистить завершённую задачу
 */
export function clearAvitoEnrichmentJob(): void {
  if (currentJob && currentJob.status !== "running") {
    currentJob = null;
  }
}

/**
 * Получить статистику обогащения
 */
export async function getAvitoEnrichmentStats(
  prisma: PrismaClient,
  sourceId?: string
): Promise<{
  total: number;
  enriched: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const where: any = sourceId ? { sourceId } : {};

  const [total, enriched, pending, approved, rejected] = await Promise.all([
    prisma.avitoAd.count({ where }),
    prisma.avitoAd.count({ where: { ...where, enrichedAt: { not: null } } }),
    prisma.avitoAd.count({ where: { ...where, enrichedAt: null } }),
    prisma.avitoAd.count({ where: { ...where, moderationStatus: "approved" } }),
    prisma.avitoAd.count({ where: { ...where, moderationStatus: "rejected" } }),
  ]);

  return { total, enriched, pending, approved, rejected };
}
