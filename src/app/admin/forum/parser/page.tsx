"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FORUM_PARSE_FIELDS, FORUM_FIELD_LABELS, FORUM_PRESETS } from "@/lib/forum/constants";

// Типы
interface ForumSource {
  id: string;
  name: string;
  baseUrl: string;
  sectionUrl: string;
  selectors: Record<string, string>;
  parseFields: string[];
  isActive: boolean;
  proxyId: string | null;
  maxPages: number;
  parseReplies: boolean;
  autoParseEnabled: boolean;
  autoParseInterval: number;
  lastParsed: string | null;
  postCount: number;
  _count: { posts: number; jobs: number };
}

interface ForumJob {
  id: string;
  sourceId: string;
  sourceName: string;
  status: string;
  total: number;
  processed: number;
  newPosts: number;
  skipped: number;
  errors: number;
  errorMsg?: string;
  startedAt?: string;
  percent: number;
}

interface ForumPost {
  id: string;
  forumPostId: string;
  title: string;
  content: string | null;
  author: string | null;
  url: string;
  images: string[];
  price: number | null;
  priceText: string | null;
  city: string | null;
  phone: string | null;
  postType: string | null;
  parsedAt: string;
  source: { id: string; name: string };
}

interface Stats {
  totalPosts: number;
  todayPosts: number;
  totalSources: number;
  activeSources: number;
  runningJobs: number;
}

type Tab = "sources" | "parsing" | "posts" | "ai";

function ForumAdminContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "sources";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Источники
  const [sources, setSources] = useState<ForumSource[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [newSource, setNewSource] = useState({
    name: "",
    baseUrl: "",
    sectionUrl: "",
    selectors: {} as Record<string, string>,
    parseFields: ["title", "content", "author", "date", "images", "url"],
    proxyId: "",
    maxPages: 5,
    parseReplies: false,
    autoParseEnabled: false,
    autoParseInterval: 24,
  });

  // Парсинг
  const [runningJobs, setRunningJobs] = useState<ForumJob[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Посты
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [postsFilter, setPostsFilter] = useState({
    sourceId: "",
    postType: "",
    city: "",
    search: "",
  });

  // AI Анализ
  const [aiUrl, setAiUrl] = useState("");
  const [aiMode, setAiMode] = useState<"analyze" | "parse">("analyze");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    success: boolean;
    mode: string;
    // Для режима analyze
    selectors?: Record<string, string>;
    confidence?: number;
    description?: string;
    samplePosts?: Array<{
      title: string;
      category?: string;
      author?: string;
      city?: string;
    }>;
    recommendations?: string[];
    // Для режима parse
    posts?: Array<{
      title: string;
      url: string;
      category?: string;
      author?: string;
      city?: string;
      phone?: string;
      priceText?: string;
      postType: string;
    }>;
    totalFound?: number;
    nextPageUrl?: string;
  } | null>(null);

  // Загрузка данных
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/sources");
      const data = await res.json();
      if (Array.isArray(data)) setSources(data);
    } catch {
      console.error("Error fetching sources");
    }
  }, []);

  const fetchRunningJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/jobs?type=running");
      const data = await res.json();
      if (Array.isArray(data)) setRunningJobs(data);
    } catch {
      console.error("Error fetching jobs");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      console.error("Error fetching stats");
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(postsPage));
      params.set("limit", "20");
      if (postsFilter.sourceId) params.set("sourceId", postsFilter.sourceId);
      if (postsFilter.postType) params.set("postType", postsFilter.postType);
      if (postsFilter.city) params.set("city", postsFilter.city);
      if (postsFilter.search) params.set("search", postsFilter.search);

      const res = await fetch(`/api/forum/posts?${params}`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
        setPostsTotal(data.total);
      }
    } catch {
      console.error("Error fetching posts");
    }
  }, [postsPage, postsFilter]);

  // Начальная загрузка
  useEffect(() => {
    fetchSources();
    fetchStats();

    const interval = setInterval(() => {
      fetchRunningJobs();
      fetchStats();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchSources, fetchStats, fetchRunningJobs]);

  useEffect(() => {
    if (activeTab === "posts") {
      fetchPosts();
    }
  }, [activeTab, fetchPosts]);

  // Применить пресет селекторов
  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = FORUM_PRESETS[presetKey];
    if (preset) {
      setNewSource((prev) => ({
        ...prev,
        selectors: preset.selectors as Record<string, string>,
      }));
    }
  };

  // Источники: добавить
  const addSource = async () => {
    if (!newSource.name || !newSource.baseUrl || !newSource.sectionUrl) {
      setError("Введите название, базовый URL и URL раздела");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/forum/sources", {
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
          baseUrl: "",
          sectionUrl: "",
          selectors: {},
          parseFields: ["title", "content", "author", "date", "images", "url"],
          proxyId: "",
          maxPages: 5,
          parseReplies: false,
          autoParseEnabled: false,
          autoParseInterval: 24,
        });
        setSelectedPreset("custom");
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
    if (!confirm("Удалить этот источник и все его посты?")) return;
    try {
      await fetch(`/api/forum/sources/${id}`, { method: "DELETE" });
      fetchSources();
    } catch {
      setError("Ошибка удаления источника");
    }
  };

  // Источники: переключить активность
  const toggleSourceActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/forum/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      fetchSources();
    } catch {
      setError("Ошибка обновления источника");
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
      const res = await fetch("/api/forum/parse", {
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

  // Парсинг: остановить
  const stopJob = async (jobId: string) => {
    try {
      await fetch("/api/forum/parse/stop", {
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
      await fetch("/api/forum/parse/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      fetchRunningJobs();
    } catch {
      setError("Ошибка остановки задач");
    }
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

  const getPostTypeLabel = (type: string | null) => {
    switch (type) {
      case "sell":
        return { text: "Продам", color: "bg-green-100 text-green-700" };
      case "buy":
        return { text: "Куплю", color: "bg-blue-100 text-blue-700" };
      default:
        return { text: "Другое", color: "bg-gray-100 text-gray-600" };
    }
  };

  const tabs = [
    { id: "sources" as Tab, label: "Источники", icon: "📋" },
    { id: "parsing" as Tab, label: "Парсинг", icon: "🚀" },
    { id: "posts" as Tab, label: "Посты", icon: "📝" },
    { id: "ai" as Tab, label: "AI Анализ", icon: "🤖" },
  ];

  // AI анализ страницы
  const runAiAnalysis = async () => {
    if (!aiUrl) {
      setError("Введите URL страницы для анализа");
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/forum/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: aiUrl, mode: aiMode }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data);
      } else {
        setError(data.error || "Ошибка AI анализа");
      }
    } catch {
      setError("Ошибка AI анализа");
    }
    setAiLoading(false);
  };

  // Применить селекторы из AI к форме нового источника
  const applyAiSelectors = () => {
    if (aiResult?.selectors) {
      setNewSource((prev) => ({
        ...prev,
        selectors: aiResult.selectors as Record<string, string>,
        sectionUrl: aiUrl,
        baseUrl: new URL(aiUrl).origin,
      }));
      setSelectedPreset("custom");
      setShowAddSource(true);
      setActiveTab("sources");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-600">
              ← Назад
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Парсер Форумов</h1>
          </div>
          {stats && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                <span className="font-medium text-gray-900">
                  {(stats.totalPosts ?? 0).toLocaleString("ru-RU")}
                </span>{" "}
                постов
              </span>
              <span>
                <span className="font-medium text-green-600">+{stats.todayPosts ?? 0}</span> сегодня
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

        {/* Вкладка: Источники */}
        {activeTab === "sources" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddSource(!showAddSource)}
                className="bg-blue-500 text-white px-4 py-2 rounded font-medium"
              >
                {showAddSource ? "Отмена" : "+ Добавить форум"}
              </button>
            </div>

            {/* Форма добавления */}
            {showAddSource && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Новый источник</h2>

                <div className="space-y-4">
                  {/* Основные поля */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Название</label>
                      <input
                        type="text"
                        placeholder="Металлопрокат Forum.ru"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Движок форума</label>
                      <select
                        value={selectedPreset}
                        onChange={(e) => applyPreset(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-gray-900"
                      >
                        {Object.entries(FORUM_PRESETS).map(([key, preset]) => (
                          <option key={key} value={key}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Базовый URL форума</label>
                    <input
                      type="text"
                      placeholder="https://forum.example.ru"
                      value={newSource.baseUrl}
                      onChange={(e) => setNewSource({ ...newSource, baseUrl: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      URL раздела с объявлениями
                    </label>
                    <input
                      type="text"
                      placeholder="https://forum.example.ru/forum/metalloprokat"
                      value={newSource.sectionUrl}
                      onChange={(e) => setNewSource({ ...newSource, sectionUrl: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-gray-900"
                    />
                  </div>

                  {/* Настройки парсинга */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Макс. страниц</label>
                      <input
                        type="number"
                        value={newSource.maxPages}
                        onChange={(e) =>
                          setNewSource({ ...newSource, maxPages: parseInt(e.target.value) || 5 })
                        }
                        className="w-full border rounded px-3 py-2 text-gray-900"
                        min={1}
                        max={100}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newSource.parseReplies}
                          onChange={(e) =>
                            setNewSource({ ...newSource, parseReplies: e.target.checked })
                          }
                          className="rounded"
                        />
                        <span className="text-gray-700 text-sm">Парсить ответы</span>
                      </label>
                    </div>
                  </div>

                  {/* Селекторы (свёрнутый блок) */}
                  {selectedPreset === "custom" && (
                    <details className="bg-gray-50 rounded-lg p-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        CSS селекторы (для кастомных форумов)
                      </summary>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: "topicItem", label: "Элемент темы в списке" },
                          { key: "topicLink", label: "Ссылка на тему" },
                          { key: "topicTitle", label: "Заголовок темы" },
                          { key: "postContent", label: "Содержимое поста" },
                          { key: "postAuthor", label: "Автор поста" },
                          { key: "postDate", label: "Дата поста" },
                          { key: "postImages", label: "Изображения" },
                          { key: "pagination", label: "Пагинация" },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-xs text-gray-500 mb-1">{label}</label>
                            <input
                              type="text"
                              placeholder={`.${key}`}
                              value={newSource.selectors[key] || ""}
                              onChange={(e) =>
                                setNewSource({
                                  ...newSource,
                                  selectors: { ...newSource.selectors, [key]: e.target.value },
                                })
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-gray-900"
                            />
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Поля для парсинга */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Что парсить</label>
                    <div className="flex flex-wrap gap-2">
                      {FORUM_PARSE_FIELDS.map((field) => (
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
                          <span className="text-gray-700">{FORUM_FIELD_LABELS[field] || field}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Автопарсинг */}
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
                        setNewSource({
                          ...newSource,
                          autoParseInterval: parseInt(e.target.value) || 24,
                        })
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
                <p className="text-gray-500 text-center py-8">Добавьте первый форум</p>
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
                            {source.autoParseEnabled && (
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                                авто {source.autoParseInterval}ч
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">{source.postCount}</span> постов
                            {source.lastParsed && (
                              <span className="ml-3">обновлено {formatDate(source.lastParsed)}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-xl">
                            {source.sectionUrl}
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
                    {loading ? "Запуск..." : `▶ Запустить (${selectedSources.length})`}
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
                        <span>
                          ({job.processed}/{job.total})
                        </span>
                        <span className="text-green-600">+{job.newPosts} новых</span>
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
          </div>
        )}

        {/* Вкладка: Посты */}
        {activeTab === "posts" && (
          <div className="space-y-6">
            {/* Фильтры */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <select
                  value={postsFilter.sourceId}
                  onChange={(e) => setPostsFilter({ ...postsFilter, sourceId: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                >
                  <option value="">Все источники</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>

                <select
                  value={postsFilter.postType}
                  onChange={(e) => setPostsFilter({ ...postsFilter, postType: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                >
                  <option value="">Все типы</option>
                  <option value="sell">Продам</option>
                  <option value="buy">Куплю</option>
                  <option value="other">Другое</option>
                </select>

                <input
                  type="text"
                  placeholder="Город"
                  value={postsFilter.city}
                  onChange={(e) => setPostsFilter({ ...postsFilter, city: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />

                <input
                  type="text"
                  placeholder="Поиск..."
                  value={postsFilter.search}
                  onChange={(e) => setPostsFilter({ ...postsFilter, search: e.target.value })}
                  className="border rounded px-3 py-2 text-gray-900"
                />

                <button
                  onClick={() => {
                    setPostsPage(1);
                    fetchPosts();
                  }}
                  className="bg-blue-500 text-white px-3 py-2 rounded font-medium"
                >
                  Найти
                </button>
              </div>
            </div>

            {/* Список постов */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Посты ({(postsTotal ?? 0).toLocaleString("ru-RU")})
              </h2>

              {posts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет постов</p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4">
                      <div className="flex gap-4">
                        {/* Изображение */}
                        {post.images.length > 0 && (
                          <div className="flex-shrink-0">
                            <img
                              src={post.images[0]}
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
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-gray-900 line-clamp-1">{post.title}</h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  getPostTypeLabel(post.postType).color
                                }`}
                              >
                                {getPostTypeLabel(post.postType).text}
                              </span>
                              {(post.price || post.priceText) && (
                                <span className="font-bold text-green-600">
                                  {post.priceText ||
                                    (post.price ? `${post.price.toLocaleString("ru-RU")} р` : "")}
                                </span>
                              )}
                            </div>
                          </div>

                          {post.content && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.content}</p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {post.author && <span>👤 {post.author}</span>}
                            {post.city && <span>📍 {post.city}</span>}
                            {post.phone && <span>📞 {post.phone}</span>}
                            <span>📅 {formatDate(post.parsedAt)}</span>
                            <span className="text-gray-400">{post.source.name}</span>
                          </div>
                        </div>

                        {/* Ссылка */}
                        <a
                          href={post.url}
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
              {postsTotal > 20 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPostsPage(Math.max(1, postsPage - 1))}
                    disabled={postsPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-gray-600">
                    Страница {postsPage} из {Math.ceil(postsTotal / 20)}
                  </span>
                  <button
                    onClick={() => setPostsPage(postsPage + 1)}
                    disabled={postsPage >= Math.ceil(postsTotal / 20)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Вкладка: AI Анализ */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            {/* Ввод URL */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                🤖 AI-анализ страницы форума
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Вставьте ссылку на страницу с объявлениями. AI проанализирует структуру и определит селекторы автоматически.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">URL страницы</label>
                  <input
                    type="text"
                    placeholder="https://forum.example.ru/board/sell"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-900"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="aiMode"
                      checked={aiMode === "analyze"}
                      onChange={() => setAiMode("analyze")}
                    />
                    <span className="text-gray-700">Анализ структуры</span>
                    <span className="text-xs text-gray-400">(определить селекторы)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="aiMode"
                      checked={aiMode === "parse"}
                      onChange={() => setAiMode("parse")}
                    />
                    <span className="text-gray-700">Прямой парсинг</span>
                    <span className="text-xs text-gray-400">(AI извлекает данные)</span>
                  </label>
                </div>

                <button
                  onClick={runAiAnalysis}
                  disabled={aiLoading || !aiUrl}
                  className="bg-purple-500 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
                >
                  {aiLoading ? "🔄 Анализирую..." : "🤖 Анализировать"}
                </button>
              </div>
            </div>

            {/* Результаты AI */}
            {aiResult && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Результат анализа
                    {aiResult.confidence !== undefined && (
                      <span className={`ml-2 text-sm font-normal ${
                        aiResult.confidence > 0.7 ? "text-green-600" :
                        aiResult.confidence > 0.4 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        ({Math.round(aiResult.confidence * 100)}% уверенности)
                      </span>
                    )}
                  </h2>
                  {aiResult.mode === "analyze" && aiResult.selectors && (
                    <button
                      onClick={applyAiSelectors}
                      className="bg-green-500 text-white px-4 py-1 rounded text-sm font-medium"
                    >
                      ✓ Применить селекторы
                    </button>
                  )}
                </div>

                {/* Описание */}
                {aiResult.description && (
                  <p className="text-gray-600 mb-4">{aiResult.description}</p>
                )}

                {/* Режим анализа - показать селекторы */}
                {aiResult.mode === "analyze" && aiResult.selectors && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">CSS Селекторы:</h3>
                    <div className="bg-gray-50 rounded p-4 font-mono text-sm">
                      {Object.entries(aiResult.selectors)
                        .filter(([, v]) => v)
                        .map(([key, value]) => (
                          <div key={key} className="flex gap-2 py-1">
                            <span className="text-purple-600 w-36">{key}:</span>
                            <span className="text-gray-800">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Рекомендации */}
                {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Рекомендации:</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {aiResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Примеры постов (из анализа) */}
                {aiResult.samplePosts && aiResult.samplePosts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Найденные объявления ({aiResult.samplePosts.length}):
                    </h3>
                    <div className="space-y-2">
                      {aiResult.samplePosts.slice(0, 5).map((post, i) => (
                        <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                          <div className="font-medium text-gray-900">{post.title}</div>
                          <div className="flex gap-3 mt-1 text-gray-500 text-xs">
                            {post.category && <span>📌 {post.category}</span>}
                            {post.author && <span>👤 {post.author}</span>}
                            {post.city && <span>📍 {post.city}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Режим парсинга - показать спарсенные посты */}
                {aiResult.mode === "parse" && aiResult.posts && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Спарсено объявлений: {aiResult.totalFound}
                      {aiResult.nextPageUrl && (
                        <span className="text-sm text-gray-500 ml-2">
                          (есть следующая страница)
                        </span>
                      )}
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {aiResult.posts.map((post, i) => (
                        <div key={i} className="bg-gray-50 rounded p-3 text-sm border-l-4 border-l-purple-400">
                          <div className="flex items-start justify-between">
                            <div className="font-medium text-gray-900">{post.title}</div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              post.postType === "sell" ? "bg-green-100 text-green-700" :
                              post.postType === "buy" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {post.postType === "sell" ? "Продам" :
                               post.postType === "buy" ? "Куплю" : "Другое"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-gray-500 text-xs">
                            {post.category && <span>📌 {post.category}</span>}
                            {post.author && <span>👤 {post.author}</span>}
                            {post.city && <span>📍 {post.city}</span>}
                            {post.phone && <span>📞 {post.phone}</span>}
                            {post.priceText && <span className="text-green-600 font-medium">💰 {post.priceText}</span>}
                          </div>
                          {post.url && (
                            <a href={post.url.startsWith("http") ? post.url : aiUrl.replace(/\/[^/]*$/, "/") + post.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="text-blue-500 text-xs hover:underline mt-1 inline-block">
                              🔗 Открыть
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Загрузка...</div>}>
      <ForumAdminContent />
    </Suspense>
  );
}
