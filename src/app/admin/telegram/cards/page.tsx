"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AdminNav from "../../components/AdminNav";
import FacetedFilter, { FilterState } from "@/components/admin/FacetedFilter";

interface EnrichedItem {
  name: string;
  mark?: string;
  steel?: string;
  size?: string;
  thickness?: string;
  diameter?: string;
  length?: string;
  quantity?: string;
  weight?: string;
}

interface Price {
  value: number | null;
  currency: string;
  per?: string | null;
  vat?: boolean | null;
  note?: string;
}

interface Contacts {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  name?: string;
}

interface OriginalMessage {
  id: string;
  text: string;
  date: string;
  senderName: string | null;
  senderUsername: string | null;
  senderPhone: string | null;
  hasMedia: boolean;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaFileName: string | null;
  sourceName: string;
  sourceUsername: string | null;
}

interface EnrichedCard {
  rawMessageId: string;
  type: "REQUEST" | "OFFER";
  category: string;
  subcategory: string;
  subcategoryId?: string;
  title: string;
  items: EnrichedItem[];
  services?: string[];
  description?: string;
  price?: Price;
  city?: string;
  region?: string;
  contacts: Contacts;
  company?: string;
  urgency?: string;
  date: string;
  sourceGroup: string;
  mediaFiles: string[];
  enrichedAt: string;
  moderationStatus?: "pending" | "approved" | "rejected";
  moderatedAt?: string;
  originalMessage?: OriginalMessage;
  enrichmentCategory?: {
    id: string;
    name: string;
    slug: string;
  };
}

type ViewMode = "cards" | "list";

export default function CardsPage() {
  const [cards, setCards] = useState<EnrichedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, requests: 0, offers: 0 });
  const [moderating, setModerating] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    categories: [],
    subcategories: [],
    moderation: [],
  });

  // Загружаем все карточки без фильтрации
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем все карточки (фильтрация на клиенте)
      const [statsRes, cardsRes] = await Promise.all([
        fetch("/api/drafts/enrich?action=stats", { cache: "no-store" }),
        fetch("/api/drafts/enrich?limit=500", { cache: "no-store" }),
      ]);

      if (!statsRes.ok || !cardsRes.ok) {
        throw new Error("Ошибка загрузки данных с сервера");
      }

      const [statsData, cardsData] = await Promise.all([
        statsRes.json(),
        cardsRes.json(),
      ]);

      setStats({
        total: statsData.total || 0,
        requests: statsData.requests || 0,
        offers: statsData.offers || 0,
      });
      setCards(cardsData.cards || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  // Фильтрация карточек на клиенте
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Фильтр по типу
      if (filters.types.length > 0 && !filters.types.includes(card.type)) {
        return false;
      }

      // Фильтр по категории (slug)
      if (filters.categories.length > 0) {
        const cardCategorySlug = card.enrichmentCategory?.slug;
        if (!cardCategorySlug || !filters.categories.includes(cardCategorySlug)) {
          return false;
        }
      }

      // Фильтр по подкатегории
      if (filters.subcategories.length > 0) {
        if (!card.subcategoryId || !filters.subcategories.includes(card.subcategoryId)) {
          return false;
        }
      }

      // Фильтр по модерации
      if (filters.moderation.length > 0) {
        const status = card.moderationStatus || "pending";
        if (!filters.moderation.includes(status)) {
          return false;
        }
      }

      return true;
    });
  }, [cards, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Возраст объявления в днях
  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "сегодня";
    if (diffDays === 1) return "1 день";
    if (diffDays < 5) return `${diffDays} дня`;
    return `${diffDays} дн.`;
  };

  const formatPrice = (price?: Price) => {
    if (!price?.value) return null;
    const formatted = new Intl.NumberFormat("ru-RU").format(price.value);
    let result = `${formatted} ${price.currency === "RUB" ? "руб." : price.currency}`;
    if (price.per) result += ` / ${price.per}`;
    if (price.vat === true) result += " с НДС";
    if (price.vat === false) result += " без НДС";
    return result;
  };

  // Получить реальный Telegram контакт
  const getRealTelegram = (card: EnrichedCard) => {
    // Если в контактах "личка" - берём username отправителя
    if (card.contacts.telegram === "личка" || card.contacts.telegram === "ЛС") {
      return card.originalMessage?.senderUsername || card.contacts.telegram;
    }
    return card.contacts.telegram;
  };

  // Получить все контакты (из карточки + из оригинального сообщения)
  const getAllContacts = (card: EnrichedCard) => {
    const contacts: { type: string; value: string; link?: string }[] = [];

    // Телефон из карточки или из отправителя
    const phone = card.contacts.phone || card.originalMessage?.senderPhone;
    if (phone) {
      contacts.push({ type: "Телефон", value: phone, link: `tel:${phone}` });
    }

    // WhatsApp
    if (card.contacts.whatsapp) {
      const waNumber = card.contacts.whatsapp.replace(/\D/g, "");
      contacts.push({
        type: "WhatsApp",
        value: card.contacts.whatsapp,
        link: `https://wa.me/${waNumber}`
      });
    }

    // Telegram
    const telegram = getRealTelegram(card);
    if (telegram && telegram !== "личка" && telegram !== "ЛС") {
      const tgLink = telegram.startsWith("@")
        ? `https://t.me/${telegram.substring(1)}`
        : `https://t.me/${telegram}`;
      contacts.push({ type: "Telegram", value: telegram, link: tgLink });
    } else if (card.originalMessage?.senderUsername) {
      contacts.push({
        type: "Telegram",
        value: `@${card.originalMessage.senderUsername}`,
        link: `https://t.me/${card.originalMessage.senderUsername}`
      });
    }

    // Email
    if (card.contacts.email) {
      contacts.push({
        type: "Email",
        value: card.contacts.email,
        link: `mailto:${card.contacts.email}`
      });
    }

    return contacts;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Модерация карточки
  const handleModeration = async (rawMessageId: string, status: "approved" | "rejected") => {
    setModerating(rawMessageId);
    try {
      const res = await fetch("/api/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawMessageId, status }),
      });

      if (!res.ok) {
        throw new Error("Ошибка модерации");
      }

      // Обновляем карточку локально
      setCards(prev => prev.map(card =>
        card.rawMessageId === rawMessageId
          ? { ...card, moderationStatus: status, moderatedAt: new Date().toISOString() }
          : card
      ));
    } catch (error) {
      console.error("Ошибка модерации:", error);
      alert("Не удалось изменить статус");
    } finally {
      setModerating(null);
    }
  };

  // Рендер медиа превью
  const renderMediaPreview = (card: EnrichedCard) => {
    const media = card.originalMessage;
    if (!media?.hasMedia || !media.mediaUrl) return null;

    // Проверяем расширение в URL и имени файла
    const urlOrName = media.mediaUrl + (media.mediaFileName || "");
    const isImage = media.mediaType === "photo" ||
                   urlOrName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = media.mediaType === "video" ||
                   urlOrName.match(/\.(mp4|webm|mov)$/i);
    const isPdf = urlOrName.match(/\.pdf$/i);

    // Для неизвестных типов без расширения - пробуем показать как изображение
    const tryAsImage = !isImage && !isVideo && !isPdf &&
                       !urlOrName.match(/\.(doc|docx|xls|xlsx|mp3|ogg)$/i);

    if (isImage || tryAsImage) {
      return (
        <div className="mt-3">
          <img
            src={media.mediaUrl}
            alt={media.mediaFileName || "Медиа"}
            className="max-w-full max-h-64 rounded-lg border"
            onError={(e) => {
              // Если не загрузилось как изображение - скрываем
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mt-3">
          <video
            src={media.mediaUrl}
            controls
            className="max-w-full max-h-64 rounded-lg"
          />
        </div>
      );
    }

    // Документ (PDF, DOC, XLS и т.д.)
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border flex items-center gap-2">
        <span className="text-2xl">{isPdf ? "📕" : "📄"}</span>
        <div>
          <div className="font-medium text-sm">{media.mediaFileName || "Документ"}</div>
          <a
            href={media.mediaUrl}
            target="_blank"
            className="text-xs text-blue-600 hover:underline"
          >
            Скачать
          </a>
        </div>
      </div>
    );
  };

  // Рендер карточки (компактная + раскрывающаяся)
  const renderCard = (card: EnrichedCard) => {
    const isExpanded = expandedId === card.rawMessageId;
    const contacts = getAllContacts(card);

    // === КОМПАКТНЫЙ ВИД (свёрнутая карточка) ===
    if (!isExpanded) {
      return (
        <div
          key={card.rawMessageId}
          className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer"
          onClick={() => toggleExpand(card.rawMessageId)}
        >
          <div className="flex items-center gap-3 p-3">
            {/* Тип */}
            <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
              card.type === "REQUEST"
                ? "bg-blue-500 text-white"
                : "bg-green-500 text-white"
            }`}>
              {card.type === "REQUEST" ? "ЗАЯВКА" : "ПРЕДЛОЖ."}
            </span>

            {/* Заголовок */}
            <span className="font-medium flex-1 truncate text-gray-900">{card.title}</span>

            {/* Подкатегория */}
            <span className="text-gray-500 text-sm hidden lg:block truncate max-w-[120px]">
              {card.subcategory}
            </span>

            {/* Город */}
            {card.city && (
              <span className="text-gray-500 text-sm hidden md:flex items-center gap-1">
                📍 {card.city}
              </span>
            )}

            {/* Возраст */}
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium flex-shrink-0">
              {getDaysAgo(card.date)}
            </span>

            {/* Компания */}
            {card.company && (
              <span className="text-purple-600 text-sm hidden xl:flex items-center gap-1 flex-shrink-0">
                🏢 {card.company}
              </span>
            )}

            {/* Контакт */}
            {contacts.length > 0 ? (
              <a
                href={contacts[0].link}
                target="_blank"
                className="text-blue-500 hover:underline text-sm hidden sm:block flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                @{contacts[0].value.replace('@', '')}
              </a>
            ) : (
              <span className="text-orange-500 text-xs hidden sm:block flex-shrink-0">⚠️</span>
            )}

            {/* Кнопки модерации */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeration(card.rawMessageId, "approved");
                }}
                disabled={moderating === card.rawMessageId || card.moderationStatus === "approved"}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                  card.moderationStatus === "approved"
                    ? "bg-green-100 text-green-700"
                    : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                }`}
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeration(card.rawMessageId, "rejected");
                }}
                disabled={moderating === card.rawMessageId || card.moderationStatus === "rejected"}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                  card.moderationStatus === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      );
    }

    // === ДЕТАЛЬНЫЙ ВИД (раскрытая карточка) ===
    return (
      <div
        key={card.rawMessageId}
        className="bg-white rounded-lg shadow-lg ring-2 ring-blue-500 overflow-hidden"
      >
        {/* Header */}
        <div
          className={`px-4 py-3 cursor-pointer ${
            card.type === "REQUEST" ? "bg-blue-500 text-white" : "bg-green-500 text-white"
          }`}
          onClick={() => toggleExpand(card.rawMessageId)}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm opacity-80">
                {card.type === "REQUEST" ? "ЗАЯВКА" : "ПРЕДЛОЖЕНИЕ"}
              </span>
              <h3 className="font-semibold text-lg">{card.title}</h3>
            </div>
            <span className="text-sm opacity-80">{card.category}</span>
          </div>
        </div>

        {/* Body - две колонки */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Левая колонка */}
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Подкатегория</div>
                <div className="text-sm">{card.subcategory}</div>
              </div>

              {/* Позиции */}
              {card.items.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Позиции</div>
                  <ul className="text-sm">
                    {card.items.map((item, i) => (
                      <li key={i}>• {item.name}{item.quantity && ` (${item.quantity})`}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Описание */}
              {card.description && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Описание</div>
                  <div className="text-sm bg-gray-50 p-2 rounded">{card.description}</div>
                </div>
              )}

              {/* Цена */}
              {formatPrice(card.price) && (
                <div className="text-lg font-bold text-green-600">
                  {formatPrice(card.price)}
                </div>
              )}

              <div className="flex gap-4 text-sm">
                <span>📅 {formatDate(card.date)}</span>
                <span className="px-2 py-0.5 bg-gray-200 rounded">{getDaysAgo(card.date)}</span>
              </div>
            </div>

            {/* Правая колонка */}
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Локация</div>
                <div className="text-sm">📍 {card.city || "Не указано"}{card.region && `, ${card.region}`}</div>
              </div>

              {card.company && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Компания</div>
                  <div className="text-sm text-purple-600">🏢 {card.company}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-gray-500 mb-1">Контакты</div>
                {contacts.length > 0 ? (
                  <div className="space-y-1 text-sm">
                    {contacts.map((c, i) => (
                      <div key={i}>
                        {c.link ? (
                          <a
                            href={c.link}
                            target="_blank"
                            className="text-blue-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.type === "Telegram" ? "👤" : c.type === "Email" ? "📧" : "📞"} {c.value}
                          </a>
                        ) : (
                          <span>{c.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                      ⚠️ Без контактов
                    </span>
                    {card.originalMessage && (
                      <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blue-600 font-medium">🔍 Поиск:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(card.originalMessage?.text?.substring(0, 50) || card.title);
                            }}
                            className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Копировать
                          </button>
                        </div>
                        <p className="text-blue-800 font-mono bg-white p-1 rounded border text-xs">
                          {card.originalMessage.text?.substring(0, 40)}...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Источник</div>
                <div className="text-sm">
                  <a
                    href={`https://t.me/${card.originalMessage?.sourceUsername}`}
                    target="_blank"
                    className="text-blue-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {card.sourceGroup}
                  </a>
                </div>
              </div>

              {/* Медиа превью */}
              {card.originalMessage?.hasMedia && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Медиа</div>
                  {renderMediaPreview(card)}
                </div>
              )}
            </div>
          </div>

          {/* Оригинальное сообщение */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-500 mb-2">Оригинальное сообщение:</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
              {card.originalMessage?.text || "Текст недоступен"}
            </div>
          </div>
        </div>

        {/* Footer - модерация */}
        <div className="border-t px-4 py-3 flex justify-between items-center bg-gray-50">
          <div>
            {card.moderationStatus === "approved" && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Одобрено</span>
            )}
            {card.moderationStatus === "rejected" && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">✕ Отклонено</span>
            )}
            {(!card.moderationStatus || card.moderationStatus === "pending") && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⏳ На модерации</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleModeration(card.rawMessageId, "approved");
              }}
              disabled={moderating === card.rawMessageId || card.moderationStatus === "approved"}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                card.moderationStatus === "approved"
                  ? "bg-green-100 text-green-700"
                  : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              }`}
            >
              ✓ Одобрить
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleModeration(card.rawMessageId, "rejected");
              }}
              disabled={moderating === card.rawMessageId || card.moderationStatus === "rejected"}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                card.moderationStatus === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              }`}
            >
              ✕ Отклонить
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендер строки списка
  const renderListItem = (card: EnrichedCard) => {
    const isExpanded = expandedId === card.rawMessageId;
    const contacts = getAllContacts(card);

    return (
      <div
        key={card.rawMessageId}
        className="bg-white border-b hover:bg-gray-50"
      >
        {/* Основная строка */}
        <div
          className="flex items-center gap-4 px-4 py-3 cursor-pointer"
          onClick={() => toggleExpand(card.rawMessageId)}
        >
          {/* Тип */}
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            card.type === "REQUEST"
              ? "bg-blue-100 text-blue-700"
              : "bg-green-100 text-green-700"
          }`}>
            {card.type === "REQUEST" ? "Заявка" : "Предлож."}
          </span>

          {/* Заголовок */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900 truncate">{card.title}</div>
              {/* Количество позиций */}
              {card.items.length > 0 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">
                  {card.items.length} поз.
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">{card.subcategory}</div>
          </div>

          {/* Город */}
          {card.city && (
            <div className="text-sm text-gray-600 hidden md:block">
              📍 {card.city}
            </div>
          )}

          {/* Иконки медиа */}
          {card.originalMessage?.hasMedia && (
            <div className="text-gray-500 text-sm hidden sm:block">
              {card.originalMessage.mediaType === "photo" ? "📷" : "📄"}
            </div>
          )}

          {/* Цена */}
          {card.price?.value && (
            <div className="text-sm font-medium text-green-600 hidden md:block">
              {formatPrice(card.price)}
            </div>
          )}

          {/* Дата и возраст */}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {formatDate(card.date)}
            <span className="px-1 py-0.5 bg-gray-200 text-gray-700 rounded font-medium">
              {getDaysAgo(card.date)}
            </span>
          </div>

          {/* Первый контакт */}
          {contacts.length > 0 && (
            <div className="text-xs text-gray-600 hidden lg:flex items-center gap-1">
              <span className="text-gray-500">👤</span>
              <span className="truncate max-w-[120px]">
                {contacts[0].value.replace(/\D/g, '').length >= 10
                  ? contacts[0].value.slice(-10)
                  : contacts[0].value
                }
              </span>
            </div>
          )}

          {/* Стрелка */}
          <span className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>

        {/* Раскрытая информация */}
        {isExpanded && (
          <div className="px-4 pb-4 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Левая колонка - данные */}
              <div className="space-y-3">
                {/* Позиции */}
                {card.items.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Позиции:</div>
                    <ul className="text-sm space-y-1">
                      {card.items.map((item, i) => (
                        <li key={i}>• {item.name}{item.size && ` — ${item.size}`}{item.quantity && ` (${item.quantity})`}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Описание */}
                {card.description && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Описание:</div>
                    <div className="text-sm text-gray-700">{card.description}</div>
                  </div>
                )}

                {/* Медиа */}
                {renderMediaPreview(card)}
              </div>

              {/* Правая колонка - контакты и источник */}
              <div className="space-y-3">
                {/* Контакты */}
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Контакты:</div>
                  {contacts.length > 0 ? (
                    <div className="space-y-1">
                      {contacts.map((c, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-gray-500">{c.type}:</span>{" "}
                          {c.link ? (
                            <a href={c.link} target="_blank" className="text-blue-600 hover:underline">
                              {c.value}
                            </a>
                          ) : c.value}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        ⚠️ Без контактов
                      </span>
                      {card.originalMessage?.text && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                          <div className="text-gray-500 mb-1">🔍 Найти в чате:</div>
                          <p className="text-gray-600 font-mono break-all select-all">
                            {card.originalMessage.text.substring(0, 60)}...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Источник */}
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-xs font-medium text-blue-600">Источник:</div>
                  <div className="text-sm">{card.originalMessage?.sourceName}</div>
                  {card.originalMessage?.senderName && (
                    <div className="text-xs text-gray-500">
                      Автор: {card.originalMessage.senderName}
                      {card.originalMessage.senderUsername && ` (@${card.originalMessage.senderUsername})`}
                    </div>
                  )}
                </div>

                {/* Оригинал */}
                <div className="p-2 bg-gray-100 rounded">
                  <div className="text-xs font-medium text-gray-500 mb-1">Оригинал:</div>
                  <div className="text-xs text-gray-600 max-h-32 overflow-auto whitespace-pre-wrap">
                    {card.originalMessage?.text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNav />

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Карточки заявок и предложений
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-500">Всего</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.requests}</div>
            <div className="text-sm text-gray-500">Заявок</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.offers}</div>
            <div className="text-sm text-gray-500">Предложений</div>
          </div>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-6">
          {/* Sidebar Filter */}
          <div className="flex-shrink-0">
            <FacetedFilter
              filters={filters}
              onFilterChange={setFilters}
              onRefresh={fetchData}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* View Toggle & Info */}
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Показано: <span className="font-medium">{filteredCards.length}</span> из {cards.length}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchData()}
                  disabled={loading}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50"
                  title="Обновить"
                >
                  {loading ? "⏳" : "🔄"}
                </button>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === "cards" ? "bg-white shadow text-gray-900" : "text-gray-500"
                    }`}
                  >
                    Карточки
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"
                    }`}
                  >
                    Список
                  </button>
                </div>
              </div>
            </div>

            {/* Cards/List */}
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-pulse">Загрузка данных...</div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">{error}</div>
                <button
                  onClick={() => fetchData()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Попробовать снова
                </button>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {cards.length === 0
                  ? "Нет обогащённых карточек. Запустите обогащение на странице черновиков."
                  : "Нет карточек по выбранным фильтрам. Попробуйте изменить фильтры."}
              </div>
            ) : viewMode === "cards" ? (
              <div className="space-y-2">
                {filteredCards.map(renderCard)}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {filteredCards.map(renderListItem)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
