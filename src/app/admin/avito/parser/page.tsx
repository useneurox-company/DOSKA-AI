"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PARSE_FIELDS } from "@/lib/avito/constants";

// Русские названия полей
const FIELD_LABELS: Record<string, string> = {
  title: "Заголовок",
  description: "Описание",
  price: "Цена",
  city: "Город",
  address: "Адрес",
  district: "Район",
  images: "Фото",
  sellerName: "Продавец",
  sellerId: "ID продавца",
  category: "Категория",
  views: "Просмотры",
  publishedAt: "Дата публикации",
  url: "Ссылка",
};

// Поля, доступные в быстром режиме
const FAST_MODE_FIELDS = ["title", "description", "price", "city", "images", "sellerName", "url"];

// Типы
interface Proxy {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  status: string;
  lastCheck: string | null;
  errorMsg: string | null;
  requestCount: number;
  errorCount: number;
}

interface Source {
  id: string;
  name: string;
  searchUrl: string;
  parseFields: string[];
  isActive: boolean;
  fastMode: boolean;
  proxyId: string | null;
  autoParseEnabled: boolean;
  autoParseInterval: number;
  lastParsed: string | null;
  adCount: number;
  _count: { ads: number; jobs: number };
}

interface JobProgress {
  id: string;
  sourceId: string;
  sourceName: string;
  status: string;
  total: number;
  processed: number;
  newAds: number;
  skipped: number;
  errors: number;
  proxyName?: string;
  errorMsg?: string;
  startedAt?: string;
  percent: number;
}

interface Ad {
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
  parsedAt: string;
  source: { id: string; name: string };
}

interface Stats {
  totalAds: number;
  todayAds: number;
  totalSources: number;
  activeSources: number;
  totalProxies: number;
  activeProxies: number;
  runningJobs: number;
}

interface AutoParseStatus {
  isPaused: boolean;
  lastAutoParseAt: string | null;
  nextAutoParseAt: string | null;
  sourcesWithAutoParse: number;
}

type Tab = "proxy" | "sources" | "parsing" | "ads";

function AvitoAdminContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "proxy";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Прокси
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [newProxy, setNewProxy] = useState({ name: "", url: "" });
  const [checkingProxyId, setCheckingProxyId] = useState<string | null>(null);

  // Источники
  const [sources, setSources] = useState<Source[]>([]);
  const [newSource, setNewSource] = useState({
    name: "",
    searchUrl: "",
    parseFields: ["title", "description", "price", "city", "images", "sellerName", "url"],
    proxyId: "",
    fastMode: true, // По умолчанию быстрый режим
    autoParseEnabled: false,
    autoParseInterval: 24,
  });
  const [showAddSource, setShowAddSource] = useState(false);

  // Парсинг
  const [runningJobs, setRunningJobs] = useState<JobProgress[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [autoParseStatus, setAutoParseStatus] = useState<AutoParseStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  // Объявления
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsTotal, setAdsTotal] = useState(0);
  const [adsPage, setAdsPage] = useState(1);
  const [adsFilter, setAdsFilter] = useState({
    sourceId: "",
    city: "",
    priceMin: "",
    priceMax: "",
    search: "",
  });

  // Загрузка данных
  const fetchProxies = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/proxy");
      const data = await res.json();
      if (Array.isArray(data)) setProxies(data);
    } catch {
      console.error("Error fetching proxies");
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/sources");
      const data = await res.json();
      if (Array.isArray(data)) setSources(data);
    } catch {
      console.error("Error fetching sources");
    }
  }, []);

  const fetchRunningJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/jobs?type=running");
      const data = await res.json();
      if (Array.isArray(data)) setRunningJobs(data);
    } catch {
      console.error("Error fetching jobs");
    }
  }, []);

  const fetchAutoParseStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/autoparse");
      const data = await res.json();
      setAutoParseStatus(data);
    } catch {
      console.error("Error fetching autoparse status");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/avito/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      console.error("Error fetching stats");
    }
  }, []);

  const fetchAds = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(adsPage));
      params.set("limit", "20");
      if (adsFilter.sourceId) params.set("sourceId", adsFilter.sourceId);
      if (adsFilter.city) params.set("city", adsFilter.city);
      if (adsFilter.priceMin) params.set("priceMin", adsFilter.priceMin);
      if (adsFilter.priceMax) params.set("priceMax", adsFilter.priceMax);
      if (adsFilter.search) params.set("search", adsFilter.search);

      const res = await fetch(`/api/avito/ads?${params}`);
      const data = await res.json();
      if (data.ads) {
        setAds(data.ads);
        setAdsTotal(data.total);
      }
    } catch {
      console.error("Error fetching ads");
    }
  }, [adsPage, adsFilter]);

  // Начальная загрузка и обновление
  useEffect(() => {
    fetchProxies();
    fetchSources();
    fetchStats();
    fetchAutoParseStatus();

    const interval = setInterval(() => {
      fetchRunningJobs();
      fetchStats();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchProxies, fetchSources, fetchStats, fetchAutoParseStatus, fetchRunningJobs]);

  useEffect(() => {
    if (activeTab === "ads") {
      fetchAds();
    }
  }, [activeTab, fetchAds]);

  // Прокси: добавить
  const addProxy = async () => {
    if (!newProxy.name || !newProxy.url) {
      setError("Введите название и URL прокси");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/avito/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProxy),
      });
      if (res.ok) {
        setNewProxy({ name: "", url: "" });
        fetchProxies();
      } else {
        const data = await res.json();
        setError(data.error || "Ошибка добавления прокси");
      }
    } catch {
      setError("Ошибка добавления прокси");
    }
    setLoading(false);
  };

  // Прокси: проверить
  const checkProxy = async (id: string) => {
    setCheckingProxyId(id);
    try {
      await fetch(`/api/avito/proxy/${id}/check`, { method: "POST" });
      fetchProxies();
    } catch {
      setError("Ошибка проверки прокси");
    }
    setCheckingProxyId(null);
  };

  // Прокси: удалить
  const deleteProxy = async (id: string) => {
    if (!confirm("Удалить этот прокси?")) return;
    try {
      await fetch(`/api/avito/proxy/${id}`, { method: "DELETE" });
      fetchProxies();
    } catch {
      setError("Ошибка удаления прокси");
    }
  };

  // Прокси: переключить активность
  const toggleProxyActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/avito/proxy/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      fetchProxies();
    } catch {
      setError("Ошибка обновления прокси");
    }
  };

  // Источники: добавить
  const addSource = async () => {
    if (!newSource.name || !newSource.searchUrl) {
      setError("Введите название и URL поиска");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/avito/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSource,
          proxyId: newSource.proxyId || undefined,
        }),
      });
      if (res.ok) {
        setNewSource({
          name: "",
          searchUrl: "",
          parseFields: ["title", "description", "price", "city", "images", "sellerName", "url"],
          proxyId: "",
          fastMode: true,
          autoParseEnabled: false,
          autoParseInterval: 24,
        });
        setShowAddSource(false);
        fetchSources();
      } else {
        const data = await res.json();
        setError(data.error || "Ошибка добавления источника");
      }
    } catch {
      setError("Ошибка добавления источника");
    }
    setLoading(false);
  };

  // Источники: удалить
  const deleteSource = async (id: string) => {
    if (!confirm("Удалить этот источник и все его объявления?")) return;
    try {
      await fetch(`/api/avito/sources/${id}`, { method: "DELETE" });
      fetchSources();
    } catch {
      setError("Ошибка удаления источника");
    }
  };

  // Источники: переключить активность
  const toggleSourceActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/avito/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      fetchSources();
    } catch {
      setError("Ошибка обновления источника");
    }
  };

  // Источники: переключить режим парсинга
  const toggleSourceFastMode = async (id: string, fastMode: boolean) => {
    try {
      await fetch(`/api/avito/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fastMode }),
      });
      fetchSources();
    } catch {
      setError("Ошибка обновления режима парсинга");
    }
  };

  // Парсинг: запустить
  const startParsing = async () => {
    if (selectedSources.length === 0) {
      setError("Выберите источники для парсинга");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/avito/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: selectedSources }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedSources([]);
        fetchRunningJobs();
      } else {
        setError(data.error || "Ошибка запуска парсинга");
      }
    } catch {
      setError("Ошибка запуска парсинга");
    }
    setLoading(false);
  };

  // Парсинг: остановить задачу
  const stopJob = async (jobId: string) => {
    try {
      await fetch("/api/avito/parse/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      fetchRunningJobs();
    } catch {
      setError("Ошибка остановки задачи");
    }
  };

  // Парсинг: остановить все
  const stopAllJobs = async () => {
    try {
      await fetch("/api/avito/parse/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      fetchRunningJobs();
    } catch {
      setError("Ошибка остановки задач");
    }
  };

  // Автопарсинг: пауза/возобновление
  const toggleAutoParse = async () => {
    if (!autoParseStatus) return;
    try {
      await fetch("/api/avito/autoparse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: autoParseStatus.isPaused ? "resume" : "pause" }),
      });
      fetchAutoParseStatus();
    } catch {
      setError("Ошибка управления автопарсингом");
    }
  };

  // Объявления: экспорт
  const exportAds = () => {
    const params = new URLSearchParams();
    if (adsFilter.sourceId) params.set("sourceId", adsFilter.sourceId);
    if (adsFilter.city) params.set("city", adsFilter.city);
    if (adsFilter.priceMin) params.set("priceMin", adsFilter.priceMin);
    if (adsFilter.priceMax) params.set("priceMax", adsFilter.priceMax);
    if (adsFilter.search) params.set("search", adsFilter.search);

    window.open(`/api/avito/ads/export?${params}`, "_blank");
  };

  // UI помощники
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabs = [
    { id: "proxy" as Tab, label: "Прокси", icon: "🌐" },
    { id: "sources" as Tab, label: "Источники", icon: "📋" },
    { id: "parsing" as Tab, label: "Парсинг", icon: "🚀" },
    { id: "ads" as Tab, label: "Объявления", icon: "📦" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/avito" className="text-gray-500 hover:text-gray-600">
              ← Назад
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Avito Парсер</h1>
          </div>
          {stats && stats.totalAds !== undefined && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                <span className="font-medium text-gray-900">{(stats.totalAds ?? 0).toLocaleString("ru-RU")}</span> объявлений
              </span>
              <span>
                <span className="font-medium text-green-600">+{stats.todayAds ?? 0}</span> сегодня
              </span>
              {(stats.runningJobs ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <span className="animate-spin">⟳</span>
                  {stats.runningJobs} задач
                </span>
              )}
            </div>
          )}
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError("")} className="float-right font-bold">
              ×
            </button>
          </div>
        )}

        {/* Табы */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Вкладка: Прокси */}
        {activeTab === "proxy" && (
          <div className="space-y-6">
            {/* Форма добавления */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Добавить прокси</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Название (Proxy 1)"
                  value={newProxy.name}
                  onChange={(e) => setNewProxy({ ...newProxy, name: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />
                <input
                  type="text"
                  placeholder="http://user:pass@ip:port"
                  value={newProxy.url}
                  onChange={(e) => setNewProxy({ ...newProxy, url: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />
                <button
                  onClick={addProxy}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 font-medium"
                >
                  {loading ? "..." : "Добавить"}
                </button>
              </div>
            </div>

            {/* Список прокси */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Прокси ({proxies.length})
              </h2>

              {proxies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Добавьте первый прокси</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 px-3">Название</th>
                        <th className="py-2 px-3">URL</th>
                        <th className="py-2 px-3">Статус</th>
                        <th className="py-2 px-3">Запросов</th>
                        <th className="py-2 px-3">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proxies.map((proxy) => (
                        <tr key={proxy.id} className="border-b">
                          <td className="py-3 px-3 font-medium text-gray-900">{proxy.name}</td>
                          <td className="py-3 px-3 text-gray-500 font-mono text-xs max-w-xs truncate">
                            {proxy.url}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                proxy.status === "working"
                                  ? "text-green-600"
                                  : proxy.status === "error"
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {proxy.status === "working" ? "✅" : proxy.status === "error" ? "❌" : "❓"}
                              {proxy.status === "working"
                                ? "ОК"
                                : proxy.status === "error"
                                ? "Ошибка"
                                : "Не проверен"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500">{proxy.requestCount}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => checkProxy(proxy.id)}
                                disabled={checkingProxyId === proxy.id}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                {checkingProxyId === proxy.id ? "..." : "Проверить"}
                              </button>
                              <button
                                onClick={() => toggleProxyActive(proxy.id, !proxy.isActive)}
                                className={`text-xs ${
                                  proxy.isActive ? "text-yellow-600" : "text-green-600"
                                }`}
                              >
                                {proxy.isActive ? "Выкл" : "Вкл"}
                              </button>
                              <button
                                onClick={() => deleteProxy(proxy.id)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Вкладка: Источники */}
        {activeTab === "sources" && (
          <div className="space-y-6">
            {/* Кнопка добавления */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddSource(!showAddSource)}
                className="bg-blue-500 text-white px-4 py-2 rounded font-medium"
              >
                {showAddSource ? "Отмена" : "+ Добавить источник"}
              </button>
            </div>

            {/* Форма добавления */}
            {showAddSource && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Новый источник</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Название</label>
                      <input
                        type="text"
                        placeholder="Металлопрокат Москва"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Прокси</label>
                      <select
                        value={newSource.proxyId}
                        onChange={(e) => setNewSource({ ...newSource, proxyId: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-gray-900"
                      >
                        <option value="">Любой из пула</option>
                        {proxies.filter((p) => p.isActive).map((proxy) => (
                          <option key={proxy.id} value={proxy.id}>
                            {proxy.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">URL поиска Avito</label>
                    <input
                      type="text"
                      placeholder="https://www.avito.ru/moskva/metalloprokat"
                      value={newSource.searchUrl}
                      onChange={(e) => setNewSource({ ...newSource, searchUrl: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-gray-900"
                    />
                  </div>

                  {/* Режим парсинга */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Режим парсинга</label>
                    <div className="flex gap-4">
                      <label
                        className={`flex-1 cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          newSource.fastMode
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={newSource.fastMode}
                          onChange={() => setNewSource({
                            ...newSource,
                            fastMode: true,
                            // Убираем недоступные поля при переключении на быстрый режим
                            parseFields: newSource.parseFields.filter(f => FAST_MODE_FIELDS.includes(f))
                          })}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⚡</span>
                          <span className="font-medium text-gray-900">Быстрый</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Рекомендуется</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          ~1 минута на 500 объявлений. Парсит данные прямо со страницы поиска.
                        </p>
                      </label>

                      <label
                        className={`flex-1 cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          !newSource.fastMode
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={!newSource.fastMode}
                          onChange={() => setNewSource({ ...newSource, fastMode: false })}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🔍</span>
                          <span className="font-medium text-gray-900">Детальный</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          ~2 часа на 500 объявлений. Открывает каждое объявление для полных данных.
                        </p>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Что парсить
                      {newSource.fastMode && (
                        <span className="text-xs text-gray-400 ml-2">
                          (в быстром режиме доступно меньше полей)
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PARSE_FIELDS
                        .filter((field) => !newSource.fastMode || FAST_MODE_FIELDS.includes(field))
                        .map((field) => (
                        <label key={field} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={newSource.parseFields.includes(field)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSource({
                                  ...newSource,
                                  parseFields: [...newSource.parseFields, field],
                                });
                              } else {
                                setNewSource({
                                  ...newSource,
                                  parseFields: newSource.parseFields.filter((f) => f !== field),
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-gray-700">{FIELD_LABELS[field] || field}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newSource.autoParseEnabled}
                        onChange={(e) =>
                          setNewSource({ ...newSource, autoParseEnabled: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-gray-700">Автопарсинг каждые</span>
                    </label>
                    <input
                      type="number"
                      value={newSource.autoParseInterval}
                      onChange={(e) =>
                        setNewSource({ ...newSource, autoParseInterval: parseInt(e.target.value) || 24 })
                      }
                      className="w-20 border rounded px-2 py-1 text-gray-900"
                      min={1}
                    />
                    <span className="text-gray-500">часов</span>
                  </div>

                  <button
                    onClick={addSource}
                    disabled={loading}
                    className="bg-green-500 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
                  >
                    {loading ? "Добавление..." : "Добавить источник"}
                  </button>
                </div>
              </div>
            )}

            {/* Список источников */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Источники ({sources.length})
              </h2>

              {sources.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Добавьте первый источник</p>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className={`border rounded-lg p-4 ${
                        !source.isActive ? "bg-gray-50 opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{source.name}</span>
                            {/* Режим парсинга */}
                            <span
                              className={`text-xs px-2 py-0.5 rounded cursor-pointer ${
                                source.fastMode
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                              onClick={() => toggleSourceFastMode(source.id, !source.fastMode)}
                              title="Кликните для переключения режима"
                            >
                              {source.fastMode ? "⚡ быстрый" : "🔍 детальный"}
                            </span>
                            {source.autoParseEnabled && (
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                                авто {source.autoParseInterval}ч
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">{source.adCount}</span> объявлений
                            {source.lastParsed && (
                              <span className="ml-3">обновлено {formatDate(source.lastParsed)}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-xl">
                            {source.searchUrl}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSourceActive(source.id, !source.isActive)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              source.isActive
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {source.isActive ? "Выкл" : "Вкл"}
                          </button>
                          <button
                            onClick={() => deleteSource(source.id)}
                            className="px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Вкладка: Парсинг */}
        {activeTab === "parsing" && (
          <div className="space-y-6">
            {/* Ручной запуск */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Ручной запуск</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Выберите источники</label>
                  <div className="flex flex-wrap gap-2">
                    {sources
                      .filter((s) => s.isActive)
                      .map((source) => (
                        <label
                          key={source.id}
                          className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer ${
                            selectedSources.includes(source.id)
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSources.includes(source.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSources([...selectedSources, source.id]);
                              } else {
                                setSelectedSources(selectedSources.filter((id) => id !== source.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-gray-900">{source.name}</span>
                        </label>
                      ))}
                  </div>
                  {sources.filter((s) => s.isActive).length === 0 && (
                    <p className="text-gray-500 text-sm">Нет активных источников</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={startParsing}
                    disabled={loading || selectedSources.length === 0}
                    className="bg-green-500 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
                  >
                    {loading ? "Запуск..." : `▶️ Запустить (${selectedSources.length})`}
                  </button>
                  {runningJobs.length > 0 && (
                    <button
                      onClick={stopAllJobs}
                      className="bg-red-500 text-white px-6 py-2 rounded font-medium"
                    >
                      ⏹ Остановить все
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Активные задачи */}
            {runningJobs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">
                  Активные задачи ({runningJobs.length})
                </h2>

                <div className="space-y-4">
                  {runningJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="animate-spin text-yellow-500">⟳</span>
                          <span className="font-medium text-gray-900">{job.sourceName}</span>
                          {job.proxyName && (
                            <span className="text-xs text-gray-500">через {job.proxyName}</span>
                          )}
                        </div>
                        <button
                          onClick={() => stopJob(job.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ⏹ Остановить
                        </button>
                      </div>

                      {/* Прогресс-бар */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${job.percent}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{job.percent}%</span>
                        <span>({job.processed}/{job.total})</span>
                        <span className="text-green-600">+{job.newAds} новых</span>
                        <span className="text-gray-500">{job.skipped} пропущено</span>
                        {job.errors > 0 && (
                          <span className="text-red-500">{job.errors} ошибок</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Автопарсинг */}
            {autoParseStatus && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Автопарсинг</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {autoParseStatus.sourcesWithAutoParse} источников с автопарсингом
                    </p>
                    {autoParseStatus.nextAutoParseAt && !autoParseStatus.isPaused && (
                      <p className="text-sm text-gray-500">
                        Следующий запуск: {formatDate(autoParseStatus.nextAutoParseAt)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={toggleAutoParse}
                    className={`px-4 py-2 rounded font-medium ${
                      autoParseStatus.isPaused
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {autoParseStatus.isPaused ? "▶️ Возобновить" : "⏸ Приостановить"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Вкладка: Объявления */}
        {activeTab === "ads" && (
          <div className="space-y-6">
            {/* Фильтры */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <select
                  value={adsFilter.sourceId}
                  onChange={(e) => setAdsFilter({ ...adsFilter, sourceId: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                >
                  <option value="">Все источники</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Город"
                  value={adsFilter.city}
                  onChange={(e) => setAdsFilter({ ...adsFilter, city: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />

                <input
                  type="number"
                  placeholder="Цена от"
                  value={adsFilter.priceMin}
                  onChange={(e) => setAdsFilter({ ...adsFilter, priceMin: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />

                <input
                  type="number"
                  placeholder="Цена до"
                  value={adsFilter.priceMax}
                  onChange={(e) => setAdsFilter({ ...adsFilter, priceMax: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />

                <input
                  type="text"
                  placeholder="Поиск..."
                  value={adsFilter.search}
                  onChange={(e) => setAdsFilter({ ...adsFilter, search: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAdsPage(1);
                      fetchAds();
                    }}
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded font-medium"
                  >
                    Найти
                  </button>
                  <button
                    onClick={exportAds}
                    className="bg-green-500 text-white px-3 py-2 rounded font-medium"
                    title="Экспорт в CSV"
                  >
                    📥
                  </button>
                </div>
              </div>
            </div>

            {/* Список объявлений */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Объявления ({(adsTotal ?? 0).toLocaleString("ru-RU")})
                </h2>
              </div>

              {ads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет объявлений</p>
              ) : (
                <div className="space-y-4">
                  {ads.map((ad) => (
                    <div key={ad.id} className="border rounded-lg p-4">
                      <div className="flex gap-4">
                        {/* Изображение */}
                        {ad.images.length > 0 && (
                          <div className="flex-shrink-0">
                            <img
                              src={ad.images[0]}
                              alt=""
                              className="w-24 h-24 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        {/* Контент */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-gray-900 truncate">{ad.title}</h3>
                            {(ad.price || ad.priceText) && (
                              <span className="font-bold text-green-600 ml-2 flex-shrink-0">
                                {ad.priceText || (ad.price ? `${ad.price.toLocaleString("ru-RU")} ₽` : "")}
                              </span>
                            )}
                          </div>

                          {ad.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {ad.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {ad.city && <span>📍 {ad.city}</span>}
                            {ad.sellerName && <span>👤 {ad.sellerName}</span>}
                            <span>📅 {formatDate(ad.parsedAt)}</span>
                            <span className="text-gray-500">{ad.source.name}</span>
                          </div>
                        </div>

                        {/* Ссылка */}
                        <a
                          href={ad.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-blue-500 hover:text-blue-700"
                        >
                          🔗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Пагинация */}
              {adsTotal > 20 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setAdsPage(Math.max(1, adsPage - 1))}
                    disabled={adsPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-gray-600">
                    Страница {adsPage} из {Math.ceil(adsTotal / 20)}
                  </span>
                  <button
                    onClick={() => setAdsPage(adsPage + 1)}
                    disabled={adsPage >= Math.ceil(adsTotal / 20)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvitoAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Загрузка...</div>}>
      <AvitoAdminContent />
    </Suspense>
  );
}
