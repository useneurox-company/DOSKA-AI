"use client";

import { useState, useEffect } from "react";

interface EnrichmentCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: {
    rawMessages: number;
    jobs: number;
    pending: number;  // Ожидают обогащения (по aiProductCategory)
  };
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function CategorySelector({ selectedIds, onChange, disabled }: Props) {
  const [categories, setCategories] = useState<EnrichmentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/enrichment/categories?active=true")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const toggleCategory = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    if (selectedIds.length === categories.length) {
      onChange([]);
    } else {
      onChange(categories.map((c) => c.id));
    }
  };

  if (loading) {
    return (
      <div className="text-gray-500 text-sm py-2">Загрузка категорий...</div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-yellow-600 text-sm p-3 bg-yellow-50 rounded-lg">
        Нет доступных категорий. Создайте категорию в настройках.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Категории:</span>
        <button onClick={selectAll} disabled={disabled}
          className="text-xs text-blue-500 hover:underline disabled:opacity-50">
          {selectedIds.length === categories.length ? "Снять" : "Все"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <label key={category.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-xs transition-colors
              ${selectedIds.includes(category.id) ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:border-gray-300"}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input type="checkbox" checked={selectedIds.includes(category.id)} onChange={() => toggleCategory(category.id)}
              disabled={disabled} className="w-3 h-3 rounded border-gray-300 text-blue-600" />
            <span className="font-medium text-gray-800">{category.name}</span>
            <span className="text-gray-500">{category._count.pending}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
