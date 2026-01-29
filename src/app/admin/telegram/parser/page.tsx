"use client";

import { useState, useEffect } from "react";
import AdminNav from "../../components/AdminNav";
import { PipelineControl } from "@/components/pipeline/PipelineControl";

interface TelegramUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  username?: string;
}

interface Source {
  id: string;
  name: string;
  username: string | null;
  chatId: string | null;
  isActive: boolean;
  lastParsed: string | null;
  parseFromDate: string | null;
  messageCount: number;
  _count: { rawMessages: number };
}

interface Account {
  id: string;
  phone: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Settings {
  intervalMinutes: number;
  isSchedulerEnabled: boolean;
}

interface SchedulerStatus {
  isActive: boolean;
  isRunning: boolean;
  lastRun: string | null;
  lastResult: { total: number; errors: number } | null;
}

export default function TelegramAdminPage() {
  const [authStatus, setAuthStatus] = useState<{ authorized: boolean; user?: TelegramUser }>({ authorized: false });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "2fa">("phone");
  const [sources, setSources] = useState<Source[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<Settings>({
    intervalMinutes: 15,
    isSchedulerEnabled: true,
  });
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus>({
    isActive: false,
    isRunning: false,
    lastRun: null,
    lastResult: null,
  });
  const [newSource, setNewSource] = useState({ name: "", username: "", parseFromDate: "" });
  const [loading, setLoading] = useState(false);
  const [parsingSourceId, setParsingSourceId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);

  const fetchAIStats = async () => {
    try {
      const res = await fetch("/api/ai/analyze");
      const data = await res.json();
      if (data.analyzed !== undefined) {
        setAnalyzedCount(data.analyzed);
      }
    } catch {
      console.error("Ошибка загрузки AI статистики");
    }
  };

  useEffect(() => {
    checkAuth();
    fetchSources();
    fetchAccounts();
    fetchSettings();
    fetchAIStats();

    // Обновляем статус каждые 5 секунд
    const interval = setInterval(() => {
      fetchSettings();
      fetchSources();
      fetchAIStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/telegram/auth");
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setError("Ошибка проверки авторизации");
    }
  };

  const sendCode = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendCode", phone }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("code");
      } else {
        setError(data.error || "Ошибка отправки кода");
      }
    } catch {
      setError("Ошибка отправки кода");
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyCode", phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        checkAuth();
        fetchAccounts();
        setStep("phone");
        setCode("");
        setPhone("");
        setShowAddAccount(false);
      } else if (data.requires2FA) {
        setStep("2fa");
      } else {
        setError(data.error || "Ошибка проверки кода");
      }
    } catch {
      setError("Ошибка проверки кода");
    }
    setLoading(false);
  };

  const verify2FA = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify2FA", phone, password }),
      });
      const data = await res.json();
      if (data.success) {
        checkAuth();
        fetchAccounts();
        setStep("phone");
        setPassword("");
        setPhone("");
        setShowAddAccount(false);
      } else {
        setError(data.error || "Ошибка проверки 2FA");
      }
    } catch {
      setError("Ошибка проверки 2FA");
    }
    setLoading(false);
  };

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/telegram/sources");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSources(data);
      }
    } catch {
      console.error("Ошибка загрузки источников");
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/telegram/accounts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);
      }
    } catch {
      console.error("Ошибка загрузки аккаунтов");
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/telegram/settings");
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
      if (data.scheduler) {
        setSchedulerStatus(data.scheduler);
      }
    } catch {
      console.error("Ошибка загрузки настроек");
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await fetch("/api/telegram/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      fetchSettings();
    } catch {
      setError("Ошибка сохранения настроек");
    }
  };

  const addSource = async () => {
    if (!newSource.name || !newSource.username) {
      setError("Введите название и @username канала");
      return;
    }
    if (!newSource.parseFromDate) {
      setError("Выберите дату начала парсинга");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Добавляем канал
      const res = await fetch("/api/telegram/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSource.name,
          username: newSource.username,
          parseFromDate: newSource.parseFromDate,
        }),
      });

      const sourceData = await res.json();

      if (res.ok && sourceData.id) {
        setNewSource({ name: "", username: "", parseFromDate: "" });
        fetchSources();

        // 2. Автоматически запускаем парсинг
        setParsingSourceId(sourceData.id);

        const parseRes = await fetch("/api/telegram/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: sourceData.id, fullHistory: true }),
        });

        const parseData = await parseRes.json();
        setParsingSourceId(null);
        fetchSources();

        if (parseData.success || parseData.newMessages !== undefined) {
          // Парсинг успешен
        } else {
          setError(parseData.error || "Ошибка парсинга");
        }
      } else {
        setError(sourceData.error || "Ошибка добавления канала");
      }
    } catch {
      setError("Ошибка добавления канала");
    }

    setLoading(false);
  };

  const toggleSourceActive = async (sourceId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/telegram/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceId, isActive }),
      });
      if (res.ok) {
        fetchSources();
      }
    } catch {
      setError("Ошибка обновления");
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Удалить этот канал и все его сообщения?")) return;
    try {
      await fetch(`/api/telegram/sources?id=${id}`, { method: "DELETE" });
      fetchSources();
    } catch {
      setError("Ошибка удаления");
    }
  };

  const deleteAccount = async (phoneToDelete: string) => {
    if (!confirm("Удалить этот аккаунт?")) return;
    try {
      await fetch(`/api/telegram/accounts?phone=${encodeURIComponent(phoneToDelete)}`, { method: "DELETE" });
      fetchAccounts();
      checkAuth();
    } catch {
      setError("Ошибка удаления аккаунта");
    }
  };

  // Распределение каналов по аккаунтам
  const getAccountForSource = (sourceIndex: number): Account | null => {
    if (accounts.length === 0) return null;
    const accountIndex = sourceIndex % accounts.length;
    return accounts[accountIndex];
  };

  // Данные для навигации
  const lastParsed = sources
    .filter((s) => s.lastParsed)
    .sort((a, b) => new Date(b.lastParsed!).getTime() - new Date(a.lastParsed!).getTime())[0]?.lastParsed || null;

  const totalMessages = sources.reduce((acc, s) => acc + (s._count?.rawMessages || 0), 0);

  // Если нет аккаунта - показываем форму входа
  if (!authStatus.authorized && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Telegram Парсер</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
              <button onClick={() => setError("")} className="float-right font-bold">×</button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Войти в Telegram</h2>

            {step === "phone" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="+79001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-900"
                />
                <button
                  onClick={sendCode}
                  disabled={loading || !phone}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? "Отправка..." : "Получить код"}
                </button>
              </div>
            )}

            {step === "code" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Код отправлен на {phone}</p>
                <input
                  type="text"
                  placeholder="Код из Telegram"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-900"
                />
                <button
                  onClick={verifyCode}
                  disabled={loading || !code}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? "Проверка..." : "Войти"}
                </button>
                <button onClick={() => setStep("phone")} className="w-full text-gray-500 text-sm">
                  Назад
                </button>
              </div>
            )}

            {step === "2fa" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Введите пароль двухфакторной аутентификации</p>
                <input
                  type="password"
                  placeholder="Пароль 2FA"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-900"
                />
                <button
                  onClick={verify2FA}
                  disabled={loading || !password}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? "Проверка..." : "Подтвердить"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Навигация */}
        <AdminNav
          lastParsed={lastParsed}
          totalMessages={totalMessages}
          analyzedMessages={analyzedCount}
        />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Telegram Парсер</h1>
          <div className="flex items-center gap-3">
            {schedulerStatus.isRunning && (
              <span className="flex items-center gap-1 text-yellow-600 text-sm">
                <span className="animate-spin">⟳</span> Парсинг...
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError("")} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Аккаунты и Настройки в одной строке */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Аккаунты */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Аккаунты ({accounts.length})</h2>
              <button
                onClick={() => setShowAddAccount(!showAddAccount)}
                className="text-blue-500 text-sm hover:underline"
              >
                {showAddAccount ? "Отмена" : "+ Добавить"}
              </button>
            </div>

            {/* Форма добавления аккаунта */}
            {showAddAccount && (
              <div className="border rounded p-3 mb-3 bg-gray-50">
                {step === "phone" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+79001234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 border rounded px-3 py-2 text-gray-900 text-sm"
                    />
                    <button
                      onClick={sendCode}
                      disabled={loading || !phone}
                      className="bg-blue-500 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                    >
                      {loading ? "..." : "Код"}
                    </button>
                  </div>
                )}
                {step === "code" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Код отправлен на {phone}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Код"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 border rounded px-3 py-2 text-gray-900 text-sm"
                      />
                      <button
                        onClick={verifyCode}
                        disabled={loading || !code}
                        className="bg-green-500 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                      >
                        {loading ? "..." : "Войти"}
                      </button>
                    </div>
                  </div>
                )}
                {step === "2fa" && (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Пароль 2FA"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 border rounded px-3 py-2 text-gray-900 text-sm"
                    />
                    <button
                      onClick={verify2FA}
                      disabled={loading || !password}
                      className="bg-green-500 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                    >
                      {loading ? "..." : "OK"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Список аккаунтов */}
            <div className="space-y-2">
              {accounts.map((account, idx) => (
                <div key={account.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(${idx * 137.5 % 360}, 70%, 50%)` }}
                    ></span>
                    <span className="font-medium text-gray-900">{account.phone}</span>
                    {account.name && <span className="text-gray-500">({account.name})</span>}
                  </div>
                  <button
                    onClick={() => deleteAccount(account.phone)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Удалить
                  </button>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">Нет аккаунтов</p>
              )}
            </div>
          </div>

          {/* Настройки */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">Настройки</h2>

            {/* Автопарсинг вкл/выкл */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700">Автопарсинг</span>
              <button
                onClick={() => updateSettings({ isSchedulerEnabled: !settings.isSchedulerEnabled })}
                className={`px-4 py-1 rounded text-sm font-medium ${
                  settings.isSchedulerEnabled
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {settings.isSchedulerEnabled ? "Включен" : "Выключен"}
              </button>
            </div>

            {/* Интервал */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Интервал (мин)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.intervalMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSettings({ ...settings, intervalMinutes: val });
                  }}
                  onBlur={() => updateSettings({ intervalMinutes: settings.intervalMinutes })}
                  className="w-20 border rounded px-2 py-1 text-gray-900 text-sm text-center"
                  min={1}
                  max={1440}
                />
              </div>
            </div>

            {/* Статус */}
            <div className="mt-4 pt-3 border-t text-xs text-gray-500">
              {schedulerStatus.lastRun && (
                <div>Последний запуск: {new Date(schedulerStatus.lastRun).toLocaleString("ru-RU")}</div>
              )}
              {schedulerStatus.lastResult && (
                <div>
                  Результат: {schedulerStatus.lastResult.total} новых
                  {schedulerStatus.lastResult.errors > 0 && (
                    <span className="text-red-500">, {schedulerStatus.lastResult.errors} ошибок</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Автопайплайн */}
        <div className="mb-6">
          <PipelineControl />
        </div>

        {/* Форма добавления канала */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Добавить канал</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Название"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              className="border rounded px-3 py-2 text-gray-900"
            />
            <input
              type="text"
              placeholder="@username"
              value={newSource.username}
              onChange={(e) => setNewSource({ ...newSource, username: e.target.value })}
              className="border rounded px-3 py-2 text-gray-900"
            />
            <input
              type="date"
              value={newSource.parseFromDate}
              onChange={(e) => setNewSource({ ...newSource, parseFromDate: e.target.value })}
              className="border rounded px-3 py-2 text-gray-900"
              title="Парсить с даты"
            />
            <button
              onClick={addSource}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 font-medium"
            >
              {loading ? "..." : "Добавить"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            После добавления парсинг запустится автоматически
          </p>
        </div>

        {/* Список каналов */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            Каналы ({sources.length})
          </h2>

          <div className="space-y-3">
            {sources.map((source, idx) => {
              const account = getAccountForSource(idx);
              const accountColor = account ? `hsl(${accounts.indexOf(account) * 137.5 % 360}, 70%, 50%)` : "#ccc";

              return (
                <div
                  key={source.id}
                  className={`border rounded-lg p-4 ${!source.isActive ? "bg-gray-50 opacity-70" : ""} ${parsingSourceId === source.id ? "border-yellow-400 bg-yellow-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {/* Индикатор аккаунта */}
                        {account && (
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: accountColor }}
                            title={`Аккаунт: ${account.phone}`}
                          ></span>
                        )}
                        <span className="font-medium text-gray-900">{source.name}</span>
                        <span className="text-gray-500 text-sm">{source.username}</span>
                        {parsingSourceId === source.id && (
                          <span className="text-yellow-600 text-xs animate-pulse">парсинг...</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 ml-5">
                        <span className="font-medium">{source._count.rawMessages}</span> сообщений
                        {source.parseFromDate && (
                          <span className="ml-3">
                            с {new Date(source.parseFromDate).toLocaleDateString("ru-RU")}
                          </span>
                        )}
                        {source.lastParsed && (
                          <span className="ml-3 text-gray-500">
                            обновлено {new Date(source.lastParsed).toLocaleString("ru-RU")}
                          </span>
                        )}
                        {account && (
                          <span className="ml-3 text-gray-500">
                            → {account.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Кнопка Остановить/Возобновить */}
                      <button
                        onClick={() => toggleSourceActive(source.id, !source.isActive)}
                        className={`px-4 py-2 rounded text-sm font-medium ${
                          source.isActive
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {source.isActive ? "Остановить" : "Возобновить"}
                      </button>

                      {/* Кнопка Удалить */}
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="px-4 py-2 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {sources.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                Добавьте первый канал для начала парсинга
              </div>
            )}
          </div>
        </div>

        {/* Статус внизу */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          {schedulerStatus.isActive ? (
            <span className="text-green-600">● Автопарсинг активен (каждые {settings.intervalMinutes} мин)</span>
          ) : (
            <span className="text-gray-500">○ Автопарсинг выключен</span>
          )}
        </div>
      </div>
    </div>
  );
}
