/**
 * Классификатор сообщений - Этап 1 (универсальный)
 *
 * Двухэтапная архитектура:
 * - Этап 0: localFilter (бесплатно, regex) — отсекает ~30% мусора
 * - Этап 1: API классификация (УНИВЕРСАЛЬНЫЙ промпт) — REQUEST/OFFER/OTHER
 * - Этап 2: Доменный enrichment (будет позже) — извлечение структурированных данных
 *
 * Gold standard (300 сообщений, Opus 4.5):
 * REQUEST: 6 (2%), OFFER: 9 (3%), OTHER: 285 (95%)
 */

import { chatCompletion } from "./openrouter";
import { localFilter } from "./localFilter";
import { downloadMediaForMessage } from "@/lib/telegram/downloader";

/**
 * Regex-паттерны для НАДЁЖНОГО извлечения контактов
 * Используется как fallback если AI пропустит
 */
const CONTACT_PATTERNS = {
  // ВАЖНО: НЕ используем /g флаг! .test() с /g ломается при повторных вызовах
  // Телефоны: 8/+7 с разными разделителями (включая длинное тире –)
  phone: /(?:\+7|8)[\s\-–—\(\)]*\d{3}[\s\-–—\(\)]*\d{3}[\s\-–—]*\d{2}[\s\-–—]*\d{2}/,
  // Email
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  // Telegram username
  telegram: /@[a-zA-Z][a-zA-Z0-9_]{4,}/,
  // WhatsApp упоминания
  whatsapp: /(?:WA|WhatsApp|Ватсап|Вотсап|вацап)[\s:]*(?:\+7|8)?[\s\-–—\(\)]*\d{3}[\s\-–—\(\)]*\d{3}[\s\-–—]*\d{2}[\s\-–—]*\d{2}/i,
};

/**
 * Проверяет наличие контактов в тексте через regex (100% надёжно)
 */
function detectContactsInText(text: string): boolean {
  if (!text) return false;

  return (
    CONTACT_PATTERNS.phone.test(text) ||
    CONTACT_PATTERNS.email.test(text) ||
    CONTACT_PATTERNS.telegram.test(text) ||
    CONTACT_PATTERNS.whatsapp.test(text) ||
    /(?:пишите|звоните|обращайтесь)[\s]+(?:в\s+)?(?:личку|лс|личные|директ)/i.test(text)
  );
}

/**
 * УНИВЕРСАЛЬНЫЙ промпт для Этапа 1
 *
 * ВАЖНО: Этот промпт НЕ привязан к конкретному домену!
 * Работает одинаково для: металл, IT, авто, недвижимость, услуги и т.д.
 * Доменная специфика будет на Этапе 2.
 */
const UNIVERSAL_CLASSIFIER_PROMPT = `Классифицируй сообщение из группового чата.

КОНТЕКСТ (соседние сообщения):
{context}

>>> СООБЩЕНИЕ <<<
"{text}"
{mediaInfo}

ИСТОРИЯ АВТОРА:
{senderHistory}

══════════════════════════════════════════════════════════════
REQUEST = автор ПЕРВЫМ инициирует покупку/поиск (только ~2% сообщений):
• "ищу/ищем/нужно/нужен/требуется" + конкретный товар/услуга
• "куплю/закупаем/#куплю" + что именно
• "требуются" + специалисты/работники + условия
• "есть заявка на..." + описание

OFFER = автор ПЕРВЫМ инициирует продажу (только ~3% сообщений):
• "продаю/продам" + конкретный товар + цена/контакт
• "выполним/производим" + услуги + "обращайтесь/звоните"
• "в наличии" + товар + призыв к покупке
• Полноценная презентация компании + контакты

OTHER = всё остальное (95% сообщений):
• ЛЮБОЙ ответ на чужое сообщение (даже если предлагает услуги!)
• Уточняющие вопросы ("а где?", "какой размер?", "сколько?")
• "я нашел для тебя X" — это ответ, не инициация
• "у нас производство X" — ответ на чужой запрос = OTHER
• "напишите в личку" — ответ = OTHER
• Демонстрация работы/портфолио БЕЗ явного "обращайтесь"
• Технические вопросы ("какой зазор должен быть?")
• Комментарии ("цена не дорогая", "хорошая работа")
• Представление себя ("я директор") без предложения
══════════════════════════════════════════════════════════════

⚠️ КРИТИЧЕСКИ ВАЖНО:
• Смотри КОНТЕКСТ! Если сообщение — ОТВЕТ на чужое → OTHER
• REQUEST/OFFER = только ПЕРВОЕ сообщение, инициирующее сделку
• "Где дешевле?" после своего же вопроса = OTHER (уточнение)
• Если есть сомнения → OTHER

КАТЕГОРИЯ (только для REQUEST/OFFER, иначе null):
• metal = металлопрокат (арматура, балка, труба, лист, швеллер, уголок, круг, квадрат)
• construction = металлоконструкции (фермы, колонны, ЛСТК, ангары, навесы, каркасы)
• metalwork = металлообработка (резка, гибка, сварка, токарные работы, фрезеровка)
• building = строительные материалы (кирпич, бетон, цемент, песок, щебень, утеплитель)
• null = не определено или OTHER

КОНТАКТЫ (для REQUEST/OFFER):
• hasContacts = true если есть телефон, @username, email, "пишите в личку", "звоните"
• hasContacts = false если контактов НЕТ в тексте

JSON: {"type":"REQUEST|OFFER|OTHER","category":"metal|construction|metalwork|building|null","hasContacts":true|false,"confidence":0.0-1.0,"reason":"кратко"}`;

/**
 * Простой промпт без контекста
 * УНИВЕРСАЛЬНЫЙ — работает для ЛЮБОГО домена/группы
 */
const CLASSIFIER_PROMPT_SIMPLE = `Классифицируй сообщение из группового чата:

REQUEST = автор ИНИЦИИРУЕТ покупку/поиск (ищу, нужно, куплю, требуется, кто может)
OFFER = автор ИНИЦИИРУЕТ продажу/предложение (продаю, предлагаю, выполним, в наличии, обращайтесь)
OTHER = НЕ сделка (ответы, вопросы, обсуждения, шутки) — 95% сообщений

Ответ на чужое сообщение = OTHER.
Если сомневаешься = OTHER.

JSON: {"type":"REQUEST|OFFER|OTHER","confidence":0.0-1.0}

СООБЩЕНИЕ: "{text}"`;

export type ClassificationType = "request" | "offer" | "other";

export type AIModelType = "lite" | "smart";

export type CategoryType = "metal" | "construction" | "metalwork" | "building" | null;

export interface ClassificationResult {
  type: ClassificationType;
  category?: CategoryType;  // Категория товара/услуги
  hasContacts?: boolean;    // Есть ли контакты в сообщении
  confidence: number;
  reason?: string;
  model?: AIModelType;  // Какая модель использовалась
}

/**
 * Интерфейс сообщения для классификации
 */
interface MessageForClassification {
  id: string;
  text: string | null;
  sourceId: string;
  senderId?: string | null;
  senderUsername?: string | null;
  senderName?: string | null;
  date: Date;
  hasMedia?: boolean;
  mediaType?: string | null;
  mediaFileName?: string | null;
}

/**
 * Получить контекст переписки (соседние сообщения ±10 минут)
 */
async function getConversationContext(
  prisma: any,
  message: MessageForClassification
): Promise<string> {
  const windowMinutes = 10;
  const windowBefore = new Date(message.date.getTime() - windowMinutes * 60 * 1000);
  const windowAfter = new Date(message.date.getTime() + windowMinutes * 60 * 1000);

  try {
    const surroundingMessages = await prisma.rawMessage.findMany({
      where: {
        sourceId: message.sourceId,
        id: { not: message.id },
        date: {
          gte: windowBefore,
          lte: windowAfter,
        },
        text: { not: null },
      },
      orderBy: { date: "asc" },
      take: 10,
      select: {
        text: true,
        senderName: true,
        senderId: true,
        date: true,
        hasMedia: true,
        mediaType: true,
        mediaFileName: true,
      },
    });

    if (surroundingMessages.length === 0) {
      return "(нет соседних сообщений)";
    }

    return surroundingMessages
      .map((m: any) => {
        const isSameAuthor = m.senderId === message.senderId;
        const prefix = isSameAuthor ? "[ТОТ ЖЕ АВТОР]" : `[${m.senderName || "Аноним"}]`;
        const mediaInfo = m.hasMedia ? ` [ФАЙЛ: ${m.mediaType || "медиа"}]` : "";
        return `${prefix}: ${m.text?.substring(0, 200) || ""}${mediaInfo}`;
      })
      .join("\n");
  } catch (error) {
    console.error("[Classifier] Error getting context:", error);
    return "(ошибка получения контекста)";
  }
}

/**
 * Получить историю сообщений от того же отправителя
 */
async function getSenderHistory(
  prisma: any,
  message: MessageForClassification
): Promise<string> {
  if (!message.senderId && !message.senderUsername) {
    return "(автор неизвестен)";
  }

  try {
    const senderMessages = await prisma.rawMessage.findMany({
      where: {
        sourceId: message.sourceId,
        id: { not: message.id },
        date: { lt: message.date },
        text: { not: null },
        OR: [
          message.senderId ? { senderId: message.senderId } : {},
          message.senderUsername ? { senderUsername: message.senderUsername } : {},
        ].filter(c => Object.keys(c).length > 0),
      },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        text: true,
        date: true,
        aiMessageType: true,
        hasMedia: true,
        mediaType: true,
      },
    });

    if (senderMessages.length === 0) {
      return "(первое сообщение от этого автора)";
    }

    return senderMessages
      .map((m: any) => {
        const typeLabel = m.aiMessageType === "request" ? "[ЗАЯВКА НА ПОКУПКУ]" :
                         m.aiMessageType === "offer" ? "[ПРЕДЛОЖЕНИЕ]" : "";
        const mediaInfo = m.hasMedia ? ` [ФАЙЛ: ${m.mediaType || "медиа"}]` : "";
        return `${typeLabel} ${m.text?.substring(0, 150) || ""}${mediaInfo}`;
      })
      .join("\n");
  } catch (error) {
    console.error("[Classifier] Error getting sender history:", error);
    return "(ошибка получения истории)";
  }
}

/**
 * Классифицирует сообщение с учётом контекста
 * Использует двухэтапную архитектуру:
 * - Этап 0: localFilter (бесплатно)
 * - Этап 1: API классификация
 */
export async function classifyMessageWithContext(
  prisma: any,
  message: MessageForClassification,
  model: AIModelType = "lite"  // Выбор модели: lite (быстрая) или smart (Gemini 3)
): Promise<ClassificationResult> {
  const text = message.text?.trim() || "";

  // ═══════════════════════════════════════════════════
  // ЭТАП 0: Локальный фильтр (бесплатно, ~30% отсекается)
  // ═══════════════════════════════════════════════════
  const filterResult = localFilter(text);

  if (filterResult.skip && filterResult.type) {
    return {
      type: filterResult.type,
      confidence: filterResult.confidence || 0.99,
      reason: filterResult.reason || "локальный фильтр",
      model: "lite",  // Локальный фильтр не использует API
    };
  }

  // ═══════════════════════════════════════════════════
  // ЭТАП 1: API классификация
  // ═══════════════════════════════════════════════════
  try {
    // Получаем контекст параллельно
    const [context, senderHistory] = await Promise.all([
      getConversationContext(prisma, message),
      getSenderHistory(prisma, message),
    ]);

    // Формируем информацию о файле
    let mediaInfo = "";
    if (message.hasMedia) {
      const fileName = message.mediaFileName || "";
      const mediaType = message.mediaType || "файл";
      mediaInfo = `[ПРИКРЕПЛЁН ФАЙЛ: ${mediaType}${fileName ? ` "${fileName}"` : ""}]`;
    }

    // Формируем промпт (универсальный)
    // Увеличен лимит до 1500 символов чтобы не обрезать контакты в конце
    const prompt = UNIVERSAL_CLASSIFIER_PROMPT
      .replace("{context}", context)
      .replace("{text}", text.substring(0, 1500))
      .replace("{mediaInfo}", mediaInfo)
      .replace("{senderHistory}", senderHistory);

    const response = await chatCompletion([
      { role: "user", content: prompt }
    ], { model, maxTokens: 100 });

    // Парсим JSON ответ
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const type = parsed.type?.toUpperCase();
      const confidence = parseFloat(parsed.confidence) || 0.5;
      const reason = parsed.reason || "";

      // Парсим категорию
      const validCategories = ["metal", "construction", "metalwork", "building"];
      const category: CategoryType = validCategories.includes(parsed.category)
        ? parsed.category as CategoryType
        : null;

      // Парсим наличие контактов от AI
      let hasContacts = typeof parsed.hasContacts === "boolean" ? parsed.hasContacts : undefined;

      // ВАЖНО: Regex-детектор как fallback (AI может пропустить контакты в длинных текстах)
      const regexDetected = detectContactsInText(text);
      if (regexDetected && hasContacts !== true) {
        hasContacts = true; // Regex нашёл контакты - перезаписываем
      }

      if (type === "REQUEST") return { type: "request", category, hasContacts, confidence, reason, model };
      if (type === "OFFER") return { type: "offer", category, hasContacts, confidence, reason, model };
      return { type: "other", category: null, hasContacts: regexDetected || undefined, confidence, reason, model };
    }

    // Fallback - старый парсинг
    const responseUpper = response.trim().toUpperCase();
    const fallbackRegexContacts = detectContactsInText(text); // Regex всегда проверяем!
    if (responseUpper.includes("REQUEST")) return { type: "request", category: null, hasContacts: fallbackRegexContacts || undefined, confidence: 0.6, reason: "fallback parsing", model };
    if (responseUpper.includes("OFFER")) return { type: "offer", category: null, hasContacts: fallbackRegexContacts || undefined, confidence: 0.6, reason: "fallback parsing", model };
    return { type: "other", category: null, hasContacts: fallbackRegexContacts || undefined, confidence: 0.5, reason: "не удалось определить", model };
  } catch (error) {
    console.error("[Classifier] Error:", error);
    const errorRegexContacts = detectContactsInText(text);
    return { type: "other", category: null, hasContacts: errorRegexContacts || undefined, confidence: 0.3, reason: "ошибка классификации", model };
  }
}

/**
 * Простая классификация без контекста (для совместимости)
 * Использует localFilter + упрощённый API промпт
 */
export async function classifyMessage(text: string): Promise<ClassificationType> {
  // Этап 0: локальный фильтр
  const filterResult = localFilter(text);
  if (filterResult.skip) {
    return filterResult.type || "other";
  }

  // Этап 1: API
  try {
    const prompt = CLASSIFIER_PROMPT_SIMPLE.replace("{text}", text.substring(0, 1500));
    const response = await chatCompletion([
      { role: "user", content: prompt }
    ], { model: "lite", maxTokens: 50 });

    const jsonMatch = response.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const type = parsed.type?.toUpperCase();
      if (type === "REQUEST") return "request";
      if (type === "OFFER") return "offer";
      return "other";
    }

    const responseUpper = response.trim().toUpperCase();
    if (responseUpper.includes("REQUEST")) return "request";
    if (responseUpper.includes("OFFER")) return "offer";
    return "other";
  } catch (error) {
    console.error("[Classifier] Error:", error);
    return "other";
  }
}

/**
 * Классифицирует пачку сообщений с контекстом
 */
export async function classifyBatchWithContext(
  prisma: any,
  messages: MessageForClassification[],
  model: AIModelType = "lite"
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  const promises = messages.map(async (msg) => {
    const result = await classifyMessageWithContext(prisma, msg, model);
    return { id: msg.id, result };
  });

  const classified = await Promise.all(promises);

  for (const { id, result } of classified) {
    results.set(id, result);
  }

  return results;
}

/**
 * Статус задачи классификации
 */
export interface ClassificationJob {
  id: string;
  status: "running" | "stopped" | "completed" | "error";
  model: AIModelType;  // Какая модель используется
  total: number;
  processed: number;
  requests: number;
  offers: number;
  others: number;
  errors: number;
  startedAt: Date;
  stoppedAt: Date | null;
  errorMessage: string | null;
}

// Текущая задача (singleton)
let currentJob: ClassificationJob | null = null;
let shouldStop = false;

/**
 * Получить текущую задачу
 */
export function getClassificationJob(): ClassificationJob | null {
  return currentJob;
}

/**
 * Остановить текущую задачу
 */
export function stopClassificationJob(): void {
  shouldStop = true;
  if (currentJob) {
    currentJob.status = "stopped";
    currentJob.stoppedAt = new Date();
  }
}

/**
 * Очистить завершённую задачу
 */
export function clearClassificationJob(): void {
  if (currentJob && currentJob.status !== "running") {
    currentJob = null;
  }
}

/**
 * Запустить классификацию сообщений
 */
export async function runClassification(
  prisma: any,
  options: {
    sourceIds?: string[];
    limit?: number | "all";
    model?: AIModelType;  // Выбор модели: lite (быстрая) или smart (Gemini 3)
  } = {}
): Promise<ClassificationJob> {
  if (currentJob?.status === "running") {
    throw new Error("Классификация уже запущена");
  }

  shouldStop = false;

  const model = options.model || "lite";

  const where: any = {
    aiAnalyzed: false,
    text: { not: null },
  };

  if (options.sourceIds && options.sourceIds.length > 0) {
    where.sourceId = { in: options.sourceIds };
  }

  const totalCount = await prisma.rawMessage.count({ where });
  const limit = options.limit === "all" ? totalCount : (options.limit || 100);

  currentJob = {
    id: Date.now().toString(),
    status: "running",
    model,
    total: Math.min(limit, totalCount),
    processed: 0,
    requests: 0,
    offers: 0,
    others: 0,
    errors: 0,
    startedAt: new Date(),
    stoppedAt: null,
    errorMessage: null,
  };

  processMessagesWithContext(prisma, where, limit, model).catch((error) => {
    if (currentJob) {
      currentJob.status = "error";
      currentJob.errorMessage = error.message;
      currentJob.stoppedAt = new Date();
    }
  });

  return currentJob;
}

/**
 * Основной цикл обработки с контекстом
 */
async function processMessagesWithContext(
  prisma: any,
  where: any,
  limit: number,
  model: AIModelType = "lite"
): Promise<void> {
  const BATCH_SIZE = 3;
  const DELAY_MS = 300;

  let processed = 0;

  // Формируем название модели для сохранения в БД
  const modelName = model === "smart" ? "gemini-smart" : "gemini-lite";

  while (processed < limit && !shouldStop) {
    const messages = await prisma.rawMessage.findMany({
      where,
      take: BATCH_SIZE,
      orderBy: { date: "asc" },
      select: {
        id: true,
        text: true,
        sourceId: true,
        senderId: true,
        senderUsername: true,
        senderName: true,
        date: true,
        hasMedia: true,
        mediaType: true,
        mediaFileName: true,
      },
    });

    if (messages.length === 0) break;

    const results = await classifyBatchWithContext(prisma, messages, model);

    for (const [id, result] of results) {
      try {
        await prisma.rawMessage.update({
          where: { id },
          data: {
            aiAnalyzed: true,
            aiMessageType: result.type,
            aiProductCategory: result.category || null,  // Категория товара
            aiHasContacts: result.hasContacts ?? null,   // Есть ли контакты
            aiConfidence: result.confidence,
            aiReason: result.reason || null,
            aiModel: modelName,  // Сохраняем какая модель использовалась
            aiAnalyzedAt: new Date(),
          },
        });

        // LAZY DOWNLOAD: Скачиваем медиа только для request/offer
        if (result.type === "request" || result.type === "offer") {
          // Проверяем есть ли медиа у сообщения
          const msg = messages.find((m: any) => m.id === id);
          if (msg?.hasMedia) {
            try {
              console.log(`[Classifier] Downloading media for ${result.type}: ${id}`);
              await downloadMediaForMessage(id);
            } catch (downloadError) {
              console.error(`[Classifier] Media download error for ${id}:`, downloadError);
              // Не прерываем классификацию при ошибке скачивания
            }
          }
        }

        if (currentJob) {
          currentJob.processed++;
          if (result.type === "request") currentJob.requests++;
          else if (result.type === "offer") currentJob.offers++;
          else currentJob.others++;
        }
      } catch (error) {
        console.error(`[Classifier] Error saving ${id}:`, error);
        if (currentJob) currentJob.errors++;
      }
    }

    processed += messages.length;

    if (processed < limit && !shouldStop) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  if (currentJob && currentJob.status === "running") {
    currentJob.status = shouldStop ? "stopped" : "completed";
    currentJob.stoppedAt = new Date();
  }
}
