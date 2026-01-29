"use client";

import { useState, useMemo } from "react";

export interface CRMFilterState {
  types: string[];
  categories: string[];
  subcategories: string[];
}

interface MatchCard {
  categorySlug?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryId?: string;
}

interface Match {
  id: string;
  request: MatchCard;
  offer: MatchCard;
}

interface CRMFilterProps {
  filters: CRMFilterState;
  onFilterChange: (filters: CRMFilterState) => void;
  matches: Match[];
}

export default function CRMFilter({
  filters,
  onFilterChange,
  matches,
}: CRMFilterProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    subcategories: true,
  });

  // Извлекаем уникальные категории и подкатегории из матчей
  // Считаем количество МАТЧЕЙ (не вхождений)
  const { categories, subcategories } = useMemo(() => {
    const catMap = new Map<string, { name: string; matchIds: Set<string> }>();
    const subMap = new Map<string, { name: string; categorySlug: string; matchIds: Set<string> }>();

    matches.forEach((match) => {
      // Обрабатываем request
      if (match.request.categorySlug) {
        const slug = match.request.categorySlug;
        const name = match.request.categoryName || slug;
        if (!catMap.has(slug)) {
          catMap.set(slug, { name, matchIds: new Set() });
        }
        catMap.get(slug)!.matchIds.add(match.id);
      }
      if (match.request.subcategoryId && match.request.subcategory) {
        const id = match.request.subcategoryId;
        if (!subMap.has(id)) {
          subMap.set(id, {
            name: match.request.subcategory,
            categorySlug: match.request.categorySlug || "",
            matchIds: new Set(),
          });
        }
        subMap.get(id)!.matchIds.add(match.id);
      }

      // Обрабатываем offer
      if (match.offer.categorySlug) {
        const slug = match.offer.categorySlug;
        const name = match.offer.categoryName || slug;
        if (!catMap.has(slug)) {
          catMap.set(slug, { name, matchIds: new Set() });
        }
        catMap.get(slug)!.matchIds.add(match.id);
      }
      if (match.offer.subcategoryId && match.offer.subcategory) {
        const id = match.offer.subcategoryId;
        if (!subMap.has(id)) {
          subMap.set(id, {
            name: match.offer.subcategory,
            categorySlug: match.offer.categorySlug || "",
            matchIds: new Set(),
          });
        }
        subMap.get(id)!.matchIds.add(match.id);
      }
    });

    return {
      categories: Array.from(catMap.entries())
        .map(([slug, { name, matchIds }]) => ({ slug, name, count: matchIds.size }))
        .sort((a, b) => b.count - a.count),
      subcategories: Array.from(subMap.entries())
        .map(([id, { name, categorySlug, matchIds }]) => ({ id, name, categorySlug, count: matchIds.size }))
        .sort((a, b) => b.count - a.count),
    };
  }, [matches]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFilter = (key: keyof CRMFilterState, value: string) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    // Если меняем категорию - сбросить несовместимые подкатегории
    if (key === "categories") {
      const newCategories = updated;
      if (newCategories.length > 0) {
        const validSubcats = filters.subcategories.filter((subId) => {
          const sub = subcategories.find((s) => s.id === subId);
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
    });
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.subcategories.length > 0;

  // Фильтруем подкатегории по выбранным категориям
  const visibleSubcategories = useMemo(() => {
    if (filters.categories.length === 0) return subcategories;
    return subcategories.filter((sub) => filters.categories.includes(sub.categorySlug));
  }, [subcategories, filters.categories]);

  if (categories.length === 0) {
    return (
      <div className="w-64 bg-white rounded-lg shadow p-4 text-gray-500 text-sm flex-shrink-0">
        Нет данных для фильтрации
      </div>
    );
  }

  return (
    <div className="w-64 bg-white rounded-lg shadow overflow-hidden flex-shrink-0">
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
        </div>
      </div>

      <div className="p-3 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
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
              {categories.map(({ slug, name, count }) => (
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
                  <span className="truncate text-gray-800">{name}</span>
                  <span className="text-gray-500 ml-auto text-xs">({count})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Подкатегории */}
        {visibleSubcategories.length > 0 && (
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
                {visibleSubcategories.map(({ id, name, count }) => (
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
                    <span className="truncate text-gray-800" title={name}>{name}</span>
                    <span className="text-gray-500 ml-auto text-xs">({count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
        Матчей: <span className="font-medium">{matches.length}</span>
      </div>
    </div>
  );
}
