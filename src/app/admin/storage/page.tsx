"use client";

/**
 * Админ-панель хранилища медиа-файлов
 * Показывает статистику и позволяет очищать старые файлы
 */

import { useState, useEffect, useCallback } from "react";

interface FileStats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  byType: Record<string, { count: number; size: number }>;
  oldestFile: string | null;
  newestFile: string | null;
}

interface DbStats {
  totalMessages: number;
  messagesWithMedia: number;
  mediaDownloaded: number;
  mediaPending: number;
  requestOfferWithMedia: number;
  otherWithMedia: number;
}

interface StorageStats {
  success: boolean;
  files: FileStats;
  database: DbStats;
  uploadsDir: string;
}

export default function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [olderThanDays, setOlderThanDays] = useState(30);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/storage");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDelete = async (params: string) => {
    if (!confirm("Вы уверены? Это действие нельзя отменить.")) return;

    setDeleting(true);
    setDeleteResult(null);

    try {
      const res = await fetch(`/api/admin/storage?${params}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setDeleteResult(`Удалено файлов: ${data.deleted} (${data.deletedSize})`);
        fetchStats();
      } else {
        setDeleteResult(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      setDeleteResult("Ошибка при удалении");
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Хранилище медиа</h1>
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (!stats?.success) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Хранилище медиа</h1>
        <div className="text-red-500">Ошибка загрузки статистики</div>
      </div>
    );
  }

  const { files, database } = stats;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Хранилище медиа</h1>

      {/* Статистика файлов */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Файлы на диске</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-bold text-blue-600">{files.totalFiles}</div>
            <div className="text-sm text-gray-500">файлов</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">{files.totalSizeFormatted}</div>
            <div className="text-sm text-gray-500">размер</div>
          </div>
          <div>
            <div className="text-sm font-medium">
              {files.oldestFile ? new Date(files.oldestFile).toLocaleDateString("ru") : "-"}
            </div>
            <div className="text-sm text-gray-500">самый старый</div>
          </div>
          <div>
            <div className="text-sm font-medium">
              {files.newestFile ? new Date(files.newestFile).toLocaleDateString("ru") : "-"}
            </div>
            <div className="text-sm text-gray-500">самый новый</div>
          </div>
        </div>

        {/* Разбивка по типам */}
        {Object.keys(files.byType).length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">По типам:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(files.byType)
                .sort((a, b) => b[1].size - a[1].size)
                .map(([ext, data]) => (
                  <span
                    key={ext}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                  >
                    {ext}: {data.count} ({formatSize(data.size)})
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Статистика БД */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">База данных</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">{database.totalMessages}</div>
            <div className="text-sm text-gray-500">всего сообщений</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{database.messagesWithMedia}</div>
            <div className="text-sm text-gray-500">с медиа</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{database.mediaDownloaded}</div>
            <div className="text-sm text-gray-500">скачано</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{database.mediaPending}</div>
            <div className="text-sm text-gray-500">ожидает скачивания</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{database.requestOfferWithMedia}</div>
            <div className="text-sm text-gray-500">REQUEST/OFFER с медиа</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">{database.otherWithMedia}</div>
            <div className="text-sm text-gray-500">OTHER с медиа</div>
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Очистка хранилища</h2>

        {deleteResult && (
          <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
            {deleteResult}
          </div>
        )}

        <div className="space-y-4">
          {/* Удаление старых файлов */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Удалить файлы старше</span>
              <input
                type="number"
                value={olderThanDays}
                onChange={(e) => setOlderThanDays(parseInt(e.target.value) || 30)}
                className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                min="1"
              />
              <span>дней</span>
            </div>
            <button
              onClick={() => handleDelete(`olderThan=${olderThanDays}`)}
              disabled={deleting}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {deleting ? "Удаление..." : "Удалить старые"}
            </button>
          </div>

          {/* Удаление файлов для OTHER */}
          <div className="flex items-center gap-4">
            <span>Удалить файлы для сообщений OTHER (не request/offer)</span>
            <button
              onClick={() => handleDelete("rejected=true")}
              disabled={deleting}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {deleting ? "Удаление..." : "Удалить OTHER"}
            </button>
          </div>

          {/* Удаление всех файлов */}
          <div className="flex items-center gap-4 pt-4 border-t dark:border-gray-700">
            <span className="text-red-500 font-medium">Удалить ВСЕ файлы</span>
            <button
              onClick={() => handleDelete("all=true")}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? "Удаление..." : "Удалить ВСЕ"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Путь к хранилищу: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{stats.uploadsDir}</code></p>
          <p className="mt-2">
            После удаления файлы можно повторно скачать при классификации
            (если сообщение типа REQUEST/OFFER и ещё не скачано).
          </p>
        </div>
      </div>
    </div>
  );
}

// Вспомогательная функция форматирования размера
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
