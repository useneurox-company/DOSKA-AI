"use client";

import { useState, useEffect, useCallback } from "react";
import AdminNav from "../../components/AdminNav";
import { CategorySelector, JobProgressList } from "@/components/enrichment";

interface DraftMessage {
  id: string;
  messageId: number;
  text: string | null;
  date: string;
  senderId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  senderPhone: string | null;
  hasMedia: boolean;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaFileName: string | null;
  aiMessageType: string | null;
  aiProductCategory: string | null;  // Категория товара
  aiHasContacts: boolean | null;     // Найдены ли контакты
  aiConfidence: number | null;
  aiReason: string | null;
  aiCity: string | null;
  aiModel: string | null;
  aiAnalyzedAt: string | null;
  source: {
    id: string;
    name: string;
    username: string | null;
  };
}

interface ContextMessage {
  id: string;
  text: string | null;
  date: string;
  senderName: string | null;
  senderUsername: string | null;
  senderId: string | null;
  hasMedia: boolean;
  mediaUrl: string | null;
  mediaType: string | null;
  aiMessageType: string | null;
}

interface SenderMedia {
  id: string;
  date: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  text: string | null;
}

interface MessageContext {
  message: any;
  context: ContextMessage[];
  senderMedia: SenderMedia[];
  currentMessageId: string;
}

interface DraftStats {
  total: number;
  requests: number;
  offers: number;
  pending: number;
  sources: {
    id: string;
    name: string;
    username: string | null;
    total: number;
    pending: number;
  }[];
}

interface ClassificationJob {
  id: string;
  status: "running" | "stopped" | "completed" | "error";
  model: "lite" | "smart";
  total: number;
  processed: number;
  requests: number;
  offers: number;
  others: number;
  errors: number;
  startedAt: string;
  stoppedAt: string | null;
  errorMessage: string | null;
}

type FilterType = "all" | "request" | "offer";
type ModelType = "lite" | "smart";

interface EnrichmentJob {
  id: string;
  status: "running" | "stopped" | "completed" | "error";
  total: number;
  processed: number;
  enriched: number;
  errors: number;
  startedAt: string;
  stoppedAt: string | null;
}

interface EnrichmentStats {
  total: number;
  requests: number;
  offers: number;
  pending: number;
  byCategory?: {
    id: string;
    name: string;
    slug: string;
    _count: { rawMessages: number };
  }[];
}

export default function DraftsPage() {
  const [stats, setStats] = useState<DraftStats | null>(null);
  const [messages, setMessages] = useState<DraftMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [job, setJob] = useState<ClassificationJob | null>(null);

  // Stage 2: Обогащение
  const [enrichJob, setEnrichJob] = useState<EnrichmentJob | null>(null);
  const [enrichStats, setEnrichStats] = useState<EnrichmentStats | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [jobRefreshTrigger, setJobRefreshTrigger] = useState(0);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contextData, setContextData] = useState<MessageContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterSourceId, setFilterSourceId] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Classification settings
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [classifyCount, setClassifyCount] = useState("100");
  const [classifyAll, setClassifyAll] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>("smart");

  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts?stats=true");
      const data = await res.json();
      setStats(data);
    } catch {
      console.error("Error fetching stats");
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String((currentPage - 1) * pageSize));
      params.set("type", filterType);
      if (filterSourceId) params.set("sourceId", filterSourceId);

      const res = await fetch(`/api/drafts?${params.toString()}`);
      const data = await res.json();

      setMessages(data.messages || []);
      setTotalMessages(data.total || 0);
    } catch {
      console.error("Error fetching messages");
    }
  }, [filterType, filterSourceId, currentPage, pageSize]);

  const fetchJobStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts?job=true");
      const data = await res.json();
      setJob(data.job || null);
    } catch {
      console.error("Error fetching job status");
    }
  }, []);

  // Stage 2: Обогащение
  const fetchEnrichStats = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts/enrich?action=stats");
      const data = await res.json();
      setEnrichStats(data);
    } catch {
      console.error("Error fetching enrich stats");
    }
  }, []);

  const fetchEnrichJob = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts/enrich?action=status");
      const data = await res.json();
      setEnrichJob(data.job || null);
    } catch {
      console.error("Error fetching enrich job");
    }
  }, []);

  const fetchContext = async (messageId: string) => {
    setLoadingContext(true);
    try {
      const res = await fetch(`/api/drafts/${messageId}/context`);
      const data = await res.json();
      setContextData(data);
    } catch {
      console.error("Error fetching context");
    } finally {
      setLoadingContext(false);
    }
  };

  const toggleExpand = (messageId: string) => {
    if (expandedId === messageId) {
      setExpandedId(null);
      setContextData(null);
    } else {
      setExpandedId(messageId);
      fetchContext(messageId);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchMessages();
    fetchJobStatus();
    fetchEnrichStats();
    fetchEnrichJob();
  }, [fetchStats, fetchMessages, fetchJobStatus, fetchEnrichStats, fetchEnrichJob]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchJobStatus();
      fetchEnrichStats();
      fetchEnrichJob();
      if (job?.status !== "running" && enrichJob?.status !== "running") {
        fetchMessages();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchMessages, fetchJobStatus, fetchEnrichStats, fetchEnrichJob, job?.status, enrichJob?.status]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterSourceId]);

  const startClassification = async () => {
    setError("");

    // Проверяем что выбрана хотя бы одна группа
    if (selectedSources.length === 0) {
      setError("Выберите хотя бы одну группу для классификации");
      return;
    }

    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceIds: selectedSources.length > 0 ? selectedSources : undefined,
          count: classifyAll ? "all" : parseInt(classifyCount) || 100,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setJob(data.job);
    } catch {
      setError("Ошибка запуска классификации");
    }
  };

  const stopClassification = async () => {
    try {
      await fetch("/api/drafts", { method: "DELETE" });
    } catch {
      setError("Ошибка остановки");
    }
  };

  const clearJob = async () => {
    try {
      await fetch("/api/drafts", { method: "PATCH" });
      setJob(null);
    } catch {
      console.error("Error clearing job");
    }
  };

  // Stage 2: Обогащение
  const startEnrichment = async () => {
    setError("");
    if (selectedCategories.length === 0) {
      setError("Выберите хотя бы одну категорию");
      return;
    }
    try {
      const res = await fetch("/api/drafts/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryIds: selectedCategories,
          limit: enrichStats?.pending || 50,
          aiModel: "smart",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setJobRefreshTrigger((t) => t + 1);
    } catch {
      setError("Ошибка запуска обогащения");
    }
  };

  const stopEnrichment = async (jobId?: string) => {
    try {
      const url = jobId
        ? `/api/drafts/enrich?jobId=${jobId}`
        : "/api/drafts/enrich?all=true";
      await fetch(url, { method: "DELETE" });
      setJobRefreshTrigger((t) => t + 1);
    } catch {
      setError("Ошибка остановки");
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const selectAllSources = () => {
    if (!stats) return;
    if (selectedSources.length === stats.sources.length) {
      setSelectedSources([]);
    } else {
      setSelectedSources(stats.sources.map(s => s.id));
    }
  };

  const totalPending = stats?.sources.reduce((acc, s) => acc + s.pending, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <AdminNav
          totalMessages={stats?.total}
        />

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Черновик</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError("")} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Stats and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Statistics - compact */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold mb-3 text-gray-900">Статистика</h2>
            {stats ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Всего:</span>
                  <span className="font-medium">{stats.total.toLocaleString("ru-RU")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">Купить:</span>
                  <span className="font-medium text-blue-600">{stats.requests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Продать:</span>
                  <span className="font-medium text-green-600">{stats.offers}</span>
                </div>
                <div className="border-t pt-1.5 mt-1.5">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Ожидает:</span>
                    <span className="font-medium text-orange-600">{stats.pending.toLocaleString("ru-RU")}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Загрузка...</p>
            )}
          </div>

          {/* Source Selection - compact */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900">Группы</h2>
              <span className="text-xs text-gray-500">{selectedSources.length} из {stats?.sources.length || 0}</span>
            </div>
            {/* Кнопка выбрать все */}
            <button onClick={selectAllSources}
              className={`w-full mb-2 py-1.5 rounded text-xs font-medium transition ${
                selectedSources.length === (stats?.sources.length || 0)
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}>
              {selectedSources.length === (stats?.sources.length || 0) ? "Снять все" : "Выбрать все"}
            </button>
            <div className="max-h-40 overflow-y-auto border rounded p-1.5 space-y-0.5">
              {stats?.sources.map(source => (
                <label key={source.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input type="checkbox" checked={selectedSources.includes(source.id)} onChange={() => toggleSource(source.id)} className="rounded w-3 h-3" />
                  <span className="flex-1 text-gray-900">{source.name}</span>
                  <span className="text-orange-600 shrink-0">{source.pending}</span>
                </label>
              ))}
              {!stats?.sources.length && <p className="text-xs text-gray-500 text-center py-1">Нет групп</p>}
            </div>
          </div>

          {/* Classification Actions - compact */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold mb-2 text-gray-900">Классификация</h2>
            <div className="space-y-2">
              {/* Count input */}
              <div className="flex gap-1">
                <input type="number" value={classifyCount} onChange={(e) => { setClassifyCount(e.target.value); setClassifyAll(false); }}
                  disabled={classifyAll} className="flex-1 border rounded px-2 py-1 text-xs w-16 text-gray-900 bg-white" placeholder="100" min="1" />
                <button onClick={() => setClassifyAll(!classifyAll)}
                  className={`px-2 py-1 rounded text-xs font-medium ${classifyAll ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  Все ({totalPending})
                </button>
              </div>
              {/* Run button */}
              <button onClick={startClassification} disabled={job?.status === "running" || totalPending === 0 || selectedSources.length === 0}
                className="w-full bg-blue-500 text-white px-3 py-1.5 rounded disabled:opacity-50 text-xs font-medium">
                {job?.status === "running" ? "Идёт..." : selectedSources.length === 0 ? "Выберите группу" : "Запустить"}
              </button>
              {/* Progress */}
              {job && (
                <div className={`p-2 rounded border text-xs ${job.status === "running" ? "bg-blue-50 border-blue-200" : job.status === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-800 font-semibold">{job.processed}/{job.total}</span>
                    {job.status === "running" ? (
                      <button onClick={stopClassification} className="text-red-500 text-xs">Стоп</button>
                    ) : (
                      <button onClick={clearJob} className="text-gray-500">✕</button>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${job.status === "running" ? "bg-blue-500" : job.status === "error" ? "bg-red-500" : "bg-green-500"}`}
                      style={{ width: `${job.total > 0 ? (job.processed / job.total) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stage 2: Обогащение - compact */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold mb-2 text-gray-900">Обогащение</h2>
            <div className="space-y-2">
              {/* Stats inline */}
              <div className="flex gap-2 text-xs">
                <span className="text-blue-600">Заявок: <b>{enrichStats?.requests || 0}</b></span>
                <span className="text-green-600">Предл: <b>{enrichStats?.offers || 0}</b></span>
                <span className="text-orange-600 ml-auto">Ожид: <b>{enrichStats?.pending || 0}</b></span>
              </div>
              {/* Category selector */}
              <CategorySelector selectedIds={selectedCategories} onChange={setSelectedCategories} disabled={false} />
              {/* Run button */}
              <button onClick={startEnrichment} disabled={selectedCategories.length === 0 || !enrichStats?.pending}
                className="w-full bg-purple-500 text-white px-3 py-1.5 rounded disabled:opacity-50 text-xs font-medium">
                Обогатить ({selectedCategories.length} кат.)
              </button>
              {/* Job progress */}
              <JobProgressList onStop={(jobId) => stopEnrichment(jobId)} refreshTrigger={jobRefreshTrigger} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Type filter */}
            <div className="flex gap-1">
              {[
                { value: "all", label: "Все", color: "bg-gray-500" },
                { value: "request", label: "Хочу купить", color: "bg-blue-500" },
                { value: "offer", label: "Хочу продать", color: "bg-green-500" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value as FilterType)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    filterType === opt.value
                      ? `${opt.color} text-white`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                  {stats && opt.value === "request" && ` (${stats.requests})`}
                  {stats && opt.value === "offer" && ` (${stats.offers})`}
                  {stats && opt.value === "all" && ` (${stats.total})`}
                </button>
              ))}
            </div>

            {/* Source filter */}
            <select
              value={filterSourceId}
              onChange={(e) => setFilterSourceId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
            >
              <option value="">Все группы</option>
              {stats?.sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            {/* Reset */}
            {(filterType !== "all" || filterSourceId) && (
              <button
                onClick={() => {
                  setFilterType("all");
                  setFilterSourceId("");
                }}
                className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Черновики</h2>
            <span className="text-sm text-gray-500">
              {totalMessages > 0 ? (
                <>
                  {((currentPage - 1) * pageSize) + 1}-
                  {Math.min(currentPage * pageSize, totalMessages)} из {totalMessages}
                </>
              ) : (
                "0 записей"
              )}
            </span>
          </div>

          <div className="divide-y divide-gray-200">
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Main row */}
                <div
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                    expandedId === msg.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => toggleExpand(msg.id)}
                >
                  {/* Expand icon */}
                  <span className="text-gray-500 w-5">
                    {expandedId === msg.id ? "▼" : "▶"}
                  </span>

                  {/* Type */}
                  <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                    msg.aiMessageType === "request"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {msg.aiMessageType === "request" ? "Купить" : "Продать"}
                  </span>

                  {/* Category */}
                  {msg.aiProductCategory && (
                    <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                      msg.aiProductCategory === "metal" ? "bg-slate-100 text-slate-700" :
                      msg.aiProductCategory === "construction" ? "bg-amber-100 text-amber-700" :
                      msg.aiProductCategory === "metalwork" ? "bg-indigo-100 text-indigo-700" :
                      msg.aiProductCategory === "building" ? "bg-teal-100 text-teal-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {msg.aiProductCategory === "metal" ? "Металл" :
                       msg.aiProductCategory === "construction" ? "МК" :
                       msg.aiProductCategory === "metalwork" ? "Обработка" :
                       msg.aiProductCategory === "building" ? "Стройка" :
                       msg.aiProductCategory}
                    </span>
                  )}

                  {/* AI Confidence */}
                  <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                    msg.aiConfidence !== null && msg.aiConfidence >= 0.7
                      ? "bg-green-100 text-green-700"
                      : msg.aiConfidence !== null && msg.aiConfidence >= 0.5
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {msg.aiConfidence !== null ? `${Math.round(msg.aiConfidence * 100)}%` : "-"}
                  </span>

                  {/* AI Model */}
                  {msg.aiModel && (
                    <span className={`px-1.5 py-1 rounded text-xs shrink-0 ${
                      msg.aiModel === "gemini-smart" ? "bg-purple-100 text-purple-600" : "bg-yellow-100 text-yellow-600"
                    }`} title={msg.aiModel === "gemini-smart" ? "Gemini 3 Flash" : "Gemini Lite"}>
                      {msg.aiModel === "gemini-smart" ? "G3" : "G"}
                    </span>
                  )}

                  {/* No Contacts Badge - показываем если НЕТ контактов нигде (ни в тексте, ни username, ни phone) */}
                  {msg.aiHasContacts !== true && !msg.senderUsername && !msg.senderPhone && (
                    <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 shrink-0 font-medium" title="Нет возможности связаться">
                      Без контактов
                    </span>
                  )}

                  {/* AI Reason */}
                  {msg.aiReason && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 shrink-0 max-w-48 truncate" title={msg.aiReason}>
                      {msg.aiReason}
                    </span>
                  )}

                  {/* Message preview */}
                  <p className="text-sm text-gray-900 flex-1 truncate">
                    {msg.text || (msg.hasMedia ? "Только фото" : "(без текста)")}
                  </p>

                  {/* Media indicator with type */}
                  {msg.hasMedia && (
                    <span className={`px-2 py-1 rounded text-xs shrink-0 ${
                      msg.mediaType?.includes("image") ? "bg-purple-100 text-purple-700" :
                      msg.mediaType?.includes("pdf") || msg.mediaType?.includes("document") ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {msg.mediaType?.includes("image") ? "📷 Фото" :
                       msg.mediaType?.includes("pdf") ? "📄 PDF" :
                       msg.mediaType?.includes("spreadsheet") || msg.mediaType?.includes("excel") ? "📊 Excel" :
                       msg.mediaType?.includes("document") || msg.mediaType?.includes("word") ? "📝 Документ" :
                       "📎 Файл"}
                    </span>
                  )}

                  {/* Contact */}
                  <div className="text-sm text-gray-600 shrink-0 w-32 truncate">
                    {msg.senderName || msg.senderUsername || "Аноним"}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-500 shrink-0 w-20">
                    {new Date(msg.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                    {" "}
                    {new Date(msg.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Expanded context */}
                {expandedId === msg.id && (
                  <div className="bg-gray-50 border-t px-4 py-4">
                    {loadingContext ? (
                      <p className="text-gray-500 text-center py-4">Загрузка контекста...</p>
                    ) : contextData ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Contact info */}
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3">Контакт</h4>
                          <div className="space-y-2 text-sm">
                            {/* Имя - всегда показываем */}
                            <p>
                              <span className="text-gray-500">Имя:</span>{" "}
                              <span className="font-medium">{msg.senderName || "Не указано"}</span>
                            </p>

                            {/* Telegram username */}
                            <p>
                              <span className="text-gray-500">Telegram:</span>{" "}
                              {msg.senderUsername ? (
                                <a
                                  href={`https://t.me/${msg.senderUsername}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  @{msg.senderUsername}
                                </a>
                              ) : (
                                <span className="text-gray-500">не указан</span>
                              )}
                            </p>

                            {/* Телефон */}
                            <p>
                              <span className="text-gray-500">Телефон:</span>{" "}
                              {msg.senderPhone ? (
                                <a
                                  href={`tel:${msg.senderPhone}`}
                                  className="text-green-600 hover:underline font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {msg.senderPhone}
                                </a>
                              ) : (
                                <span className="text-gray-500">не указан</span>
                              )}
                            </p>

                            {/* Город */}
                            <p>
                              <span className="text-gray-500">Город:</span>{" "}
                              <span className={msg.aiCity ? "font-medium" : "text-gray-500"}>
                                {msg.aiCity || "не определён"}
                              </span>
                            </p>

                            {/* ID пользователя */}
                            {msg.senderId && (
                              <p>
                                <span className="text-gray-500">ID:</span>{" "}
                                <span className="text-gray-600 font-mono text-xs">{msg.senderId}</span>
                              </p>
                            )}

                            {/* Группа */}
                            <div className="pt-2 border-t mt-2">
                              <p>
                                <span className="text-gray-500">Группа:</span>{" "}
                                <span className="font-medium">{msg.source.name}</span>
                              </p>
                              {msg.source.username && (
                                <p className="text-xs text-gray-500">@{msg.source.username}</p>
                              )}
                            </div>
                          </div>

                          {/* Attached file to THIS message */}
                          {msg.hasMedia && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h5 className="font-medium text-blue-700 mb-2">Файл заявки/предложения</h5>
                              {msg.mediaUrl ? (
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block"
                                >
                                  {msg.mediaType?.includes("image") ? (
                                    <div>
                                      <img
                                        src={msg.mediaUrl}
                                        alt=""
                                        className="max-w-full max-h-48 rounded border hover:opacity-80"
                                      />
                                      {msg.mediaFileName && (
                                        <p className="text-xs text-gray-500 mt-1">{msg.mediaFileName}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-gray-50">
                                      <span className="text-2xl">
                                        {msg.mediaType?.includes("pdf") ? "📄" :
                                         msg.mediaType?.includes("spreadsheet") || msg.mediaType?.includes("excel") ? "📊" :
                                         msg.mediaType?.includes("document") || msg.mediaType?.includes("word") ? "📝" :
                                         "📎"}
                                      </span>
                                      <div>
                                        <span className="text-blue-600 hover:underline text-sm block">
                                          {msg.mediaFileName || "Скачать файл"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {msg.mediaType || "файл"}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </a>
                              ) : (
                                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border text-gray-500">
                                  <span className="text-xl">📎</span>
                                  <div>
                                    <span className="text-sm">{msg.mediaFileName || "Файл"}</span>
                                    <span className="text-xs block text-gray-500">
                                      {msg.mediaType || "не загружен"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sender media */}
                          {contextData.senderMedia.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-medium text-gray-700 mb-2">Файлы от автора ({contextData.senderMedia.length})</h5>
                              <div className="flex flex-wrap gap-2">
                                {contextData.senderMedia.map((media) => (
                                  media.mediaUrl && (
                                    <a
                                      key={media.id}
                                      href={media.mediaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="block"
                                    >
                                      {media.mediaType?.startsWith("image") ? (
                                        <img
                                          src={media.mediaUrl}
                                          alt=""
                                          className="w-16 h-16 object-cover rounded border hover:opacity-80"
                                        />
                                      ) : (
                                        <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                                          📄
                                        </div>
                                      )}
                                    </a>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Context messages */}
                        <div className="lg:col-span-2 bg-white rounded-lg p-4 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Переписка ({contextData.context.length} сообщений)
                          </h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {contextData.context.map((ctxMsg) => {
                              const isCurrentMessage = ctxMsg.id === contextData.currentMessageId;
                              const isSameSender = ctxMsg.senderId === contextData.message.senderId;

                              return (
                                <div
                                  key={ctxMsg.id}
                                  className={`p-2 rounded text-sm ${
                                    isCurrentMessage
                                      ? "bg-blue-100 border-2 border-blue-400"
                                      : isSameSender
                                      ? "bg-yellow-50 border border-yellow-200"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-medium ${isSameSender ? "text-blue-600" : "text-gray-700"}`}>
                                      {ctxMsg.senderName || ctxMsg.senderUsername || "Аноним"}
                                    </span>
                                    {isSameSender && <span className="text-xs text-blue-500">(автор заявки)</span>}
                                    {ctxMsg.aiMessageType && ctxMsg.aiMessageType !== "other" && (
                                      <span className={`text-xs px-1 rounded ${
                                        ctxMsg.aiMessageType === "request" ? "bg-blue-200 text-blue-700" : "bg-green-200 text-green-700"
                                      }`}>
                                        {ctxMsg.aiMessageType === "request" ? "заявка" : "предложение"}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-auto">
                                      {new Date(ctxMsg.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                  <p className="text-gray-800 whitespace-pre-wrap">{ctxMsg.text}</p>
                                  {ctxMsg.hasMedia && ctxMsg.mediaUrl && (
                                    <a
                                      href={ctxMsg.mediaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-2 inline-block"
                                    >
                                      <img
                                        src={ctxMsg.mediaUrl}
                                        alt=""
                                        className="max-w-xs max-h-32 rounded border hover:opacity-80"
                                      />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Не удалось загрузить контекст</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                {stats?.total === 0
                  ? "Нет классифицированных сообщений. Запустите классификацию выше."
                  : "Нет сообщений с выбранными фильтрами"}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalMessages > pageSize && (
            <div className="p-4 border-t flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-gray-900"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-gray-900"
              >
                «
              </button>

              <span className="px-3 py-1 text-sm text-gray-600">
                Страница {currentPage} из {Math.ceil(totalMessages / pageSize)}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalMessages / pageSize), p + 1))}
                disabled={currentPage >= Math.ceil(totalMessages / pageSize)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-gray-900"
              >
                »
              </button>
              <button
                onClick={() => setCurrentPage(Math.ceil(totalMessages / pageSize))}
                disabled={currentPage >= Math.ceil(totalMessages / pageSize)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-gray-900"
              >
                »»
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
