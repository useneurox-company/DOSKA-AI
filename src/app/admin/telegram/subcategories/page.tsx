"use client";

import { useState, useEffect, useCallback } from "react";
import AdminNav from "../../components/AdminNav";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  normalized: string;
  usageCount: number;
  isActive: boolean;
  categoryId: string;
  category: Category;
  mergedFrom: { id: string; name: string; normalized: string }[];
}

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") {
        params.set("categoryId", filterCategory);
      }
      if (showInactive) {
        params.set("includeInactive", "true");
      }

      const res = await fetch(`/api/admin/subcategories?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Ошибка загрузки");
      }

      const data = await res.json();
      setSubcategories(data.subcategories || []);
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, showInactive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    setProcessing(id);
    try {
      const res = await fetch("/api/admin/subcategories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "rename", newName }),
      });

      if (!res.ok) {
        throw new Error("Ошибка переименования");
      }

      setEditingId(null);
      setEditName("");
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setProcessing(null);
    }
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      alert("Нельзя объединить подкатегорию саму с собой");
      return;
    }

    const source = subcategories.find((s) => s.id === sourceId);
    const target = subcategories.find((s) => s.id === targetId);

    if (!source || !target) return;

    if (!confirm(`Объединить "${source.name}" → "${target.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    setProcessing(sourceId);
    try {
      const res = await fetch("/api/admin/subcategories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceId, action: "merge", mergeIntoId: targetId }),
      });

      if (!res.ok) {
        throw new Error("Ошибка объединения");
      }

      setMergeSourceId(null);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/subcategories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: currentActive ? "hide" : "restore" }),
      });

      if (!res.ok) {
        throw new Error("Ошибка");
      }

      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setProcessing(null);
    }
  };

  const startEdit = (sub: Subcategory) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setMergeSourceId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const startMerge = (id: string) => {
    setMergeSourceId(id);
    setEditingId(null);
  };

  const cancelMerge = () => {
    setMergeSourceId(null);
  };

  // Группируем по категориям для отображения
  const groupedSubcategories = subcategories.reduce((acc, sub) => {
    const catName = sub.category.name;
    if (!acc[catName]) {
      acc[catName] = [];
    }
    acc[catName].push(sub);
    return acc;
  }, {} as Record<string, Subcategory[]>);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <AdminNav />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Управление подкатегориями
          </h1>
          <div className="text-sm text-gray-500">
            Всего: {subcategories.length}
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Категория:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="all">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600">Показать скрытые</span>
          </label>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="ml-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            {loading ? "⏳" : "🔄 Обновить"}
          </button>
        </div>

        {/* Инструкция */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <strong>Как использовать:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Переименовать</strong> — исправить название (например, "Балка дзутавр" → "Балка")</li>
            <li><strong>Объединить</strong> — слить дубликаты (все карточки перейдут в целевую подкатегорию)</li>
            <li><strong>Скрыть</strong> — убрать из фильтров (данные сохраняются)</li>
          </ul>
        </div>

        {/* Контент */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-pulse">Загрузка...</div>
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
        ) : subcategories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Нет подкатегорий. Запустите обогащение для создания подкатегорий.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSubcategories).map(([catName, subs]) => (
              <div key={catName} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-medium text-gray-700">
                  {catName}
                  <span className="text-gray-400 ml-2">({subs.length})</span>
                </div>
                <div className="divide-y">
                  {subs.map((sub) => (
                    <div
                      key={sub.id}
                      className={`px-4 py-3 flex items-center gap-4 ${
                        !sub.isActive ? "bg-gray-50 opacity-60" : ""
                      } ${mergeSourceId && mergeSourceId !== sub.id ? "cursor-pointer hover:bg-blue-50" : ""}`}
                      onClick={() => {
                        if (mergeSourceId && mergeSourceId !== sub.id) {
                          handleMerge(mergeSourceId, sub.id);
                        }
                      }}
                    >
                      {/* Название или редактирование */}
                      <div className="flex-1 min-w-0">
                        {editingId === sub.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 border rounded text-sm w-48"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(sub.id, editName);
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <button
                              onClick={() => handleRename(sub.id, editName)}
                              disabled={processing === sub.id}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium">{sub.name}</span>
                            {sub.mergedFrom.length > 0 && (
                              <span className="ml-2 text-xs text-gray-400">
                                (+ {sub.mergedFrom.map((m) => m.name).join(", ")})
                              </span>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              normalized: {sub.normalized}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Счётчик */}
                      <div className="text-sm text-gray-500">
                        {sub.usageCount} карточек
                      </div>

                      {/* Статус */}
                      {!sub.isActive && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                          Скрыта
                        </span>
                      )}

                      {/* Режим объединения */}
                      {mergeSourceId === sub.id && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600">← Выберите целевую подкатегорию</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelMerge();
                            }}
                            className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                          >
                            Отмена
                          </button>
                        </div>
                      )}

                      {/* Действия */}
                      {!mergeSourceId && editingId !== sub.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(sub);
                            }}
                            disabled={processing === sub.id}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                            title="Переименовать"
                          >
                            Переименовать
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startMerge(sub.id);
                            }}
                            disabled={processing === sub.id}
                            className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded disabled:opacity-50"
                            title="Объединить с другой"
                          >
                            Объединить
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(sub.id, sub.isActive);
                            }}
                            disabled={processing === sub.id}
                            className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${
                              sub.isActive
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={sub.isActive ? "Скрыть" : "Восстановить"}
                          >
                            {sub.isActive ? "Скрыть" : "Восстановить"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
