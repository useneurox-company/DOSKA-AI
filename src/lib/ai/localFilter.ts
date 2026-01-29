/**
 * Этап 0: Локальный фильтр
 * Отсекает очевидный мусор БЕЗ вызова API (бесплатно)
 * Экономит ~30% токенов
 */

/**
 * Паттерны очевидного мусора - точно OTHER
 */
const SPAM_PATTERNS: RegExp[] = [
  // Только эмодзи (распространённые)
  /^[👍👌✅❌🙏😊😂🤣👏🔥💪🤝😁😄😅🙌👀💯🎉❤️😍🥰😎👋✌️🤙\s]+$/,

  // Короткие ответы
  /^(да|нет|ок|ага|угу|ясно|понял|принял|хорошо|отлично|норм|ладно|есть|нету)[.!?]*$/i,

  // Благодарности
  /^(спасибо|спс|благодарю|thanks|thx)[!.]*$/i,

  // Ответы в личку
  /^(написал|написала|напишу|скинул|скинула|отправил|отправила)\s*(в\s*)?(лс|личку|pm|лички|директ)[.!?]*$/i,

  // Просто плюсики/минусики
  /^[+\-]{1,5}$/,

  // Просто упоминание
  /^@[\w]+[.!?]*$/,

  // Междометия
  /^(ахах|хаха|ох|эх|ого|вау|ничего себе|круто|класс|супер|огонь)[!.]*$/i,

  // Подтверждения
  /^(так точно|верно|точно|именно|согласен|согласна|плюсую)[.!]*$/i,

  // Вопросы без контекста
  /^(а\?|да\?|ну\?|и\?|что\?)[.!?]*$/i,
];

/**
 * Паттерны которые ТОЧНО заявки (можно сразу маркировать)
 * Редко встречаются в чистом виде, поэтому не skip, а hint
 */
const REQUEST_HINT_PATTERNS: RegExp[] = [
  /^#куплю\b/i,
  /^#заявка\b/i,
  /^#ищу\b/i,
];

const OFFER_HINT_PATTERNS: RegExp[] = [
  /^#продам\b/i,
  /^#предложение\b/i,
  /^#услуги\b/i,
];

export interface LocalFilterResult {
  /** true = можно пропустить API, результат известен */
  skip: boolean;
  /** Тип если skip=true */
  type?: "other" | "request" | "offer";
  /** Уверенность 0-1 */
  confidence?: number;
  /** Причина */
  reason?: string;
  /** Подсказка для API (не skip, но есть hint) */
  hint?: "request" | "offer";
}

/**
 * Локальный фильтр - Этап 0
 *
 * @param text - текст сообщения
 * @returns результат фильтрации
 */
export function localFilter(text: string | null): LocalFilterResult {
  // Пустое сообщение
  if (!text || text.trim().length === 0) {
    return {
      skip: true,
      type: "other",
      confidence: 1.0,
      reason: "пустое сообщение",
    };
  }

  const trimmed = text.trim();

  // Слишком короткое (меньше 3 символов)
  if (trimmed.length < 3) {
    return {
      skip: true,
      type: "other",
      confidence: 0.99,
      reason: "слишком короткое",
    };
  }

  // Проверка на спам-паттерны
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        skip: true,
        type: "other",
        confidence: 0.95,
        reason: "локальный фильтр: мусор",
      };
    }
  }

  // Проверка на хинты заявок (не skip, но подсказка для API)
  for (const pattern of REQUEST_HINT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        skip: false,
        hint: "request",
      };
    }
  }

  for (const pattern of OFFER_HINT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        skip: false,
        hint: "offer",
      };
    }
  }

  // Требует анализа API
  return { skip: false };
}

/**
 * Статистика для отладки
 */
export function testLocalFilter(messages: string[]): {
  total: number;
  skipped: number;
  skippedPercent: number;
  samples: { text: string; result: LocalFilterResult }[];
} {
  const results = messages.map((text) => ({
    text: text.substring(0, 50),
    result: localFilter(text),
  }));

  const skipped = results.filter((r) => r.result.skip).length;

  return {
    total: messages.length,
    skipped,
    skippedPercent: Math.round((skipped / messages.length) * 100),
    samples: results.slice(0, 10),
  };
}
