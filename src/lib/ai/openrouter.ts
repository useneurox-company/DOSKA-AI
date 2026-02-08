/**
 * OpenRouter API Client
 * Используем Gemini 3 Flash для анализа сообщений
 */

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// === API Key ===
const API_KEY = process.env.OPENROUTER_API_KEY || "";

/**
 * Получить API ключ
 */
function getNextApiKey(): string {
  if (!API_KEY) {
    throw new Error("OPENROUTER_API_KEY не установлен в .env");
  }
  return API_KEY;
}

// Модели OpenRouter (февраль 2026)
const MODEL_LITE = "google/gemini-3-flash-preview";          // Gemini 3 Flash - быстрая
const MODEL_VISION = "google/gemini-3-flash-preview";        // Gemini 3 Flash - для vision
const MODEL_SMART = "google/gemini-3-flash-preview";         // Gemini 3 Flash - умная

// Retry настройки
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Начальная задержка

/**
 * Задержка для retry
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
}

interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnalysisResult {
  // Уровень 1: Тип объявления
  messageType: "request" | "offer" | "spam" | "other";

  // Уровень 2: Категория товара (только для request/offer)
  productCategory: "metal" | "construction" | "metalwork" | "building" | "other" | null;

  // Уровень 3: Номенклатура
  nomenclature: string | null;  // "арматура", "труба", "кирпич" и т.д.

  // Детали
  material: string | null;      // Полное описание материала
  price: number | null;
  priceUnit: string | null;     // "за тонну", "за штуку"
  quantity: string | null;
  city: string | null;
  phone: string | null;
  confidence: number;
  rawResponse?: string;
}

/**
 * Отправка запроса к OpenRouter API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: "lite" | "vision" | "smart";  // Все используют бесплатную Gemini 2.0 Flash
  }
): Promise<string> {
  if (!API_KEY) {
    throw new Error("OPENROUTER_API_KEY не установлен в .env");
  }

  // Выбор модели: по умолчанию дешёвая
  const model = options?.model === "vision" ? MODEL_VISION
              : options?.model === "smart" ? MODEL_SMART
              : MODEL_LITE;

  // Retry loop с exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const apiKey = getNextApiKey();
    const modelName = options?.model === "vision" ? "VISION" : options?.model === "smart" ? "SMART" : "LITE";
    console.log(`[AI] Модель: ${model} (${modelName})`);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://doskaai.ru",
          "X-Title": "DoskaAI Telegram Parser",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      return data.choices[0]?.message?.content || "";

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Последняя попытка - бросаем ошибку
      if (attempt === MAX_RETRIES - 1) {
        console.error(`[AI] Все ${MAX_RETRIES} попыток исчерпаны:`, lastError.message);
        throw lastError;
      }

      // Exponential backoff: 1с, 2с, 4с
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`[AI] Попытка ${attempt + 1}/${MAX_RETRIES} неудачна, повтор через ${delayMs}мс...`);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("Неизвестная ошибка API");
}

/**
 * Анализ текстового сообщения
 */
export async function analyzeText(text: string): Promise<AnalysisResult> {
  const systemPrompt = `Ты AI-эксперт по анализу объявлений из Telegram-групп о стройматериалах и строительстве.
Твоя задача - определить тип сообщения и извлечь РЕАЛЬНЫЕ данные из текста.

КОНТЕКСТ: Тебе может быть передан диалог нескольких участников чата.
Сообщение для анализа выделено символами >>> ... <<<

## ГЛАВНОЕ ПРАВИЛО:
Извлекай ТОЛЬКО то, что РЕАЛЬНО написано в тексте. НЕ выдумывай и НЕ додумывай!
Если в тексте написано "ЛСТК, склад 12х36" - номенклатура это "ЛСТК" или "Склад ЛСТК", а НЕ что-то другое.

## ТИП ОБЪЯВЛЕНИЯ (messageType):
- "request" - автор ХОЧЕТ КУПИТЬ/ЗАКАЗАТЬ (ищет, нужен, куплю, интересует, требуется, есть интерес)
- "offer" - автор ХОЧЕТ ПРОДАТЬ/ПРЕДЛОЖИТЬ (продаю, предлагаю, есть в наличии, производим)
- "spam" - реклама, не связанная со строительством
- "other" - вопросы, обсуждения, споры, гипотетические ситуации

## КАТЕГОРИЯ ТОВАРА (productCategory):
- "metal" - металлопрокат (труба, арматура, швеллер, балка, лист, уголок, профиль, круг, квадрат)
- "construction" - металлоконструкции и здания (ЛСТК, ангар, склад, модульное здание, каркас, ферма, колонны, баки, ёмкости, металлоизделия)
- "metalwork" - металлообработка и услуги (резка, гибка, сварка, токарные работы, фрезеровка, плазменная резка, лазерная резка, вальцовка, покраска)
- "building" - строительные материалы (сендвич-панель, кровля, утеплитель, профлист, кирпич, бетон, цемент, песок, щебень)
- "other" - прочее (оборудование, доставка, общие вопросы)

## НОМЕНКЛАТУРА (nomenclature):
Укажи ТОЧНО то, что написано в тексте. Примеры:
- "Производители ЛСТК, есть интерес: склад 12х36" → "ЛСТК / Склад 12х36"
- "Нужна балка 18М" → "Балка 18М"
- "Куплю трубу 159х6" → "Труба 159х6"
- "Сендвич-панели для кровли" → "Сендвич-панели"
- "Ангар 18х60" → "Ангар 18х60"

## ПРИМЕРЫ АНАЛИЗА:

"Добрый день. Производители ЛСТК, есть интерес: склад 12х36 высота потолков 4 м, кровля-стены сендвич. Регион Екатеринбург"
→ messageType: "request", productCategory: "construction", nomenclature: "ЛСТК / Склад 12х36", city: "Екатеринбург"

"Нужна балка 18М, 5 тонн, Москва"
→ messageType: "request", productCategory: "metal", nomenclature: "Балка 18М", quantity: "5 тонн", city: "Москва"

"Производим быстровозводимые здания под ключ"
→ messageType: "offer", productCategory: "construction", nomenclature: "Быстровозводимые здания"

"Где сертификат качества?"
→ messageType: "other" (вопрос, не заявка)

## УВЕРЕННОСТЬ (confidence):
- 0.8-1.0 - чёткая заявка с конкретным товаром
- 0.6-0.8 - есть намерение, но не все детали
- 0.0-0.6 - неуверен, возможно не заявка

ВАЖНО: Отвечай ТОЛЬКО валидным JSON без markdown.`;

  const userPrompt = `Проанализируй сообщение и извлеки РЕАЛЬНЫЕ данные:

"${text}"

JSON:
{
  "messageType": "request|offer|spam|other",
  "productCategory": "metal|construction|metalwork|building|other|null",
  "nomenclature": "точное название из текста или null",
  "material": "описание/детали или null",
  "price": число или null,
  "priceUnit": "за тонну|за штуку|за м2|за м3|null",
  "quantity": "количество или null",
  "city": "город или null",
  "phone": "телефон или null",
  "confidence": 0.0-1.0
}`;

  // Используем дешёвую модель для текста
  const response = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { model: "lite" });

  try {
    // Очищаем ответ от возможного markdown
    const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleanJson);

    // Валидация messageType
    const validMessageTypes = ["request", "offer", "spam", "other"];
    const messageType = validMessageTypes.includes(result.messageType) ? result.messageType : "other";

    // productCategory только для request/offer
    type ProductCategory = "metal" | "construction" | "metalwork" | "building" | "other";
    const validCategories: ProductCategory[] = ["metal", "construction", "metalwork", "building", "other"];
    let productCategory: ProductCategory | null = null;
    if ((messageType === "request" || messageType === "offer") && result.productCategory) {
      // Мапим старые категории на новые
      let cat = result.productCategory;
      if (cat === "materials") cat = "building";
      if (cat === "equipment") cat = "other";
      if (cat === "services") cat = "metalwork"; // услуги резки/гибки/сварки
      productCategory = validCategories.includes(cat) ? cat as ProductCategory : "other";
    }

    return {
      messageType,
      productCategory,
      nomenclature: result.nomenclature || null,
      material: result.material || null,
      price: typeof result.price === "number" ? result.price : null,
      priceUnit: result.priceUnit || null,
      quantity: result.quantity || null,
      city: result.city || null,
      phone: result.phone || null,
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
      rawResponse: response,
    };
  } catch {
    console.error("Failed to parse AI response:", response);
    return {
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
      rawResponse: response,
    };
  }
}

/**
 * Анализ изображения с текстом
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  additionalText?: string
): Promise<AnalysisResult> {
  const systemPrompt = `Ты AI-эксперт по анализу изображений в сфере строительства.
Определи что изображено и извлеки данные.

## ГЛАВНОЕ ПРАВИЛО:
Определяй РЕАЛЬНО что на фото. Не выдумывай!

## ТИП ОБЪЯВЛЕНИЯ (messageType):
- "offer" - фото товара для продажи (по умолчанию)
- "request" - если в тексте явно сказано что хотят купить
- "spam" - реклама, не связанная со строительством
- "other" - не удается определить

## КАТЕГОРИЯ ТОВАРА (productCategory):
- "metal" - металлопрокат (труба, арматура, швеллер, балка, лист, профиль, круг, квадрат)
- "construction" - металлоконструкции и здания (ЛСТК, ангар, каркас, ферма, колонны, баки, ёмкости, металлоизделия)
- "metalwork" - металлообработка (резка, гибка, сварка, токарные работы, фрезеровка)
- "building" - строительные материалы (сендвич-панель, профлист, кровля, утеплитель, кирпич, бетон)
- "other" - прочее

## НОМЕНКЛАТУРА (nomenclature):
Укажи что РЕАЛЬНО видно на фото:
- Труба, Арматура, Швеллер, Балка, Лист, Профнастил
- ЛСТК-каркас, Ферма, Ангар, Металлоконструкция, Бак, Ёмкость
- Сендвич-панель, Профлист, Кровля

ВАЖНО: Отвечай ТОЛЬКО валидным JSON без markdown.`;

  const userContent: ContentPart[] = [
    {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
      },
    },
    {
      type: "text",
      text: `Определи что на изображении.
${additionalText ? `Текст сообщения: "${additionalText}"` : ""}

JSON:
{
  "messageType": "request|offer|spam|other",
  "productCategory": "metal|construction|metalwork|building|other|null",
  "nomenclature": "что на фото или null",
  "material": "описание/детали или null",
  "price": число или null,
  "priceUnit": "за тонну|за штуку|за м2|null",
  "quantity": "количество или null",
  "city": "город или null",
  "phone": "телефон или null",
  "confidence": 0.0-1.0
}`,
    },
  ];

  // Используем дорогую модель для изображений
  const response = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ], { model: "vision" });

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleanJson);

    const validMessageTypes = ["request", "offer", "spam", "other"];
    const messageType = validMessageTypes.includes(result.messageType) ? result.messageType : "offer";

    type ProductCategory = "metal" | "construction" | "metalwork" | "building" | "other";
    const validCategories: ProductCategory[] = ["metal", "construction", "metalwork", "building", "other"];
    let productCategory: ProductCategory | null = null;
    if ((messageType === "request" || messageType === "offer") && result.productCategory) {
      // Мапим старые категории на новые
      let cat = result.productCategory;
      if (cat === "materials") cat = "building";
      if (cat === "equipment") cat = "other";
      if (cat === "services") cat = "metalwork";
      productCategory = validCategories.includes(cat) ? cat as ProductCategory : "other";
    }

    return {
      messageType,
      productCategory,
      nomenclature: result.nomenclature || null,
      material: result.material || null,
      price: typeof result.price === "number" ? result.price : null,
      priceUnit: result.priceUnit || null,
      quantity: result.quantity || null,
      city: result.city || null,
      phone: result.phone || null,
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
      rawResponse: response,
    };
  } catch {
    console.error("Failed to parse AI response:", response);
    return {
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
      rawResponse: response,
    };
  }
}

/**
 * Уточнение номенклатуры дорогой моделью
 * Используется для формирования точной номенклатуры в заявках
 */
export interface RefineResult {
  nomenclature: string;  // "Балка 18М", "Труба 159х6"
  category: "metal" | "other";
  material: string;      // Полное описание
}

export async function refineNomenclature(
  messagesText: string[],
  currentData: {
    nomenclature: string | null;
    material: string | null;
    category: string | null;
  }
): Promise<RefineResult> {
  const systemPrompt = `Ты - эксперт по металлопрокату и стройматериалам.
Твоя задача - определить ТОЧНУЮ номенклатуру товара с маркой/размером.

ПРАВИЛА:
1. Номенклатура должна начинаться с ЗАГЛАВНОЙ буквы
2. Включи марку/размер если есть в тексте (например: "Балка 18М", "Труба 159х6", "Арматура А500С")
3. Если марка не указана - используй только название ("Труба", "Арматура")
4. Категория: "metal" для металлопроката, "other" для остального

ПРИМЕРЫ:
- "балка 18м 24 метра" → "Балка 18М"
- "труба 159х6" → "Труба 159х6"
- "арматура 12 а500с" → "Арматура 12 А500С"
- "швеллер 20" → "Швеллер 20"
- "лист 3мм" → "Лист 3мм"

Отвечай ТОЛЬКО валидным JSON.`;

  const userPrompt = `Проанализируй сообщения и определи точную номенклатуру:

СООБЩЕНИЯ:
${messagesText.join('\n---\n')}

ТЕКУЩИЕ ДАННЫЕ:
- Номенклатура: ${currentData.nomenclature || 'не определена'}
- Материал: ${currentData.material || 'не определён'}
- Категория: ${currentData.category || 'не определена'}

Верни JSON:
{
  "nomenclature": "Точное название с маркой/размером",
  "category": "metal или other",
  "material": "Полное описание материала"
}`;

  // Используем дорогую модель для точного определения
  const response = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { model: "vision" });

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleanJson);

    return {
      nomenclature: result.nomenclature || currentData.nomenclature || "Не определено",
      category: result.category === "metal" ? "metal" : "other",
      material: result.material || currentData.material || "",
    };
  } catch {
    console.error("[Refine] Failed to parse response:", response);
    // Fallback: нормализуем текущие данные
    const nom = currentData.nomenclature || "Не определено";
    return {
      nomenclature: nom.charAt(0).toUpperCase() + nom.slice(1),
      category: currentData.category === "metal" ? "metal" : "other",
      material: currentData.material || "",
    };
  }
}

/**
 * Проверка работоспособности API
 */
export async function testConnection(): Promise<{ success: boolean; error?: string; response?: string }> {
  try {
    const response = await chatCompletion([
      { role: "user", content: "Скажи 'API работает!' одним предложением." },
    ]);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
