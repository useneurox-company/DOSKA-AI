"use client";

import { useState, useEffect, useCallback } from "react";
import AdminNav from "../../components/AdminNav";

interface EnrichmentCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryPrompt: string;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    rawMessages: number;
    jobs: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  slug: string;
  name: string;
  description: string;
  categoryPrompt: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyFormData: CategoryFormData = {
  slug: "",
  name: "",
  description: "",
  categoryPrompt: "",
  isActive: true,
  sortOrder: 0,
};

export default function EnrichmentCategoriesPage() {
  const [categories, setCategories] = useState<EnrichmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/enrichment/categories");
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки категорий");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (category: EnrichmentCategory) => {
    setEditingId(category.id);
    setFormData({
      slug: category.slug,
      name: category.name,
      description: category.description || "",
      categoryPrompt: category.categoryPrompt,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingId
        ? `/api/enrichment/categories/${editingId}`
        : "/api/enrichment/categories";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка сохранения");
      }

      closeModal();
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/enrichment/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка удаления");
      }

      setDeleteConfirmId(null);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const toggleActive = async (category: EnrichmentCategory) => {
    try {
      const res = await fetch(`/api/enrichment/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (!res.ok) throw new Error("Ошибка обновления");
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <AdminNav />

        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Категории обогащения
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Управление категориями и промптами для обогащения карточек
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              + Добавить категорию
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Загрузка категорий...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">Нет категорий</p>
              <p className="text-sm mt-1">Создайте первую категорию для обогащения</p>
            </div>
          ) : (
            /* Categories table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Карточек
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заданий
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {category.name}
                        </div>
                        {category.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {category.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {category.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {category._count?.rawMessages || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-500">
                          {category._count?.jobs || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleActive(category)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            category.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {category.isActive ? "Активна" : "Неактивна"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(category)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Редактировать
                          </button>
                          {deleteConfirmId === category.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Да
                              </button>
                              <span className="text-gray-500">/</span>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(category.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                              disabled={(category._count?.rawMessages || 0) > 0}
                              title={
                                (category._count?.rawMessages || 0) > 0
                                  ? "Нельзя удалить категорию с карточками"
                                  : "Удалить категорию"
                              }
                            >
                              Удалить
                            </button>
                          )}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? "Редактировать категорию" : "Новая категория"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Металлопрокат"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="metal"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Трубы, арматура, швеллер, балки..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Промпт для категории *
                </label>
                <textarea
                  value={formData.categoryPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryPrompt: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  rows={12}
                  placeholder="## КАТЕГОРИЯ: МЕТАЛЛОПРОКАТ&#10;&#10;### Специфичные подкатегории:&#10;- Трубы профильные&#10;- Арматура&#10;..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Этот промпт добавляется к базовому промпту при обогащении
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Порядок сортировки
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Активна</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={saving}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Сохранение..." : editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
