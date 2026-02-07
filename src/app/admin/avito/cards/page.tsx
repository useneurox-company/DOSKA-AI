"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface EnrichmentStats {
  total: number;
  enriched: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface EnrichmentJob {
  id: string;
  status: "running" | "completed" | "stopped" | "error";
  total: number;
  processed: number;
  enriched: number;
  errors: number;
  startedAt: string;
  stoppedAt?: string;
  errorMessage?: string;
}

interface EnrichedAd {
  id: string;
  avitoId: string;
  title: string;
  description: string | null;
  price: number | null;
  priceText: string | null;
  city: string | null;
  address: string | null;
  sellerName: string | null;
  url: string;
  images: string[];
  category: string | null;
  enrichedAt: string;
  enrichedData: string | null;
  aiNomenclature: string | null;
  aiMaterial: string | null;
  aiDimensions: string | null;
  aiWeight: string | null;
  aiCondition: string | null;
  aiPhone: string | null;
  aiPricePerUnit: string | null;
  moderationStatus: string;
  parsedAt: string;
  source: { name: string };
}

type ViewMode = "cards" | "list";
type Tab = "enrichment" | "cards";

export default function AvitoCardsPage() {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [job, setJob] = useState<EnrichmentJob | null>(null);
  const [ads, setAds] = useState<EnrichedAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrichCount, setEnrichCount] = useState<number | "all">(20);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("cards");

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/enrich?action=stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }, []);

  // Загрузка статуса задачи
  const loadJob = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/enrich?action=status");
      const data = await res.json();
      setJob(data.job);
    } catch (e) {
      console.error("Failed to load job:", e);
    }
  }, []);

  // Загрузка обогащённых объявлений
  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/avito/enrich?limit=200");
      const data = await res.json();
      setAds(data.ads || []);
    } catch (e) {
      console.error("Failed to load ads:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Запуск обогащения
  const startEnrichment = async () => {
    try {
      await fetch("/api/avito/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: enrichCount }),
      });
      loadJob();
    } catch (e) {
      console.error("Failed to start enrichment:", e);
    }
  };

  // Остановка обогащения
  const stopEnrichment = async () => {
    try {
      await fetch("/api/avito/enrich", { method: "DELETE" });
      loadJob();
    } catch (e) {
      console.error("Failed to stop enrichment:", e);
    }
  };

  // Очистка задачи
  const clearJob = async () => {
    try {
      await fetch("/api/avito/enrich", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      setJob(null);
    } catch (e) {
      console.error("Failed to clear job:", e);
    }
  };

  // Модерация
  const handleModeration = async (adId: string, status: "approved" | "rejected") => {
    setModerating(adId);
    try {
      await fetch("/api/avito/enrich", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "moderate", adId, status }),
      });
      setAds(prev => prev.map(ad =>
        ad.id === adId
          ? { ...ad, moderationStatus: status }
          : ad
      ));
    } catch (e) {
      console.error("Failed to moderate:", e);
    } finally {
      setModerating(null);
    }
  };

  // Начальная загрузка
  useEffect(() => {
    loadStats();
    loadJob();
    loadAds();
  }, [loadStats, loadJob, loadAds]);

  // Автообновление при активной задаче
  useEffect(() => {
    if (job?.status === "running") {
      const interval = setInterval(() => {
        loadJob();
        loadStats();
      }, 2000);
      return () => clearInterval(interval);
    } else if (job?.status === "completed" || job?.status === "stopped") {
      loadAds();
      loadStats();
    }
  }, [job?.status, loadJob, loadStats, loadAds]);

  const formatPrice = (price: number | null, priceText: string | null) => {
    if (priceText) return priceText;
    if (price) return `${price.toLocaleString("ru-RU")} руб.`;
    return null;
  };

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Компактная карточка
  const renderCompactCard = (ad: EnrichedAd) => {
    const isExpanded = expandedId === ad.id;

    if (!isExpanded) {
      return (
        <div
          key={ad.id}
          className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer"
          onClick={() => toggleExpand(ad.id)}
        >
          <div className="flex items-center gap-3 p-3">
            {/* Фото */}
            {ad.images.length > 0 && (
              <img
                src={ad.images[0]}
                alt=""
                className="w-12 h-12 object-cover rounded flex-shrink-0"
              />
            )}

            {/* Тип товара */}
            {ad.aiNomenclature && (
              <span className="px-2 py-1 rounded text-xs font-medium flex-shrink-0 bg-blue-500 text-white">
                {ad.aiNomenclature}
              </span>
            )}

            {/* Заголовок */}
            <span className="font-medium flex-1 truncate text-gray-900">{ad.title}</span>

            {/* Размеры */}
            {ad.aiDimensions && (
              <span className="text-green-600 text-sm hidden lg:block font-medium">
                {ad.aiDimensions}
              </span>
            )}

            {/* Город */}
            {ad.city && (
              <span className="text-gray-500 text-sm hidden md:flex items-center gap-1">
                {ad.city}
              </span>
            )}

            {/* Цена */}
            <span className="font-bold text-green-600 flex-shrink-0">
              {formatPrice(ad.price, ad.priceText) || "—"}
            </span>

            {/* Возраст */}
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium flex-shrink-0">
              {getDaysAgo(ad.parsedAt)}
            </span>

            {/* Кнопки модерации */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeration(ad.id, "approved");
                }}
                disabled={moderating === ad.id || ad.moderationStatus === "approved"}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                  ad.moderationStatus === "approved"
                    ? "bg-green-100 text-green-700"
                    : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                }`}
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeration(ad.id, "rejected");
                }}
                disabled={moderating === ad.id || ad.moderationStatus === "rejected"}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                  ad.moderationStatus === "rejected"
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

    // Развёрнутая карточка
    return (
      <div
        key={ad.id}
        className="bg-white rounded-lg shadow-lg ring-2 ring-purple-500 overflow-hidden"
      >
        {/* Header */}
        <div
          className="px-4 py-3 cursor-pointer bg-purple-500 text-white"
          onClick={() => toggleExpand(ad.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm opacity-80">AVITO</span>
              <h3 className="font-semibold text-lg">{ad.title}</h3>
            </div>
            <span className="text-xl font-bold">
              {formatPrice(ad.price, ad.priceText) || "Цена не указана"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Левая колонка */}
            <div className="space-y-3">
              {/* Фото */}
              {ad.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {ad.images.slice(0, 4).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ))}
                </div>
              )}

              {/* Извлечённые данные */}
              <div className="flex flex-wrap gap-2">
                {ad.aiNomenclature && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded font-medium">
                    {ad.aiNomenclature}
                  </span>
                )}
                {ad.aiMaterial && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded font-medium">
                    {ad.aiMaterial}
                  </span>
                )}
                {ad.aiDimensions && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded font-medium">
                    {ad.aiDimensions}
                  </span>
                )}
                {ad.aiCondition && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded font-medium">
                    {ad.aiCondition}
                  </span>
                )}
                {ad.aiWeight && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded font-medium">
                    {ad.aiWeight}
                  </span>
                )}
                {ad.aiPricePerUnit && (
                  <span className="px-2 py-1 bg-pink-100 text-pink-700 text-sm rounded font-medium">
                    {ad.aiPricePerUnit}
                  </span>
                )}
              </div>

              {/* Описание */}
              {ad.description && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Описание</div>
                  <div className="text-sm bg-gray-50 p-2 rounded max-h-32 overflow-auto">
                    {ad.description}
                  </div>
                </div>
              )}
            </div>

            {/* Правая колонка */}
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Локация</div>
                <div className="text-sm">
                  {ad.city || "Не указано"}
                  {ad.address && `, ${ad.address}`}
                </div>
              </div>

              {ad.sellerName && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Продавец</div>
                  <div className="text-sm text-purple-600">{ad.sellerName}</div>
                </div>
              )}

              {ad.aiPhone && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Телефон</div>
                  <a
                    href={`tel:${ad.aiPhone}`}
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ad.aiPhone}
                  </a>
                </div>
              )}

              <div>
                <div className="text-xs text-gray-500 mb-1">Источник</div>
                <a
                  href={ad.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Открыть на Avito →
                </a>
              </div>

              <div className="text-xs text-gray-500">
                Парсинг: {new Date(ad.parsedAt).toLocaleDateString("ru-RU")} ({getDaysAgo(ad.parsedAt)})
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex justify-between items-center bg-gray-50">
          <div>
            {ad.moderationStatus === "approved" && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Одобрено</span>
            )}
            {ad.moderationStatus === "rejected" && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">✕ Отклонено</span>
            )}
            {ad.moderationStatus === "pending" && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⏳ На модерации</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleModeration(ad.id, "approved");
              }}
              disabled={moderating === ad.id || ad.moderationStatus === "approved"}
              className={`px-4 py-2 rounded font-medium ${
                ad.moderationStatus === "approved"
                  ? "bg-green-100 text-green-700"
                  : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              }`}
            >
              ✓ Одобрить
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleModeration(ad.id, "rejected");
              }}
              disabled={moderating === ad.id || ad.moderationStatus === "rejected"}
              className={`px-4 py-2 rounded font-medium ${
                ad.moderationStatus === "rejected"
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/avito" className="text-gray-500 hover:text-gray-600">
              ← Назад
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Avito Карточки</h1>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Всего</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.enriched}</div>
              <div className="text-xs text-gray-500">Обогащено</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
              <div className="text-xs text-gray-500">Ожидает</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-xs text-gray-500">Одобрено</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
              <div className="text-xs text-gray-500">Отклонено</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab("cards")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "cards" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Карточки ({stats?.enriched || 0})
          </button>
          <button
            onClick={() => setActiveTab("enrichment")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "enrichment" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Обогащение
          </button>
        </div>

        {/* Enrichment Tab */}
        {activeTab === "enrichment" && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">AI Обогащение</h2>

            {job?.status === "running" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Обработка...</span>
                      <span>{job.processed} / {job.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${(job.processed / job.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={stopEnrichment}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Остановить
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Обогащено: {job.enriched} | Ошибок: {job.errors}
                </div>
              </div>
            ) : job?.status === "completed" || job?.status === "stopped" || job?.status === "error" ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  job.status === "completed" ? "bg-green-50 text-green-700" :
                  job.status === "error" ? "bg-red-50 text-red-700" :
                  "bg-yellow-50 text-yellow-700"
                }`}>
                  <div className="font-medium">
                    {job.status === "completed" ? "Завершено" :
                     job.status === "error" ? "Ошибка" : "Остановлено"}
                  </div>
                  <div className="text-sm">
                    Обработано: {job.processed} | Обогащено: {job.enriched} | Ошибок: {job.errors}
                  </div>
                </div>
                <button
                  onClick={clearJob}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Очистить
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <select
                  value={enrichCount}
                  onChange={(e) => setEnrichCount(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value={10}>10 объявлений</option>
                  <option value={20}>20 объявлений</option>
                  <option value={50}>50 объявлений</option>
                  <option value={100}>100 объявлений</option>
                  <option value="all">Все</option>
                </select>
                <button
                  onClick={startEnrichment}
                  disabled={(stats?.pending || 0) === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Запустить обогащение
                </button>
                {(stats?.pending || 0) === 0 && (
                  <span className="text-sm text-gray-500">Нет объявлений для обогащения</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === "cards" && (
          <>
            {/* View Toggle */}
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Показано: <span className="font-medium">{ads.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadAds}
                  disabled={loading}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  {loading ? "⏳" : "🔄"}
                </button>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      viewMode === "cards" ? "bg-white shadow text-gray-900" : "text-gray-500"
                    }`}
                  >
                    Карточки
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"
                    }`}
                  >
                    Список
                  </button>
                </div>
              </div>
            </div>

            {/* Cards */}
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-pulse">Загрузка...</div>
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Нет обогащённых карточек. Перейдите во вкладку "Обогащение".
              </div>
            ) : (
              <div className="space-y-2">
                {ads.map(renderCompactCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
