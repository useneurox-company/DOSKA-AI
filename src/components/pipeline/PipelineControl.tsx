"use client";

import { useEffect, useState, useCallback } from "react";

// Types
interface CycleStats {
  parsed: number;
  classified: number;
  enriched: number;
  matched: number;
}

interface PipelineState {
  isRunning: boolean;
  currentStage: "idle" | "parsing" | "classifying" | "enriching" | "matching";
  lastRun: string | null;
  lastCycleStats: CycleStats | null;
  totalStats: CycleStats;
  error: string | null;
}

interface PipelineSettings {
  autoPipelineEnabled: boolean;
  autoClassifyEnabled: boolean;
  autoEnrichEnabled: boolean;
  autoMatchEnabled: boolean;
  globalParseFromDate: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  idle: "Ожидание",
  parsing: "Парсинг сообщений...",
  classifying: "Классификация...",
  enriching: "Обогащение карточек...",
  matching: "Поиск матчей...",
};

export function PipelineControl() {
  const [state, setState] = useState<PipelineState | null>(null);
  const [settings, setSettings] = useState<PipelineSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setState(data.state);
      setSettings(data.settings);
    } catch (error) {
      console.error("Failed to fetch pipeline status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling while running
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus();
    }, state?.isRunning ? 1500 : 5000);

    return () => clearInterval(interval);
  }, [fetchStatus, state?.isRunning]);

  // Actions
  const handleAction = async (action: "start" | "stop" | "runOnce") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      }
      await fetchStatus();
    } catch (error) {
      console.error(`Pipeline ${action} failed:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  // Update settings
  const updateSettings = async (updates: Partial<PipelineSettings>) => {
    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  // Format date for input
  const formatDateForInput = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      updateSettings({ globalParseFromDate: new Date(value).toISOString() });
    } else {
      updateSettings({ globalParseFromDate: null });
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  const isRunning = state?.isRunning || false;
  const isAuto = settings?.autoPipelineEnabled || false;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : isAuto ? "bg-blue-500" : "bg-gray-400"}`} />
          Автопайплайн
          <span className="text-xs font-normal text-gray-500 ml-2">(Smart AI)</span>
        </h3>

        {/* Main toggle */}
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="text-sm text-blue-600 font-medium">
              {STAGE_LABELS[state?.currentStage || "idle"]}
            </span>
          )}

          {isAuto ? (
            <button
              onClick={() => handleAction("stop")}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
            >
              Остановить
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("runOnce")}
                disabled={actionLoading || isRunning}
                className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
              >
                Запустить раз
              </button>
              <button
                onClick={() => handleAction("start")}
                disabled={actionLoading || isRunning}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
              >
                Включить авто
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ГЛОБАЛЬНАЯ ДАТА - всегда видна */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Парсить сообщения с даты (для всех каналов)
        </label>
        <input
          type="date"
          value={formatDateForInput(settings?.globalParseFromDate || null)}
          onChange={handleDateChange}
          className="px-3 py-2 border rounded-lg text-sm w-full max-w-xs"
        />
        {!settings?.globalParseFromDate && (
          <p className="text-xs text-gray-500 mt-1">
            Не установлена — будут парситься только новые сообщения
          </p>
        )}
      </div>

      {/* Progress bar when running */}
      {isRunning && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-300"
              style={{
                width: state?.currentStage === "parsing" ? "25%" :
                       state?.currentStage === "classifying" ? "50%" :
                       state?.currentStage === "enriching" ? "75%" :
                       state?.currentStage === "matching" ? "90%" : "0%",
              }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {state.error}
        </div>
      )}

      {/* Last cycle stats */}
      {state?.lastCycleStats && (
        <div className="grid grid-cols-4 gap-3 mb-4 text-center">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-700">{state.lastCycleStats.parsed}</div>
            <div className="text-xs text-gray-500">Спарсено</div>
          </div>
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-lg font-semibold text-blue-700">{state.lastCycleStats.classified}</div>
            <div className="text-xs text-gray-500">Классиф.</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-lg font-semibold text-green-700">{state.lastCycleStats.enriched}</div>
            <div className="text-xs text-gray-500">Обогащено</div>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <div className="text-lg font-semibold text-purple-700">{state.lastCycleStats.matched}</div>
            <div className="text-xs text-gray-500">Матчей</div>
          </div>
        </div>
      )}

      {/* Last run time */}
      {state?.lastRun && (
        <div className="text-xs text-gray-500 mb-3">
          Последний запуск: {new Date(state.lastRun).toLocaleString("ru-RU")}
        </div>
      )}

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <svg className={`w-4 h-4 transition-transform ${showSettings ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Настройки этапов
      </button>

      {/* Settings panel - упрощённый */}
      {showSettings && settings && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Toggles - только включение/выключение этапов */}
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoClassifyEnabled}
                onChange={(e) => updateSettings({ autoClassifyEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Классификация</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoEnrichEnabled}
                onChange={(e) => updateSettings({ autoEnrichEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Обогащение</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoMatchEnabled}
                onChange={(e) => updateSettings({ autoMatchEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Матчинг</span>
            </label>
          </div>

          {/* Info about Smart mode */}
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            AI модель: <b>Smart</b> (максимальная точность) — работает пока не обработает все данные
          </div>

          {/* Total stats */}
          {state?.totalStats && (state.totalStats.parsed > 0 || state.totalStats.classified > 0) && (
            <div className="pt-3 border-t">
              <div className="text-xs text-gray-500 mb-2">Всего за сессию:</div>
              <div className="flex gap-4 text-xs">
                <span>Спарсено: <b>{state.totalStats.parsed}</b></span>
                <span>Классиф.: <b>{state.totalStats.classified}</b></span>
                <span>Обогащено: <b>{state.totalStats.enriched}</b></span>
                <span>Матчей: <b>{state.totalStats.matched}</b></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
