/**
 * Санитизация описания — удаление контактов из текста
 * Контакты должны быть только в объекте contacts, не в description
 */

// Регулярные выражения для поиска контактов
const PHONE_REGEX = /(?:\+7|8|7)[\s\-\(\)]*\d{3}[\s\-\(\)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/g;
const USERNAME_REGEX = /@[a-zA-Z][a-zA-Z0-9_]{3,}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// WhatsApp с разными написаниями
const WHATSAPP_PATTERNS = [
  /(?:WA|WhatsApp|ватсап|вотсап|вацап|Вотсап|Ватсап|w\/a|W\/A)[\s:.,]*(?:\+?7|8)?[\s\-\(\)]*\d[\d\s\-\(\)]{9,}/gi,
  /(?:\+?7|8)[\d\s\-\(\)]{10,}[\s]*(?:WA|WhatsApp|ватсап|вотсап|вацап)/gi,
];

// Telegram с разными написаниями
const TELEGRAM_PATTERNS = [
  /(?:ТГ|телега|telegram|тг|Телеграм|телеграм|t\.me\/)[\s:.,]*@?[a-zA-Z][a-zA-Z0-9_]{3,}/gi,
  /в\s+(?:телегу|тг|телеграм)[\s:.,]*@?[a-zA-Z0-9_]+/gi,
];

// Фразы-маркеры для полного удаления (вместе с номером)
const CONTACT_PHRASES = [
  /писать\s+(?:строго\s+)?(?:на|в)\s+(?:WA|WhatsApp|ватсап|телегу?|ТГ|личку)[^\n.,]*/gi,
  /(?:звонить|писать|обращаться|связь|контакт)[\s]*[:—\-]?[\s]*(?:\+?7|8)[\d\s\-\(\)]+/gi,
  /(?:тел\.?|телефон|моб\.?)[\s]*[:—\-]?[\s]*(?:\+?7|8)[\d\s\-\(\)]+/gi,
  /по\s+(?:вопросам|всем\s+вопросам)[\s:—\-]+(?:\+?7|8)[\d\s\-\(\)]+/gi,
  /с\s+предложениями[\s\S]{0,30}(?:\+?7|8)[\d\s\-\(\)]+/gi,
];

interface ExtractedContacts {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
}

/**
 * Нормализует телефон в формат +7XXXXXXXXXX
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return '+7' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '+7' + digits;
  }
  return '+' + digits;
}

/**
 * Извлекает контакты из текста
 */
export function extractContacts(text: string | undefined): ExtractedContacts {
  if (!text) return {};

  const contacts: ExtractedContacts = {};

  // Извлекаем телефоны
  const phoneMatches = text.match(PHONE_REGEX);
  if (phoneMatches && phoneMatches.length > 0) {
    contacts.phone = normalizePhone(phoneMatches[0]);
  }

  // Проверяем WhatsApp паттерны
  for (const pattern of WHATSAPP_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const phoneInWa = match[0].match(/(?:\+?7|8)[\d\s\-\(\)]{10,}/);
      if (phoneInWa) {
        contacts.whatsapp = normalizePhone(phoneInWa[0]);
      }
      break;
    }
  }

  // Проверяем Telegram паттерны
  for (const pattern of TELEGRAM_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const usernameMatch = match[0].match(/@?([a-zA-Z][a-zA-Z0-9_]{3,})/);
      if (usernameMatch) {
        contacts.telegram = '@' + usernameMatch[1].replace('@', '');
      }
      break;
    }
  }

  // Извлекаем @username (если не нашли через Telegram паттерны)
  if (!contacts.telegram) {
    const usernameMatches = text.match(USERNAME_REGEX);
    if (usernameMatches && usernameMatches.length > 0) {
      contacts.telegram = usernameMatches[0];
    }
  }

  // Извлекаем email
  const emailMatches = text.match(EMAIL_REGEX);
  if (emailMatches && emailMatches.length > 0) {
    contacts.email = emailMatches[0];
  }

  return contacts;
}

/**
 * Удаляет контакты из текста описания
 */
export function sanitizeDescription(text: string | undefined): string | undefined {
  if (!text) return text;

  let result = text;

  // Удаляем фразы-маркеры с контактами
  for (const pattern of CONTACT_PHRASES) {
    result = result.replace(pattern, '');
  }

  // Удаляем WhatsApp паттерны
  for (const pattern of WHATSAPP_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Удаляем Telegram паттерны
  for (const pattern of TELEGRAM_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Удаляем оставшиеся телефоны
  result = result.replace(PHONE_REGEX, '');

  // Удаляем @username
  result = result.replace(USERNAME_REGEX, '');

  // Удаляем email
  result = result.replace(EMAIL_REGEX, '');

  // Чистим множественные пробелы и пустые строки
  result = result
    .replace(/[ \t]+/g, ' ')           // множественные пробелы → один
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // множественные переносы → два
    .replace(/^\s+|\s+$/g, '')          // trim
    .replace(/\s*[,.:;]\s*$/g, '');     // убрать висячие знаки в конце

  return result || undefined;
}

/**
 * Мержит контакты: AI контакты + извлечённые из description
 * Приоритет у извлечённых (они более надёжны)
 */
export function mergeContacts(
  aiContacts: ExtractedContacts | undefined,
  extractedContacts: ExtractedContacts
): ExtractedContacts {
  return {
    ...aiContacts,
    // Перезаписываем только если извлечённые не пустые
    ...(extractedContacts.phone && { phone: extractedContacts.phone }),
    ...(extractedContacts.whatsapp && { whatsapp: extractedContacts.whatsapp }),
    ...(extractedContacts.telegram && { telegram: extractedContacts.telegram }),
    ...(extractedContacts.email && { email: extractedContacts.email }),
  };
}
