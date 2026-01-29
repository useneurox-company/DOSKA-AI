/**
 * Сборка промптов для обогащения
 * Базовый промпт + категорийный промпт из БД
 */

import { PromptContext } from "./types";

// Базовый промпт - общие правила для всех категорий
const DEFAULT_BASE_PROMPT = `Ты — AI-эксперт по извлечению структурированных данных из объявлений.

## ОБЩИЕ ПРАВИЛА

### Контакты — извлекай ВСЕ:
- Телефоны: +7..., 8..., любые форматы → нормализуй в +7XXXXXXXXXX
- WhatsApp: часто совпадает с телефоном, ищи "WA", "ватсап", "вотсап"
- Telegram: @username, "телега", "ТГ", "в личку"
- Email: любые адреса xxx@xxx.xx
- Имя контакта: если указано

### Цены:
- "500 тр" = 500000 руб
- "1.5 млн" = 1500000 руб
- "45 000 руб/тн" → value: 45000, per: "тонна"
- "с НДС" → vat: true
- "без НДС" → vat: false

### Города:
- Прямое упоминание: "в Москве", "г. Липецк", "МО"
- Код телефона: +7495 = Москва, +7812 = СПб
- Сокращения: "Мск" = Москва, "СПб" = Санкт-Петербург

### Подкатегория (subcategory) — КРИТИЧНО:
- subcategory должна быть КОРОТКОЙ: 1-2 слова БЕЗ размеров и характеристик
- "Арматура 12мм А500С" → subcategory: "Арматура" (размеры в items)
- "Труба профильная 100х100" → subcategory: "Труба профильная"
- "Лист горячекатаный 8мм" → subcategory: "Лист г/к"
- "Балка двутавровая 20М" → subcategory: "Балка"
- НЕ включай в subcategory: размеры, диаметры, толщины, марки стали, ГОСТ

### ВАЖНО: description НЕ должен содержать контакты!
- В поле "description" ЗАПРЕЩЕНЫ: телефоны, @username, email, WhatsApp номера
- ВСЕ контакты должны быть ТОЛЬКО в объекте "contacts"
- Если в тексте есть "писать на WA +7..." — телефон → contacts.whatsapp, фразу убрать из description
- Если в тексте есть "@username" — перенести в contacts.telegram, убрать из description
- Описание должно содержать ТОЛЬКО информацию о товаре/услуге, БЕЗ способов связи

## ФОРМАТ ОТВЕТА (JSON)

{
  "category": "категория из списка",
  "subcategory": "1-2 слова БЕЗ размеров (Арматура, Труба профильная, Лист г/к)",
  "title": "краткий заголовок до 60 символов",
  "items": [
    {
      "name": "название позиции",
      "mark": "марка/номер",
      "steel": "марка стали",
      "gost": "ГОСТ",
      "size": "размеры",
      "thickness": "толщина",
      "diameter": "диаметр",
      "length": "длина",
      "quantity": "количество с единицами",
      "weight": "вес"
    }
  ],
  "services": ["список услуг если OFFER"],
  "description": "доп. описание",
  "price": {
    "value": число или null,
    "currency": "RUB",
    "per": "шт" | "тонна" | "м" | "м2" | null,
    "vat": true | false | null
  },
  "city": "город",
  "region": "регион",
  "contacts": {
    "phone": "+7XXXXXXXXXX",
    "whatsapp": "+7XXXXXXXXXX",
    "telegram": "@username",
    "email": "email@domain.ru",
    "name": "имя контакта"
  },
  "company": "компания если есть",
  "urgency": "срочно" | "стандарт" | null
}

Верни ТОЛЬКО JSON без пояснений.`;

/**
 * Собирает финальный промпт из базового и категорийного
 */
export async function buildPrompt(
  prisma: any,
  categoryId: string,
  context: PromptContext
): Promise<string> {
  // Загружаем категорию с её промптом
  const category = await prisma.enrichmentCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  // Собираем финальный промпт
  const finalPrompt = `${DEFAULT_BASE_PROMPT}

## СПЕЦИФИКА КАТЕГОРИИ: ${category.name}

${category.categoryPrompt}

## СООБЩЕНИЕ ДЛЯ ОБРАБОТКИ

Тип: ${context.messageType === "request" ? "ЗАЯВКА НА ПОКУПКУ" : "ПРЕДЛОЖЕНИЕ"}
${context.hasMedia ? `Файл: ${context.mediaType || "медиа"}${context.mediaFileName ? ` "${context.mediaFileName}"` : ""}` : ""}

Текст:
"${context.text}"`;

  return finalPrompt;
}

/**
 * Получить базовый промпт (для тестов или отладки)
 */
export function getBasePrompt(): string {
  return DEFAULT_BASE_PROMPT;
}

/**
 * Промпт для сообщений БЕЗ категории - AI сам определяет категорию
 */
export async function buildUncategorizedPrompt(
  prisma: any,
  context: PromptContext
): Promise<string> {
  // Загружаем список активных категорий с их описаниями
  const categories = await prisma.enrichmentCategory.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, description: true },
    orderBy: { sortOrder: "asc" },
  });

  const categoryList = categories
    .map((c: { slug: string; name: string; description: string | null }) =>
      `- ${c.slug}: ${c.name}${c.description ? ` (${c.description})` : ""}`
    )
    .join("\n");

  const finalPrompt = `${DEFAULT_BASE_PROMPT}

## ОПРЕДЕЛЕНИЕ КАТЕГОРИИ

Сначала определи категорию товара/услуги из списка:
${categoryList}

В ответ добавь поле "productCategory" с одним из slug: ${categories.map((c: { slug: string }) => c.slug).join(", ")}

Если не подходит ни одна категория, используй "construction" (Металлоконструкции) как fallback.

## СООБЩЕНИЕ ДЛЯ ОБРАБОТКИ

Тип: ${context.messageType === "request" ? "ЗАЯВКА НА ПОКУПКУ" : "ПРЕДЛОЖЕНИЕ"}
${context.hasMedia ? `Файл: ${context.mediaType || "медиа"}${context.mediaFileName ? ` "${context.mediaFileName}"` : ""}` : ""}

Текст:
"${context.text}"`;

  return finalPrompt;
}
