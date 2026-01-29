"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AdminNav from "../components/AdminNav";
import CRMFilter, { CRMFilterState } from "@/components/admin/CRMFilter";

interface MatchData {
  id: string;
  score: number;
  reason: string | null;
  margin: {
    percent: number | null;
    absolute: number | null;
    note: string | null;
  };
  risks: string[];
  status: string;
  statusNote: string | null;
  createdAt: string;
  contactedAt: string | null;
  dealAt: string | null;
  request: CardData;
  offer: CardData;
}

interface CardData {
  id: string;
  type: string;
  title: string;
  subcategory?: string;
  subcategoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  city?: string;
  price?: number;
  priceUnit?: string;
  quantity?: string;
  description?: string;
  originalText?: string;
  date?: string;
  sourceName?: string;
  hasMedia?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  mediaFileName?: string;
  contacts: {
    name: string | null;
    username: string | null;
    phone: string | null;
  };
}

interface GroupedRequest {
  request: CardData;
  offers: MatchData[];
}

type MatchStatus = "new" | "contacted" | "deal" | "rejected";

const STATUS_LABELS: Record<MatchStatus, string> = {
  new: "Новые",
  contacted: "В работе",
  deal: "Сделки",
  rejected: "Отклонённые",
};

// Расчёт дней назад
const getDaysAgo = (dateStr?: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return `${diff} дн. назад`;
};

export default function CRMPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<MatchStatus, number>>({
    new: 0,
    contacted: 0,
    deal: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<MatchStatus | "all">("all");
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<string | null>(null);
  const [cardFilters, setCardFilters] = useState<CRMFilterState>({
    types: [],
    categories: [],
    subcategories: [],
  });
  const [activePositions, setActivePositions] = useState<Record<string, string>>({});

  const fetchMatches = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/admin/crm/matches?${params}`);
      const data = await res.json();

      setMatches(data.matches || []);
      setStatusCounts(data.statusCounts || { new: 0, contacted: 0, deal: 0, rejected: 0 });
    } catch (error) {
      console.error("Fetch matches error:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Фильтруем матчи по выбранным категориям/подкатегориям
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // Фильтр по категориям
      if (cardFilters.categories.length > 0) {
        const matchCats = [match.request.categorySlug, match.offer.categorySlug].filter(Boolean);
        if (!matchCats.some((cat) => cardFilters.categories.includes(cat!))) {
          return false;
        }
      }

      // Фильтр по подкатегориям
      if (cardFilters.subcategories.length > 0) {
        const matchSubs = [match.request.subcategoryId, match.offer.subcategoryId].filter(Boolean);
        if (!matchSubs.some((sub) => cardFilters.subcategories.includes(sub!))) {
          return false;
        }
      }

      return true;
    });
  }, [matches, cardFilters]);

  // Группируем матчи по заявкам
  const groupedByRequest = useMemo(() => {
    const groups = new Map<string, GroupedRequest>();

    filteredMatches.forEach((match) => {
      const requestId = match.request.id;
      if (!groups.has(requestId)) {
        groups.set(requestId, {
          request: match.request,
          offers: [],
        });
      }
      groups.get(requestId)!.offers.push(match);
    });

    // Сортируем предложения внутри каждой группы по score
    groups.forEach((group) => {
      group.offers.sort((a, b) => b.score - a.score);
    });

    // Возвращаем массив, отсортированный по лучшему score в группе
    return Array.from(groups.values()).sort(
      (a, b) => (b.offers[0]?.score || 0) - (a.offers[0]?.score || 0)
    );
  }, [filteredMatches]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/admin/crm/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxCandidates: 100,
          maxAIEvaluations: 20,
          aiModel: "lite",
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert(`Найдено кандидатов: ${data.candidates}\nОценено AI: ${data.evaluated}\nСохранено матчей: ${data.saved}`);
        fetchMatches();
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Ошибка поиска матчей");
    } finally {
      setSearching(false);
    }
  };

  const handleStatusChange = async (matchId: string, newStatus: MatchStatus) => {
    try {
      const res = await fetch("/api/admin/crm/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: matchId, status: newStatus }),
      });

      if (res.ok) {
        fetchMatches();
      }
    } catch (error) {
      console.error("Status change error:", error);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("Удалить этот матч?")) return;

    try {
      const res = await fetch(`/api/admin/crm/matches?id=${matchId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchMatches();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-500";
  };

  const getRankBg = (idx: number) => {
    if (idx === 0) return "bg-green-100 border-l-4 border-green-500";
    if (idx === 1) return "bg-green-50 border-l-4 border-green-400";
    if (idx === 2) return "bg-yellow-50 border-l-4 border-yellow-400";
    return "bg-white border-l-4 border-gray-200";
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">TOP</span>;
    if (idx < 3) return <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded font-medium">#{idx + 1}</span>;
    return <span className="text-gray-500 text-xs font-medium">#{idx + 1}</span>;
  };

  const formatContact = (contacts: CardData["contacts"]) => {
    if (contacts.username) return `@${contacts.username}`;
    if (contacts.name) return contacts.name;
    if (contacts.phone) return contacts.phone;
    return "—";
  };

  // Рендер медиа превью (фото, видео, PDF, документы)
  const renderMediaPreview = (card: CardData) => {
    if (!card.hasMedia || !card.mediaUrl) return null;

    const urlOrName = card.mediaUrl + (card.mediaFileName || "");
    const isImage = card.mediaType === "photo" || urlOrName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = card.mediaType === "video" || urlOrName.match(/\.(mp4|webm|mov)$/i);
    const isPdf = urlOrName.match(/\.pdf$/i);
    const isExcel = urlOrName.match(/\.(xls|xlsx)$/i);
    const isWord = urlOrName.match(/\.(doc|docx)$/i);

    // Для неизвестных типов без расширения - пробуем как изображение
    const tryAsImage = !isImage && !isVideo && !isPdf && !isExcel && !isWord &&
                       !urlOrName.match(/\.(doc|docx|xls|xlsx|mp3|ogg|zip|rar)$/i);

    if (isImage || tryAsImage) {
      return (
        <div className="mt-2">
          <img
            src={card.mediaUrl}
            alt={card.mediaFileName || "Медиа"}
            className="max-w-full max-h-48 rounded border cursor-pointer hover:opacity-90"
            onClick={() => window.open(card.mediaUrl, '_blank')}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex gap-2 mt-2">
            <a
              href={card.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              🔍 Открыть
            </a>
            <a
              href={card.mediaUrl}
              download={card.mediaFileName || "file"}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              ⬇️ Скачать
            </a>
          </div>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mt-2">
          <video
            src={card.mediaUrl}
            controls
            className="max-w-full max-h-48 rounded"
          />
          <div className="flex gap-2 mt-2">
            <a
              href={card.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              🔍 Открыть
            </a>
            <a
              href={card.mediaUrl}
              download={card.mediaFileName || "video"}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              ⬇️ Скачать
            </a>
          </div>
        </div>
      );
    }

    // Документы: PDF, Excel, Word и другие
    let icon = "📄";
    let label = "Документ";
    if (isPdf) { icon = "📕"; label = "PDF"; }
    else if (isExcel) { icon = "📊"; label = "Excel"; }
    else if (isWord) { icon = "📝"; label = "Word"; }

    return (
      <div className="mt-2 p-3 bg-gray-100 rounded border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{icon}</span>
          <div className="text-sm font-medium text-gray-700">{card.mediaFileName || label}</div>
        </div>
        <div className="flex gap-3">
          <a
            href={card.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            🔍 Открыть
          </a>
          <a
            href={card.mediaUrl}
            download={card.mediaFileName || label}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            ⬇️ Скачать
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6 max-w-6xl mx-auto">
        <AdminNav />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM: Матчи заявок</h1>
            <p className="text-gray-500 text-sm mt-1">
              {groupedByRequest.length} заявок · {matches.length} предложений
            </p>
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {searching ? "Поиск..." : "🔍 Найти матчи"}
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-700 hover:bg-gray-200"
            }`}
          >
            Все ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
          </button>
          {(Object.keys(STATUS_LABELS) as MatchStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              {STATUS_LABELS[status]} ({statusCounts[status]})
            </button>
          ))}
        </div>

        {/* Main Content with Filter */}
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <CRMFilter
            filters={cardFilters}
            onFilterChange={setCardFilters}
            matches={matches}
          />

          {/* Grouped Requests */}
          <div className="flex-1">
            {groupedByRequest.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">Матчи не найдены</p>
                <p className="text-gray-400 text-sm mt-1">
                  Нажмите &quot;Найти матчи&quot; для поиска совпадений
                </p>
              </div>
            ) : (
              <div className="space-y-4">
            {groupedByRequest.map((group) => (
              <div key={group.request.id} className="rounded-lg overflow-hidden shadow-sm border">
                {/* Request Header */}
                <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                  {/* Left: Click to show request details */}
                  <div
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 flex-1"
                    onClick={() => {
                      if (showRequestDetails === group.request.id) {
                        // Закрываем заявку - сбрасываем всё
                        setShowRequestDetails(null);
                        setExpandedRequest(null);
                        setExpandedOffer(null);
                      } else {
                        // Открываем заявку
                        setShowRequestDetails(group.request.id);
                      }
                    }}
                  >
                    <span className="text-gray-400 text-sm">Заявка:</span>
                    <span className="font-semibold">{group.request.title}</span>
                    {group.request.quantity && (
                      <span className="text-gray-400">· {group.request.quantity}</span>
                    )}
                  </div>
                  {/* Right: Info only */}
                  <div className="flex items-center gap-4 pl-4">
                    <span className="text-gray-400">{group.request.city || "—"}</span>
                    <span className="text-gray-400">{formatContact(group.request.contacts)}</span>
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      {group.offers.length} предл.
                    </span>
                  </div>
                </div>

                {/* Request Details Panel (вариант 11 - иконки) */}
                {showRequestDetails === group.request.id && (
                  <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
                    {/* Сетка 2x2 с иконками */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center">📁</span>
                        <span className="text-gray-400">Категория:</span>
                        <span className="text-gray-100">{group.request.categoryName || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center">👤</span>
                        <span className="text-gray-400">Контакт:</span>
                        <span className="text-gray-100 font-medium">
                          {group.request.contacts.name || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center">⏱️</span>
                        <span className="text-gray-400">Возраст:</span>
                        <span className="text-yellow-400 font-medium">{getDaysAgo(group.request.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center">💬</span>
                        <span className="text-gray-400">Telegram:</span>
                        {group.request.contacts.username ? (
                          <a
                            href={`https://t.me/${group.request.contacts.username}`}
                            className="text-blue-400 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            @{group.request.contacts.username}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </div>

                    {/* Дополнительная информация */}
                    <div className="mt-3 pt-3 border-t border-gray-600 flex items-center gap-6 text-xs">
                      {group.request.subcategory && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">📂</span>
                          <span className="text-gray-300">{group.request.subcategory}</span>
                        </div>
                      )}
                      {group.request.sourceName && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">📺</span>
                          <span className="text-gray-300">{group.request.sourceName}</span>
                        </div>
                      )}
                      {group.request.contacts.phone && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">📞</span>
                          <span className="text-gray-300">{group.request.contacts.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Кнопка переписки */}
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <button
                        onClick={() => setShowChat(showChat === group.request.id ? null : group.request.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        💬 {showChat === group.request.id ? "Скрыть" : "Показать"} оригинал сообщения
                      </button>
                      {showChat === group.request.id && group.request.originalText && (
                        <div className="mt-2 bg-gray-800 rounded p-2 text-gray-300 text-xs italic">
                          &quot;{group.request.originalText}&quot;
                        </div>
                      )}
                    </div>

                    {/* Медиа заявки */}
                    {group.request.hasMedia && group.request.mediaUrl && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <span className="text-xs text-gray-400 mb-2 block">📎 Вложение:</span>
                        {renderMediaPreview(group.request)}
                      </div>
                    )}
                  </div>
                )}

                {/* Position Tabs - показываем когда раскрыты детали */}
                {showRequestDetails === group.request.id && (() => {
                  // Создаём виртуальную позицию из title если нет positions
                  const positions = [{ id: "main", name: group.request.title, quantity: group.request.quantity }];
                  const isExpanded = expandedRequest === group.request.id;

                  return (
                    <div className="bg-gray-100 border-t">
                      {positions.map(pos => (
                        <button
                          key={pos.id}
                          onClick={() => setExpandedRequest(isExpanded ? null : group.request.id)}
                          className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 hover:bg-gray-50 ${
                            isExpanded
                              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-700'
                          }`}
                        >
                          <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          <span>{pos.name}</span>
                          {pos.quantity && <span className="text-gray-400">· {pos.quantity}</span>}
                          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-1">
                            {group.offers.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Offers Table */}
                {expandedRequest === group.request.id && (
                  <div className="bg-white">
                    {group.offers.map((match, idx) => (
                      <div key={match.id}>
                        {/* Offer Row */}
                        <div
                          className={`flex items-center px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 ${getRankBg(idx)}`}
                          onClick={() => setExpandedOffer(
                            expandedOffer === match.id ? null : match.id
                          )}
                        >
                          <div className="w-16">{getRankBadge(idx)}</div>
                          <span className={`w-14 font-bold ${getScoreColor(match.score)}`}>
                            {match.score}%
                          </span>
                          <span className="flex-1">
                            <span className="font-semibold text-gray-900">{match.offer.title}</span>
                            {match.offer.subcategory && (
                              <span className="text-gray-500 ml-2">· {match.offer.subcategory}</span>
                            )}
                          </span>
                          <span className="w-28 text-gray-800">{match.offer.city || "—"}</span>
                          <span className="w-32 text-right font-bold text-gray-900">
                            {match.offer.price ? `${match.offer.price.toLocaleString()} ₽` : "—"}
                          </span>
                          <span className="w-28 text-gray-600 text-xs text-right">
                            {formatContact(match.offer.contacts)}
                          </span>
                          <div className="w-24 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(match.id, "contacted");
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                            >
                              Выбрать
                            </button>
                          </div>
                        </div>

                        {/* Expanded Offer Details - 3 Cards Layout */}
                        {expandedOffer === match.id && (
                          <div className="px-4 py-3 bg-gray-50 border-t border-b text-sm">
                            <div className="grid grid-cols-3 gap-3">
                              {/* Card 1: Info */}
                              <div className="bg-white rounded-lg p-3 border">
                                <p className="text-xs text-gray-500 mb-2 font-medium">📊 Информация</p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Возраст:</span>
                                    <span className="font-medium text-yellow-600">{getDaysAgo(match.offer.date)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Категория:</span>
                                    <span className="text-gray-800 truncate ml-2">{match.offer.categoryName || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Источник:</span>
                                    <span className="text-gray-800 truncate ml-2">{match.offer.sourceName || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Наличие:</span>
                                    <span className="text-gray-800 truncate ml-2">{match.offer.quantity || "—"}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Card 2: Contacts */}
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <p className="text-xs text-green-600 mb-2 font-medium">👤 Контакты</p>
                                <p className="font-semibold text-gray-900">{match.offer.contacts.name || "—"}</p>
                                {match.offer.contacts.username && (
                                  <a
                                    href={`https://t.me/${match.offer.contacts.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    @{match.offer.contacts.username}
                                  </a>
                                )}
                                <p className="text-gray-600 text-sm mt-1">{match.offer.contacts.phone || "—"}</p>
                              </div>
                              {/* Card 3: AI Analysis */}
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <p className="text-xs text-blue-600 mb-2 font-medium">🤖 AI анализ</p>
                                {match.reason && (
                                  <p className="text-sm text-gray-700 mb-2">💡 {match.reason}</p>
                                )}
                                {match.risks.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {match.risks.map((risk, i) => (
                                      <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
                                    ))}
                                  </div>
                                )}
                                {match.margin.percent && (
                                  <p className="text-green-600 text-sm mt-2">
                                    💰 Маржа: {match.margin.percent}%
                                    {match.margin.absolute && ` (~${match.margin.absolute.toLocaleString()} ₽)`}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Медиа предложения */}
                            {match.offer.hasMedia && match.offer.mediaUrl && (
                              <div className="mt-3 bg-white rounded-lg p-3 border">
                                <p className="text-xs text-gray-500 mb-2 font-medium">📎 Вложение</p>
                                {renderMediaPreview(match.offer)}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 mt-3">
                              {match.status === "new" && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(match.id, "contacted")}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600"
                                  >
                                    📞 В работу
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(match.id, "rejected")}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                  >
                                    ✕ Отклонить
                                  </button>
                                </>
                              )}
                              {match.status === "contacted" && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(match.id, "deal")}
                                    className="px-4 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
                                  >
                                    ✓ Сделка
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(match.id, "rejected")}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                  >
                                    ✕ Отклонить
                                  </button>
                                </>
                              )}
                              {match.status === "rejected" && (
                                <button
                                  onClick={() => handleStatusChange(match.id, "new")}
                                  className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
                                >
                                  ↩ Вернуть
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(match.id)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
