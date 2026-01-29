/**
 * Типы для системы обогащения
 */

export interface EnrichedItem {
  name: string;
  mark?: string;
  steel?: string;
  gost?: string;
  size?: string;
  thickness?: string;
  diameter?: string;
  length?: string;
  quantity?: string;
  weight?: string;
  condition?: string;
  capacity?: string;
}

export interface Price {
  value: number | null;
  currency: string;
  per?: string | null;
  vat?: boolean | null;
  note?: string;
}

export interface Contacts {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  name?: string;
}

export interface EnrichedCard {
  // Идентификация
  rawMessageId: string;
  type: "REQUEST" | "OFFER";

  // Категоризация
  category: string;
  subcategory: string;
  subcategoryId?: string;  // ID из справочника подкатегорий
  title: string;

  // Позиции
  items: EnrichedItem[];
  services?: string[];
  description?: string;

  // Цена
  price?: Price;

  // Локация
  city?: string;
  region?: string;

  // Контакты
  contacts: Contacts;
  company?: string;

  // Срочность
  urgency?: "срочно" | "стандарт";

  // Метаданные
  date: Date;
  sourceGroup: string;
  mediaFiles: string[];

  // AI метаданные
  enrichedAt: Date;
  aiModel: string;
  confidence: number;

  // Категория обогащения
  enrichmentCategoryId?: string;
}

export interface RawMessageForEnrichment {
  id: string;
  text: string | null;
  aiMessageType: "request" | "offer";
  aiConfidence: number | null;
  date: Date;
  hasMedia: boolean;
  mediaType?: string | null;
  mediaFileName?: string | null;
  mediaUrl?: string | null;
  source: {
    name: string;
  };
}

export interface PromptContext {
  text: string;
  messageType: "request" | "offer";
  hasMedia: boolean;
  mediaType?: string | null;
  mediaFileName?: string | null;
}

export interface JobState {
  shouldStop: boolean;
  status: "pending" | "running" | "completed" | "stopped" | "error";
}

export interface StartJobOptions {
  categoryId?: string;  // Опционально для uncategorized режима
  limit?: number | "all";
  batchSize?: number;
  delayMs?: number;
  aiModel?: "lite" | "smart";
  uncategorized?: boolean;  // Режим для сообщений без категории
}
