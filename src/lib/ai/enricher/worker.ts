/**
 * Воркер обработки сообщений для обогащения
 */

import { chatCompletion } from "../openrouter";
import { buildPrompt, buildUncategorizedPrompt } from "./promptBuilder";
import { EnrichmentJobRegistry } from "./registry";
import { EnrichedCard, RawMessageForEnrichment } from "./types";
import { sanitizeDescription, extractContacts, mergeContacts } from "./sanitizer";
import { upsertCard, isQdrantAvailable, initVectorStorage, CardPayload } from "@/lib/vector";

interface ProcessBatchOptions {
  uncategorized?: boolean;
}

/**
 * Нормализует название подкатегории для поиска дубликатов
 * "Арматура 12мм" -> "арматура"
 * "Труба профильная" -> "труба профильная"
 */
function normalizeSubcategory(name: string): string {
  if (!name) return "прочее";

  // Убираем лишние пробелы, приводим к нижнему регистру
  let normalized = name.trim().toLowerCase();

  // Убираем размеры и числа в конце (12мм, 100х100, d12 и т.д.)
  normalized = normalized.replace(/\s*[\d,.хx×]+\s*(мм|см|м|тн|кг|шт)?\.?\s*$/gi, "");

  // Убираем лишние пробелы
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized || "прочее";
}

/**
 * Находит или создаёт подкатегорию в БД
 * Использует upsert для избежания race condition при параллельном создании
 */
async function findOrCreateSubcategory(
  prisma: any,
  categoryId: string,
  subcategoryName: string
): Promise<{ id: string; name: string }> {
  const normalized = normalizeSubcategory(subcategoryName);
  const trimmedName = subcategoryName.trim();

  // Используем upsert для атомарного создания/обновления
  // Это предотвращает race condition при параллельных запросах
  const subcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_normalized: {
        categoryId,
        normalized,
      },
    },
    update: {
      // Увеличиваем счётчик использования
      usageCount: { increment: 1 },
    },
    create: {
      name: trimmedName,
      normalized,
      categoryId,
      usageCount: 1,
    },
  });

  // Если это новая подкатегория (usageCount === 1), логируем
  if (subcategory.usageCount === 1) {
    console.log(`[Enricher] Новая подкатегория: "${trimmedName}" -> "${normalized}"`);
  }

  return { id: subcategory.id, name: subcategory.name };
}

/**
 * Обрабатывает пакет сообщений для указанного задания
 */
export async function processEnrichmentBatch(
  prisma: any,
  jobId: string,
  options: ProcessBatchOptions = {}
): Promise<void> {
  const { uncategorized = false } = options;

  // Обновляем статус на running
  const job = await prisma.enrichmentJob.update({
    where: { id: jobId },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });

  EnrichmentJobRegistry.update(jobId, { status: "running" });

  const { categoryId, total, batchSize, aiModel } = job;
  const delayMs = 500;
  let processed = 0;

  // Для обычного режима получаем slug категории
  let categorySlug: string | null = null;
  if (!uncategorized && categoryId) {
    const category = await prisma.enrichmentCategory.findUnique({
      where: { id: categoryId },
      select: { slug: true },
    });
    categorySlug = category?.slug;
  }

  try {
    while (processed < total && !EnrichmentJobRegistry.shouldStop(jobId)) {
      // Загружаем пакет сообщений
      const whereCondition = uncategorized
        ? {
            // Режим uncategorized: сообщения БЕЗ категории
            aiMessageType: { in: ["request", "offer"] },
            aiProductCategory: null,
            enrichedAt: null,
          }
        : {
            // Обычный режим: по категории
            aiMessageType: { in: ["request", "offer"] },
            aiProductCategory: categorySlug,
            enrichedAt: null,
          };

      const messages = await prisma.rawMessage.findMany({
        where: whereCondition,
        take: batchSize,
        orderBy: { aiConfidence: "desc" },
        select: {
          id: true,
          text: true,
          aiMessageType: true,
          aiConfidence: true,
          date: true,
          hasMedia: true,
          mediaType: true,
          mediaFileName: true,
          mediaUrl: true,
          source: { select: { name: true } },
        },
      });

      if (messages.length === 0) break;

      // Обрабатываем каждое сообщение
      for (const msg of messages) {
        if (EnrichmentJobRegistry.shouldStop(jobId)) break;

        const text = msg.text?.trim();

        if (!text) {
          // Пропускаем пустые (photo-only)
          await prisma.rawMessage.update({
            where: { id: msg.id },
            data: {
              enrichedAt: new Date(),
              enrichedData: JSON.stringify({ skipped: true, reason: "no_text" }),
            },
          });
          await updateJobProgress(prisma, jobId, { skipped: 1 });
          processed++;
          continue;
        }

        try {
          // Строим промпт (разный для uncategorized и обычного режима)
          const prompt = uncategorized
            ? await buildUncategorizedPrompt(prisma, {
                text,
                messageType: msg.aiMessageType as "request" | "offer",
                hasMedia: msg.hasMedia,
                mediaType: msg.mediaType,
                mediaFileName: msg.mediaFileName,
              })
            : await buildPrompt(prisma, categoryId, {
                text,
                messageType: msg.aiMessageType as "request" | "offer",
                hasMedia: msg.hasMedia,
                mediaType: msg.mediaType,
                mediaFileName: msg.mediaFileName,
              });

          // Вызываем AI
          const response = await chatCompletion(
            [{ role: "user", content: prompt }],
            { model: aiModel as "lite" | "smart", temperature: 0.1 }
          );

          // Парсим ответ
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No JSON in response");
          }

          const parsed = JSON.parse(jsonMatch[0]);

          // Для uncategorized режима - определяем категорию из ответа AI
          let resolvedCategoryId = categoryId;
          let resolvedProductCategory = categorySlug;

          if (uncategorized) {
            const detectedSlug = parsed.productCategory || "construction";
            const detectedCategory = await prisma.enrichmentCategory.findFirst({
              where: { slug: detectedSlug, isActive: true },
            });

            if (detectedCategory) {
              resolvedCategoryId = detectedCategory.id;
              resolvedProductCategory = detectedSlug;
              console.log(`[Enricher] Определена категория: ${detectedSlug} для ${msg.id}`);
            } else {
              // Fallback на construction
              const fallbackCategory = await prisma.enrichmentCategory.findFirst({
                where: { slug: "construction", isActive: true },
              });
              if (fallbackCategory) {
                resolvedCategoryId = fallbackCategory.id;
                resolvedProductCategory = "construction";
              }
            }
          }

          // Санитизация: извлекаем контакты из description
          const extractedFromDesc = extractContacts(parsed.description);
          const cleanDescription = sanitizeDescription(parsed.description);
          const mergedContacts = mergeContacts(parsed.contacts, extractedFromDesc);

          // Находим или создаём подкатегорию
          const subcategoryData = await findOrCreateSubcategory(
            prisma,
            resolvedCategoryId,
            parsed.subcategory || "Прочее"
          );

          // Формируем карточку
          const card: EnrichedCard = {
            rawMessageId: msg.id,
            type: msg.aiMessageType === "request" ? "REQUEST" : "OFFER",
            category: parsed.category || "Прочее",
            subcategory: subcategoryData.name,
            subcategoryId: subcategoryData.id,
            title: parsed.title || text.substring(0, 60),
            items: parsed.items || [],
            services: parsed.services,
            description: cleanDescription,
            price: parsed.price,
            city: parsed.city,
            region: parsed.region,
            contacts: mergedContacts,
            company: parsed.company,
            urgency: parsed.urgency,
            date: msg.date,
            sourceGroup: msg.source.name,
            mediaFiles:
              msg.hasMedia && msg.mediaFileName ? [msg.mediaFileName] : [],
            enrichedAt: new Date(),
            aiModel: aiModel === "smart" ? "gemini-3-flash" : "gemini-2.5-flash-lite",
            confidence: msg.aiConfidence || 0,
            enrichmentCategoryId: resolvedCategoryId,
          };

          // Сохраняем результат
          await prisma.rawMessage.update({
            where: { id: msg.id },
            data: {
              enrichedAt: new Date(),
              enrichedData: JSON.stringify(card),
              enrichmentCategoryId: resolvedCategoryId,
              enrichmentJobId: jobId,
              // Для uncategorized режима - обновляем aiProductCategory
              ...(uncategorized && resolvedProductCategory
                ? { aiProductCategory: resolvedProductCategory }
                : {}),
            },
          });

          // Сохраняем в векторную базу (если доступна)
          try {
            if (await isQdrantAvailable()) {
              const vectorPayload: Omit<CardPayload, "id" | "enrichedAt"> = {
                type: card.type as "REQUEST" | "OFFER",
                title: card.title,
                subcategory: card.subcategory,
                subcategoryId: card.subcategoryId,
                categoryId: resolvedCategoryId,
                city: card.city,
                region: card.region,
                price: card.price?.value ?? undefined,
                priceUnit: card.price?.per ?? undefined,
                quantity: card.items?.[0]?.quantity,
                description: card.description,
                contacts: card.contacts,
                sourceId: msg.source?.name,
              };
              await upsertCard(msg.id, vectorPayload, new Date());
            }
          } catch (vectorError) {
            console.error(`[Enricher] Vector save error for ${msg.id}:`, vectorError);
          }

          await updateJobProgress(prisma, jobId, { enriched: 1 });
          console.log(`[Enricher] ✓ ${card.type}: "${card.title}"${uncategorized ? ` [${resolvedProductCategory}]` : ""}`);
        } catch (error) {
          console.error(`[Enricher] Error for ${msg.id}:`, error);

          // Помечаем сообщение как обработанное с ошибкой, чтобы не зацикливаться
          await prisma.rawMessage.update({
            where: { id: msg.id },
            data: {
              enrichedAt: new Date(),
              enrichedData: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
                skipped: true,
                reason: "enrichment_failed",
              }),
            },
          });

          await updateJobProgress(prisma, jobId, { errors: 1 });
        }

        processed++;
        await updateJobProgress(prisma, jobId, { processed: 1 });
      }

      // Пауза между пакетами
      if (processed < total && !EnrichmentJobRegistry.shouldStop(jobId)) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Завершаем задание
    const finalStatus = EnrichmentJobRegistry.shouldStop(jobId)
      ? "stopped"
      : "completed";

    await prisma.enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        stoppedAt: new Date(),
      },
    });

    EnrichmentJobRegistry.update(jobId, { status: finalStatus as any });
  } catch (error) {
    console.error(`[Enricher] Job ${jobId} error:`, error);

    await prisma.enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        stoppedAt: new Date(),
      },
    });

    EnrichmentJobRegistry.update(jobId, { status: "error" });
  } finally {
    // Через некоторое время удаляем из реестра
    setTimeout(() => {
      EnrichmentJobRegistry.unregister(jobId);
    }, 60000); // 1 минута
  }
}

/**
 * Атомарно обновляет прогресс задания
 */
async function updateJobProgress(
  prisma: any,
  jobId: string,
  increment: {
    processed?: number;
    enriched?: number;
    skipped?: number;
    errors?: number;
  }
): Promise<void> {
  await prisma.enrichmentJob.update({
    where: { id: jobId },
    data: {
      processed: increment.processed ? { increment: increment.processed } : undefined,
      enriched: increment.enriched ? { increment: increment.enriched } : undefined,
      skipped: increment.skipped ? { increment: increment.skipped } : undefined,
      errors: increment.errors ? { increment: increment.errors } : undefined,
    },
  });
}

/**
 * Обогащает одно сообщение (для тестирования)
 */
export async function enrichSingleMessage(
  prisma: any,
  categoryId: string,
  message: RawMessageForEnrichment
): Promise<EnrichedCard | null> {
  const text = message.text?.trim();

  if (!text) {
    console.log(`[Enricher] Пропуск: пустой текст (id: ${message.id})`);
    return null;
  }

  const prompt = await buildPrompt(prisma, categoryId, {
    text,
    messageType: message.aiMessageType,
    hasMedia: message.hasMedia,
    mediaType: message.mediaType,
    mediaFileName: message.mediaFileName,
  });

  try {
    const response = await chatCompletion(
      [{ role: "user", content: prompt }],
      { model: "smart", temperature: 0.1 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[Enricher] Не удалось найти JSON в ответе`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Санитизация: извлекаем контакты из description и удаляем их
    const extractedFromDesc = extractContacts(parsed.description);
    const cleanDescription = sanitizeDescription(parsed.description);
    const mergedContacts = mergeContacts(parsed.contacts, extractedFromDesc);

    // Находим или создаём подкатегорию в справочнике
    const subcategoryData = await findOrCreateSubcategory(
      prisma,
      categoryId,
      parsed.subcategory || "Прочее"
    );

    const card: EnrichedCard = {
      rawMessageId: message.id,
      type: message.aiMessageType === "request" ? "REQUEST" : "OFFER",
      category: parsed.category || "Прочее",
      subcategory: subcategoryData.name,
      subcategoryId: subcategoryData.id,
      title: parsed.title || text.substring(0, 60),
      items: parsed.items || [],
      services: parsed.services,
      description: cleanDescription,
      price: parsed.price,
      city: parsed.city,
      region: parsed.region,
      contacts: mergedContacts,
      company: parsed.company,
      urgency: parsed.urgency,
      date: message.date,
      sourceGroup: message.source.name,
      mediaFiles:
        message.hasMedia && message.mediaFileName ? [message.mediaFileName] : [],
      enrichedAt: new Date(),
      aiModel: "gemini-3-flash",
      confidence: message.aiConfidence || 0,
      enrichmentCategoryId: categoryId,
    };

    console.log(`[Enricher] ✓ ${card.type}: "${card.title}"`);
    return card;
  } catch (error) {
    console.error(`[Enricher] Ошибка обогащения:`, error);
    return null;
  }
}
