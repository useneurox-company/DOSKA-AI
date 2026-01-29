"use client";

import { useState, useEffect, useCallback } from "react";

interface FilterCounts {
  total: number;
  types: { REQUEST: number; OFFER: number };
  categories: Record<string, { name: string; count: number }>;
  subcategories: Record<string, { name: string; categoryId: string; categorySlug: string; count: number }>;
  moderation: { pending: number; approved: number; rejected: number };
}

export interface FilterState {
  types: string[];
  categories: string[];
  subcategories: string[];
  moderation: string[];
}

interface FacetedFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh?: () => void;
}

export default function FacetedFilter({
  filters,
  onFilterChange,
  onRefresh,
}: FacetedFilterProps) {
  const [counts, setCounts] = useState<FilterCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    types: true,
    categories: true,
    subcategories: true,
    moderation: true,
  });

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/filter-counts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCounts(data);
      }
    } catch (error) {
      console.error("Error fetching filter counts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFilter = (
    key: keyof FilterState,
    value: string
  ) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    // Если меняем категорию - сбросить несовместимые подкатегории
    if (key === "categories" && counts) {
      const newCategories = updated;
      if (newCategories.length > 0) {
        // Оставляем только подкатегории выбранных категорий
        const validSubcats = filters.subcategories.filter(subId => {
          const sub = counts.subcategories[subId];
          return sub && newCategories.includes(sub.categorySlug);
        });
        onFilterChange({ ...filters, categories: newCategories, subcategories: validSubcats });
        return;
      }
    }

    onFilterChange({ ...filters, [key]: updated });
  };

  const clearFilters = () => {
    onFilterChange({
      types: [],
      categories: [],
      subcategories: [],
      moderation: [],
    });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.categories.length > 0 ||
    filters.subcategories.length > 0 ||
    filters.moderation.length > 0;

  // Фильтруем подкатегории по выбранным категориям
  const getVisibleSubcategories = () => {
    if (!counts) return {};
    if (filters.categories.length === 0) return counts.subcategories;

    // Показываем только подкатегории выбранных категорий
    const result: typeof counts.subcategories = {};
    for (const [id, sub] of Object.entries(counts.subcategories)) {
      if (filters.categories.includes(sub.categorySlug)) {
        result[id] = sub;
      }
    }
    return result;
  };

  if (loading) {
    return (
      <div className="w-64 bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!counts) {
    return (
      <div className="w-64 bg-white rounded-lg shadow p-4 text-gray-500 text-sm">
        Не удалось загрузить фильтры
      </div>
    );
  }

  const visibleSubcategories = getVisibleSubcategories();

  return (
    <div className="w-64 bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <span className="font-medium text-gray-800">Фильтры</span>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Сбросить
            </button>
          )}
          <button
            onClick={() => { fetchCounts(); onRefresh?.(); }}
            className="text-gray-500 hover:text-gray-700"
            title="Обновить"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Тип */}
        <div>
          <button
            onClick={() => toggleSection("types")}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
          >
            <span>Тип</span>
            <span className="text-gray-400">{expandedSections.types ? "−" : "+"}</span>
          </button>
          {expandedSections.types && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.types.includes("REQUEST")}
                  onChange={() => toggleFilter("types", "REQUEST")}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-blue-600">Заявки</span>
                <span className="text-gray-400 ml-auto">({counts.types.REQUEST})</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.types.includes("OFFER")}
                  onChange={() => toggleFilter("types", "OFFER")}
                  className="rounded text-green-500 focus:ring-green-500"
                />
                <span className="text-green-600">Предложения</span>
                <span className="text-gray-400 ml-auto">({counts.types.OFFER})</span>
              </label>
            </div>
          )}
        </div>

        {/* Категории */}
        <div>
          <button
            onClick={() => toggleSection("categories")}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
          >
            <span>Категория</span>
            <span className="text-gray-400">{expandedSections.categories ? "−" : "+"}</span>
          </button>
          {expandedSections.categories && (
            <div className="space-y-1">
              {Object.entries(counts.categories).map(([slug, { name, count }]) => (
                <label
                  key={slug}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(slug)}
                    onChange={() => toggleFilter("categories", slug)}
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span className="truncate text-gray-700">{name}</span>
                  <span className="text-gray-400 ml-auto">({count})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Подкатегории */}
        {Object.keys(visibleSubcategories).length > 0 && (
          <div>
            <button
              onClick={() => toggleSection("subcategories")}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
            >
              <span>Подкатегория</span>
              <span className="text-gray-400">{expandedSections.subcategories ? "−" : "+"}</span>
            </button>
            {expandedSections.subcategories && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(visibleSubcategories)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([id, { name, count }]) => (
                    <label
                      key={id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.subcategories.includes(id)}
                        onChange={() => toggleFilter("subcategories", id)}
                        className="rounded text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="truncate text-gray-700" title={name}>{name}</span>
                      <span className="text-gray-400 ml-auto">({count})</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Модерация */}
        <div>
          <button
            onClick={() => toggleSection("moderation")}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
          >
            <span>Статус</span>
            <span className="text-gray-400">{expandedSections.moderation ? "−" : "+"}</span>
          </button>
          {expandedSections.moderation && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.moderation.includes("pending")}
                  onChange={() => toggleFilter("moderation", "pending")}
                  className="rounded text-yellow-500 focus:ring-yellow-500"
                />
                <span className="text-yellow-600">На модерации</span>
                <span className="text-gray-400 ml-auto">({counts.moderation.pending})</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.moderation.includes("approved")}
                  onChange={() => toggleFilter("moderation", "approved")}
                  className="rounded text-green-500 focus:ring-green-500"
                />
                <span className="text-green-600">Одобрены</span>
                <span className="text-gray-400 ml-auto">({counts.moderation.approved})</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.moderation.includes("rejected")}
                  onChange={() => toggleFilter("moderation", "rejected")}
                  className="rounded text-red-500 focus:ring-red-500"
                />
                <span className="text-red-600">Отклонены</span>
                <span className="text-gray-400 ml-auto">({counts.moderation.rejected})</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Footer with total */}
      <div className="px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
        Всего: <span className="font-medium">{counts.total}</span> карточек
      </div>
    </div>
  );
}
