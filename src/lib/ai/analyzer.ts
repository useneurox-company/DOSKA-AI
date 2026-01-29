/**
 * Message Analyzer
 * Анализирует сообщения из Telegram с помощью AI
 */

import { prisma } from "@/lib/prisma";
import { analyzeText, analyzeImage, AnalysisResult } from "./openrouter";
import { aggregateToRequest } from "./aggregator";
import {
  parseExcelFile,
  determineExcelRequestType,
  summarizeNomenclature,
  ExcelItem,
} from "./excel-parser";
import { downloadMediaForMessage } from "@/lib/telegram/downloader";
import * as fs from "fs";
import * as path from "path";
import { RawMessage } from "@prisma/client";

// Окно времени для связывания фото с заявкой (минуты)
const PHOTO_LINK_WINDOW_MINUTES = 10;

/**
 * Получить контекст разговора (сообщения от ВСЕХ участников чата)
 * Это помогает AI понять:
 * - Это продолжение заявки или спор/обсуждение?
 * - Контекст диалога (кто что сказал)
 */
async function getMessageContext(message: RawMessage): Promise<string> {
  if (!message.text) {
    return message.text || '';
  }

  // Окно контекста: 5 минут до и после сообщения
  const windowBefore = new Date(message.date.getTime() - 5 * 60 * 1000);
  const windowAfter = new Date(message.date.getTime() + 2 * 60 * 1000);

  // Получаем сообщения от ВСЕХ участников чата (не только от отправителя)
  const surroundingMessages = await prisma.rawMessage.findMany({
    where: {
      sourceId: message.sourceId,
      date: {
        gte: windowBefore,
        lte: windowAfter,
      },
      text: { not: null },
    },
    orderBy: { date: 'asc' },
    take: 15, // До 15 сообщений для контекста
    select: {
      id: true,
      text: true,
      senderName: true,
      senderId: true,
      hasMedia: true,
      mediaType: true,
      date: true,
    },
  });

  // Если только одно сообщение - возвращаем его с пометкой о фото
  if (surroundingMessages.length <= 1) {
    let currentText = message.text;
    if (message.hasMedia && message.mediaType === 'photo') {
      currentText += ' [+ прикреплено фото материала]';
    }
    return currentText;
  }

  // Формируем контекст разговора с именами отправителей
  const contextParts: string[] = [];
  let currentMessageIncluded = false;

  for (const msg of surroundingMessages) {
    const isCurrentMessage = msg.id === message.id;
    const senderLabel = msg.senderName || 'Участник';

    let text = msg.text || '';
    if (msg.hasMedia && msg.mediaType === 'photo') {
      text += text ? ' [+ фото]' : '[фото]';
    }

    if (isCurrentMessage) {
      // Помечаем текущее сообщение для AI
      contextParts.push(`>>> ${senderLabel}: ${text} <<<`);
      currentMessageIncluded = true;
    } else {
      contextParts.push(`${senderLabel}: ${text}`);
    }
  }

  // Если текущее сообщение не попало в выборку - добавляем
  if (!currentMessageIncluded) {
    const senderLabel = message.senderName || 'Участник';
    let text = message.text;
    if (message.hasMedia && message.mediaType === 'photo') {
      text += ' [+ фото]';
    }
    contextParts.push(`>>> ${senderLabel}: ${text} <<<`);
  }

  const uniqueSenders = new Set(surroundingMessages.map(m => m.senderId)).size;
  console.log(`[Analyzer] Контекст чата: ${surroundingMessages.length} сообщений от ${uniqueSenders} участников`);

  return contextParts.join('\n');
}

interface AnalyzeOptions {
  includeMedia?: boolean;  // Анализировать ли медиа
  batchSize?: number;      // Размер пакета
  delayMs?: number;        // Задержка между запросами
  sourceIds?: string[];    // Фильтр по источникам
  count?: number | "all";  // Количество для анализа или "all"
}

interface BatchResult {
  total: number;
  analyzed: number;
  errors: number;
  results: { id: string; success: boolean; error?: string }[];
}

/**
 * Проверить, является ли сообщение Excel файлом
 */
function isExcelFile(message: RawMessage): boolean {
  if (message.mediaType !== "document") return false;

  const fileName = message.mediaFileName?.toLowerCase() || "";
  return fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
}

/**
 * Обработать Excel файл - создать заявку с позициями
 */
async function handleExcelMessage(
  message: RawMessage
): Promise<{ success: boolean; error?: string }> {
  if (!message.mediaUrl) {
    return { success: false, error: "No media URL" };
  }

  console.log(`[Analyzer] ${message.id}: обработка Excel файла`);

  const items = parseExcelFile(message.mediaUrl);

  if (items.length === 0) {
    // Пустой или нераспознанный Excel → other
    await prisma.rawMessage.update({
      where: { id: message.id },
      data: {
        aiAnalyzed: true,
        aiMessageType: "other",
        aiCategory: "other",
        aiAnalyzedAt: new Date(),
      },
    });
    console.log(`[Analyzer] ${message.id}: Excel пустой или не распознан`);
    return { success: true };
  }

  // Определяем тип заявки
  const requestType = determineExcelRequestType(message.text, message.mediaFileName);
  const nomenclature = summarizeNomenclature(items);

  console.log(`[Analyzer] ${message.id}: Excel → ${requestType}, ${items.length} позиций`);

  // Ищем недавнюю заявку от того же пользователя (как для фото)
  const windowStart = new Date(
    message.date.getTime() - PHOTO_LINK_WINDOW_MINUTES * 60 * 1000
  );

  let requestId: string;

  // Проверяем есть ли отправитель для поиска
  if (message.senderId || message.senderUsername) {
    const recentRequest = await prisma.request.findFirst({
      where: {
        sourceId: message.sourceId,
        lastMessageAt: { gte: windowStart },
        type: { in: ["request", "offer"] },
        OR: [
          { senderId: message.senderId },
          ...(message.senderUsername
            ? [{ contactUsername: message.senderUsername }]
            : []),
        ],
      },
      orderBy: { lastMessageAt: "desc" },
    });

    if (recentRequest) {
      // Прикрепляем Excel к существующей заявке
      console.log(`[Analyzer] ${message.id}: прикрепляем Excel к заявке ${recentRequest.id}`);

      await prisma.request.update({
        where: { id: recentRequest.id },
        data: {
          items: items as unknown as object,
          isMultiPosition: true,
          // Обновляем номенклатуру из Excel если текущая пустая или общая
          nomenclature: recentRequest.nomenclature || nomenclature,
          material: `${recentRequest.material || ""}\nExcel файл: ${items.length} позиций`.trim(),
          lastMessageAt: message.date,
        },
      });

      // Связываем сообщение с заявкой
      await prisma.rawMessage.update({
        where: { id: message.id },
        data: {
          aiAnalyzed: true,
          aiMessageType: recentRequest.type,
          aiCategory: recentRequest.type,
          aiProductCategory: recentRequest.category || "metal",
          aiNomenclature: nomenclature,
          aiMaterial: `Excel: ${items.length} позиций`,
          aiAnalyzedAt: new Date(),
          requestId: recentRequest.id,
        },
      });

      console.log(`[Analyzer] ${message.id}: Excel прикреплён к заявке ${recentRequest.id}`);
      return { success: true };
    }
  }

  // Нет недавней заявки - создаём новую
  const request = await prisma.request.create({
    data: {
      type: requestType,
      category: "metal", // Предполагаем металл
      nomenclature,
      material: `Excel файл: ${items.length} позиций`,
      items: items as unknown as object,
      isMultiPosition: true,
      contactName: message.senderName,
      contactUsername: message.senderUsername,
      contactPhone: message.senderPhone,
      senderId: message.senderId,
      sourceId: message.sourceId,
      firstMessageAt: message.date,
      lastMessageAt: message.date,
    },
  });

  requestId = request.id;

  // Обновляем сообщение
  await prisma.rawMessage.update({
    where: { id: message.id },
    data: {
      aiAnalyzed: true,
      aiMessageType: requestType,
      aiCategory: requestType,
      aiProductCategory: "metal",
      aiNomenclature: nomenclature,
      aiMaterial: `Excel: ${items.length} позиций`,
      aiAnalyzedAt: new Date(),
      requestId,
    },
  });

  console.log(`[Analyzer] ${message.id}: создана заявка ${requestId} из Excel`);
  return { success: true };
}

/**
 * Обработать фото без текста - попытаться связать с недавней заявкой
 */
async function handlePhotoOnlyMessage(
  message: RawMessage,
  options: AnalyzeOptions
): Promise<AnalysisResult> {
  const emptyResult: AnalysisResult = {
    messageType: "other",
    productCategory: null,
    nomenclature: null,
    material: null,
    price: null,
    priceUnit: null,
    quantity: null,
    city: null,
    phone: null,
    confidence: 0,
  };

  // Если нет отправителя - не можем связать
  if (!message.senderId && !message.senderUsername) {
    console.log(`[Analyzer] ${message.id}: фото без отправителя → other`);
    return emptyResult;
  }

  // Ищем недавнюю заявку от того же пользователя
  const windowStart = new Date(
    message.date.getTime() - PHOTO_LINK_WINDOW_MINUTES * 60 * 1000
  );

  const recentRequest = await prisma.request.findFirst({
    where: {
      sourceId: message.sourceId,
      lastMessageAt: { gte: windowStart },
      type: { in: ["request", "offer"] },
      OR: [
        { senderId: message.senderId },
        ...(message.senderUsername
          ? [{ contactUsername: message.senderUsername }]
          : []),
      ],
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!recentRequest) {
    console.log(`[Analyzer] ${message.id}: фото без текста, нет недавней заявки → other`);
    return emptyResult;
  }

  console.log(
    `[Analyzer] ${message.id}: связываем фото с заявкой ${recentRequest.id}`
  );

  // Связываем сообщение с заявкой
  await prisma.rawMessage.update({
    where: { id: message.id },
    data: { requestId: recentRequest.id },
  });

  // Анализируем фото Vision моделью если есть URL
  if (options.includeMedia && message.mediaUrl) {
    const mediaPath = path.join(process.cwd(), "public", message.mediaUrl);

    if (fs.existsSync(mediaPath)) {
      console.log(`[Analyzer] ${message.id}: анализ ФОТО Vision моделью`);

      try {
        const imageBuffer = fs.readFileSync(mediaPath);
        const imageBase64 = imageBuffer.toString("base64");
        const ext = path.extname(mediaPath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

        const photoAnalysis = await analyzeImage(imageBase64, mimeType);

        // Обновляем заявку если Vision дал более точные данные
        if (photoAnalysis.nomenclature && photoAnalysis.confidence > 0.7) {
          const updateData: Record<string, unknown> = {};

          // Уточняем номенклатуру если текущая общая
          const genericTerms = ["металл", "прокат", "материал", "изделие"];
          const isGeneric = genericTerms.some((term) =>
            recentRequest.nomenclature?.toLowerCase().includes(term)
          );

          if (isGeneric || !recentRequest.nomenclature) {
            updateData.nomenclature = photoAnalysis.nomenclature;
          }

          // Добавляем категорию если не была
          if (!recentRequest.category && photoAnalysis.productCategory) {
            updateData.category = photoAnalysis.productCategory;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.request.update({
              where: { id: recentRequest.id },
              data: updateData,
            });
            console.log(
              `[Analyzer] ${message.id}: обновлена заявка из фото:`,
              updateData
            );
          }
        }

        // Возвращаем результат анализа фото
        return {
          ...photoAnalysis,
          messageType: recentRequest.type as "request" | "offer",
        };
      } catch (error) {
        console.error(`[Analyzer] ${message.id}: ошибка анализа фото:`, error);
      }
    }
  }

  // Возвращаем тип связанной заявки
  return {
    ...emptyResult,
    messageType: recentRequest.type as "request" | "offer",
    productCategory: recentRequest.category as "metal" | "other" | null,
    nomenclature: recentRequest.nomenclature,
  };
}

/**
 * Анализировать одно сообщение
 */
export async function analyzeMessage(
  messageId: string,
  options: AnalyzeOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.rawMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  if (message.aiAnalyzed) {
    return { success: true }; // Уже проанализировано
  }

  try {
    // === СПЕЦИАЛЬНАЯ ОБРАБОТКА EXCEL ФАЙЛОВ ===
    if (isExcelFile(message)) {
      return handleExcelMessage(message);
    }

    let result: AnalysisResult;

    // Пустой результат по умолчанию
    const emptyResult: AnalysisResult = {
      messageType: "other",
      productCategory: null,
      nomenclature: null,
      material: null,
      price: null,
      priceUnit: null,
      quantity: null,
      city: null,
      phone: null,
      confidence: 0,
    };

    // === ДВУХШАГОВЫЙ АНАЛИЗ ДЛЯ ЭКОНОМИИ ===
    // Шаг 1: Анализируем текст дешёвой моделью (Flash Lite)
    // Используем контекст - предыдущие сообщения от того же пользователя
    let textResult: AnalysisResult | null = null;
    if (message.text) {
      const contextText = await getMessageContext(message);
      textResult = await analyzeText(contextText);
      console.log(`[Analyzer] ${messageId}: текст → ${textResult.messageType}`);
    }

    // Шаг 2: Анализируем фото дорогой моделью (Flash) ТОЛЬКО если:
    // - включен анализ медиа
    // - есть фото
    // - ЕСТЬ текст с request/offer (фото без текста → модерация)
    const shouldAnalyzeMedia =
      options.includeMedia &&
      message.hasMedia &&
      message.mediaType === "photo" &&
      message.mediaUrl &&
      textResult && // Текст обязателен! Фото без текста не анализируем
      (textResult.messageType === "request" || textResult.messageType === "offer");

    if (shouldAnalyzeMedia) {
      // Дорогой анализ изображения только для объявлений
      console.log(`[Analyzer] ${messageId}: анализ ФОТО (request/offer с медиа)`);
      const mediaPath = path.join(process.cwd(), "public", message.mediaUrl!);

      if (fs.existsSync(mediaPath)) {
        const imageBuffer = fs.readFileSync(mediaPath);
        const imageBase64 = imageBuffer.toString("base64");
        const ext = path.extname(mediaPath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

        result = await analyzeImage(imageBase64, mimeType, message.text || undefined);
      } else {
        // Файл не найден, используем результат текста или пустой
        result = textResult || emptyResult;
      }
    } else if (textResult) {
      // Используем результат текстового анализа (спам/other - фото не анализируем)
      console.log(`[Analyzer] ${messageId}: только текст (фото пропущено - ${textResult.messageType})`);
      result = textResult;
    } else if (message.hasMedia && message.mediaType === "photo") {
      // Фото без текста → пытаемся связать с недавней заявкой
      result = await handlePhotoOnlyMessage(message, options);
    } else if (message.hasMedia) {
      // Другой тип медиа без текста → other
      console.log(`[Analyzer] ${messageId}: медиа без текста (${message.mediaType}) → other`);
      result = emptyResult;
    } else {
      // Нет текста и нет медиа
      result = emptyResult;
    }

    // Сохраняем результат с новыми полями
    await prisma.rawMessage.update({
      where: { id: messageId },
      data: {
        aiAnalyzed: true,
        // Новые поля
        aiMessageType: result.messageType,
        aiProductCategory: result.productCategory,
        aiNomenclature: result.nomenclature,
        // Старое поле для обратной совместимости
        aiCategory: result.messageType,
        // Детали
        aiMaterial: result.material,
        aiPrice: result.price,
        aiPriceUnit: result.priceUnit,
        aiQuantity: result.quantity != null ? String(result.quantity) : null,
        aiCity: result.city,
        aiPhone: result.phone,
        aiConfidence: result.confidence,
        aiRawResponse: result.rawResponse || null,
        aiAnalyzedAt: new Date(),
      },
    });

    // Агрегируем в заявку (для request/offer)
    await aggregateToRequest(message, result);

    // LAZY DOWNLOAD: Скачиваем медиа только для request/offer
    if ((result.messageType === "request" || result.messageType === "offer") && message.hasMedia) {
      try {
        console.log(`[Analyzer] Downloading media for ${result.messageType}: ${messageId}`);
        await downloadMediaForMessage(messageId);
      } catch (downloadError) {
        console.error(`[Analyzer] Media download error for ${messageId}:`, downloadError);
        // Не прерываем анализ при ошибке скачивания
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`Error analyzing message ${messageId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Пакетный анализ неанализированных сообщений
 */
export async function analyzeUnprocessed(options: AnalyzeOptions = {}): Promise<BatchResult> {
  const { batchSize = 10, delayMs = 500, includeMedia = true, sourceIds, count } = options;

  // Строим фильтр
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    aiAnalyzed: false,
    OR: [
      { text: { not: null } },
      { hasMedia: true },
    ],
  };

  // Фильтр по источникам
  if (sourceIds && sourceIds.length > 0) {
    where.sourceId = { in: sourceIds };
  }

  // Определяем количество для анализа
  const take = count === "all" ? undefined : (typeof count === "number" ? count : batchSize);

  // Получаем неанализированные сообщения
  const messages = await prisma.rawMessage.findMany({
    where,
    take,
    orderBy: { date: "desc" },
  });

  const result: BatchResult = {
    total: messages.length,
    analyzed: 0,
    errors: 0,
    results: [],
  };

  for (const message of messages) {
    const analysisResult = await analyzeMessage(message.id, { includeMedia });

    result.results.push({
      id: message.id,
      success: analysisResult.success,
      error: analysisResult.error,
    });

    if (analysisResult.success) {
      result.analyzed++;
    } else {
      result.errors++;
    }

    // Задержка между запросами
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return result;
}

/**
 * Получить статистику анализа
 */
export async function getAnalysisStats() {
  const [
    total,
    analyzed,
    byMessageType,
    byProductCategory,
    byNomenclature,
  ] = await Promise.all([
    prisma.rawMessage.count(),
    prisma.rawMessage.count({ where: { aiAnalyzed: true } }),
    // Статистика по типу объявления
    prisma.rawMessage.groupBy({
      by: ["aiMessageType"],
      _count: true,
      where: { aiAnalyzed: true },
    }),
    // Статистика по категории товара
    prisma.rawMessage.groupBy({
      by: ["aiProductCategory"],
      _count: true,
      where: {
        aiAnalyzed: true,
        aiMessageType: { in: ["request", "offer"] },
      },
    }),
    // Статистика по номенклатуре
    prisma.rawMessage.groupBy({
      by: ["aiNomenclature"],
      _count: true,
      where: {
        aiAnalyzed: true,
        aiMessageType: { in: ["request", "offer"] },
        aiNomenclature: { not: null },
      },
      orderBy: { _count: { aiNomenclature: "desc" } },
      take: 20,
    }),
  ]);

  // Форматируем статистику
  const messageTypes: Record<string, number> = {};
  for (const item of byMessageType) {
    const type = item.aiMessageType || "unknown";
    messageTypes[type] = item._count;
  }

  const productCategories: Record<string, number> = {};
  for (const item of byProductCategory) {
    const cat = item.aiProductCategory || "unknown";
    productCategories[cat] = item._count;
  }

  const nomenclatures: Record<string, number> = {};
  for (const item of byNomenclature) {
    const nom = item.aiNomenclature || "unknown";
    nomenclatures[nom] = item._count;
  }

  return {
    total,
    analyzed,
    pending: total - analyzed,
    messageTypes,
    productCategories,
    nomenclatures,
    // Для обратной совместимости
    categories: messageTypes,
  };
}

/**
 * Получить сообщения с фильтрами
 */
export async function getMessagesByCategory(
  category: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  // Поддержка как старых категорий, так и новых
  return prisma.rawMessage.findMany({
    where: {
      OR: [
        { aiCategory: category },
        { aiMessageType: category },
      ],
    },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
    include: {
      source: {
        select: { name: true, username: true },
      },
    },
  });
}

/**
 * Получить сообщения с расширенными фильтрами
 */
export async function getMessagesFiltered(options: {
  messageType?: string;
  productCategory?: string;
  nomenclature?: string;
  city?: string;
  limit?: number;
  offset?: number;
}) {
  const {
    messageType,
    productCategory,
    nomenclature,
    city,
    limit = 50,
    offset = 0,
  } = options;

  // Строим фильтр
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    aiAnalyzed: true,
  };

  if (messageType) {
    where.aiMessageType = messageType;
  }

  if (productCategory) {
    where.aiProductCategory = productCategory;
  }

  if (nomenclature) {
    where.aiNomenclature = nomenclature;
  }

  if (city) {
    where.aiCity = { contains: city, mode: "insensitive" };
  }

  const [messages, total] = await Promise.all([
    prisma.rawMessage.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: {
        source: {
          select: { name: true, username: true, defaultCity: true },
        },
      },
    }),
    prisma.rawMessage.count({ where }),
  ]);

  return { messages, total };
}

/**
 * Получить доступные фильтры для каскадной фильтрации
 */
export async function getAvailableFilters(messageType?: string, productCategory?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere: any = {
    aiAnalyzed: true,
    aiMessageType: { in: ["request", "offer"] },
  };

  if (messageType) {
    baseWhere.aiMessageType = messageType;
  }

  if (productCategory) {
    baseWhere.aiProductCategory = productCategory;
  }

  const [categories, nomenclatures, cities] = await Promise.all([
    // Доступные категории товаров
    prisma.rawMessage.groupBy({
      by: ["aiProductCategory"],
      _count: true,
      where: messageType ? { ...baseWhere, aiMessageType: messageType } : baseWhere,
    }),
    // Доступные номенклатуры
    prisma.rawMessage.groupBy({
      by: ["aiNomenclature"],
      _count: true,
      where: baseWhere,
      orderBy: { _count: { aiNomenclature: "desc" } },
    }),
    // Доступные города
    prisma.rawMessage.findMany({
      where: {
        ...baseWhere,
        aiCity: { not: null },
      },
      select: { aiCity: true },
      distinct: ["aiCity"],
    }),
  ]);

  return {
    productCategories: categories
      .filter(c => c.aiProductCategory)
      .map(c => ({ value: c.aiProductCategory!, count: c._count })),
    nomenclatures: nomenclatures
      .filter(n => n.aiNomenclature)
      .map(n => ({ value: n.aiNomenclature!, count: n._count })),
    cities: cities.map(c => c.aiCity!).filter(Boolean),
  };
}

/**
 * Получить статистику медиа по источникам (группам)
 */
export async function getSourceMediaStats() {
  // Получаем все источники с подсчетом сообщений
  const sources = await prisma.telegramSource.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      isActive: true,
    },
  });

  // Для каждого источника получаем статистику
  const stats = await Promise.all(
    sources.map(async (source) => {
      const [totalMessages, analyzedMessages, mediaStats] = await Promise.all([
        // Всего сообщений
        prisma.rawMessage.count({ where: { sourceId: source.id } }),
        // Проанализировано
        prisma.rawMessage.count({ where: { sourceId: source.id, aiAnalyzed: true } }),
        // Статистика по типам медиа
        prisma.rawMessage.groupBy({
          by: ["mediaType"],
          _count: true,
          where: { sourceId: source.id, hasMedia: true },
        }),
      ]);

      // Форматируем статистику медиа
      const mediaByType: Record<string, number> = {};
      for (const stat of mediaStats) {
        const type = stat.mediaType || "unknown";
        mediaByType[type] = stat._count;
      }

      return {
        id: source.id,
        name: source.name,
        username: source.username,
        isActive: source.isActive,
        totalMessages,
        analyzedMessages,
        pendingMessages: totalMessages - analyzedMessages,
        media: mediaByType,
        totalMedia: Object.values(mediaByType).reduce((a, b) => a + b, 0),
      };
    })
  );

  return stats;
}
