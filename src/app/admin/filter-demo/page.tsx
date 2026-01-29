'use client'

import { useState } from 'react'

// Моковые данные
const categories = [
  { id: '1', name: 'Металлопрокат', subcategories: ['Арматура', 'Труба', 'Лист', 'Швеллер', 'Уголок'] },
  { id: '2', name: 'Металлоконструкции', subcategories: ['Балки', 'Фермы', 'Колонны', 'Лестницы'] },
  { id: '3', name: 'Металлообработка', subcategories: ['Резка', 'Гибка', 'Сварка', 'Покраска'] },
  { id: '4', name: 'Стройматериалы', subcategories: ['Цемент', 'Кирпич', 'Блоки', 'Песок', 'Щебень'] },
]

const statuses = ['Все', 'На модерации', 'Одобрены', 'Отклонены']
const types = ['Все', 'Заявки', 'Предложения']

export default function FilterDemoPage() {
  const [activeVariant, setActiveVariant] = useState(1)

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Демо фильтров для админки
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Выберите вариант фильтрации который вам больше подходит
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => setActiveVariant(num)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeVariant === num
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : ''
              }`}
              style={activeVariant !== num ? {
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              } : undefined}
            >
              Вариант {num}
            </button>
          ))}
        </div>

        {/* Filter Variants */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          {activeVariant === 1 && <Variant1 />}
          {activeVariant === 2 && <Variant2 />}
          {activeVariant === 3 && <Variant3 />}
          {activeVariant === 4 && <Variant4 />}
          {activeVariant === 5 && <Variant5 />}
        </div>

        {/* Description */}
        <VariantDescription variant={activeVariant} />
      </div>
    </div>
  )
}

// Вариант 1: 3-уровневые каскадные фильтры
function Variant1() {
  const [type, setType] = useState('Все')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [status, setStatus] = useState('Все')

  const selectedCategory = categories.find(c => c.id === category)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Вариант 1: Каскадные 3-уровневые фильтры
      </h3>

      {/* Уровень 1: Тип */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Уровень 1: Тип объявления
        </label>
        <div className="flex gap-2">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                type === t ? 'bg-blue-500 text-white' : ''
              }`}
              style={type !== t ? {
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              } : undefined}
            >
              {t}
              {t === 'Заявки' && <span className="ml-2 text-xs opacity-70">16</span>}
              {t === 'Предложения' && <span className="ml-2 text-xs opacity-70">13</span>}
              {t === 'Все' && <span className="ml-2 text-xs opacity-70">29</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Уровень 2: Категория */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Уровень 2: Категория
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setCategory(''); setSubcategory('') }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !category ? 'bg-purple-500 text-white' : ''
            }`}
            style={category ? {
              background: 'var(--input-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)'
            } : undefined}
          >
            Все категории
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setSubcategory('') }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                category === cat.id ? 'bg-purple-500 text-white' : ''
              }`}
              style={category !== cat.id ? {
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              } : undefined}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Уровень 3: Подкатегория (появляется после выбора категории) */}
      {selectedCategory && (
        <div className="animate-in slide-in-from-top-2">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Уровень 3: Подкатегория ({selectedCategory.name})
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSubcategory('')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                !subcategory ? 'bg-green-500 text-white' : ''
              }`}
              style={subcategory ? {
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              } : undefined}
            >
              Все
            </button>
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubcategory(sub)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  subcategory === sub ? 'bg-green-500 text-white' : ''
                }`}
                style={subcategory !== sub ? {
                  background: 'var(--input-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-secondary)'
                } : undefined}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Статус модерации */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Статус модерации
        </label>
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                status === s ? 'bg-gray-700 text-white' : ''
              }`}
              style={status !== s ? {
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              } : undefined}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Активные фильтры */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Активные фильтры: </span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {type} → {category ? categories.find(c => c.id === category)?.name : 'Все категории'}
          {subcategory && ` → ${subcategory}`} → {status}
        </span>
      </div>
    </div>
  )
}

// Вариант 2: Фасетный фильтр (боковая панель)
function Variant2() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  const toggleCategory = (c: string) => {
    setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const toggleStatus = (s: string) => {
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Вариант 2: Фасетный фильтр с чекбоксами
      </h3>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-6">
          {/* Тип */}
          <div>
            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Тип</h4>
            <div className="space-y-2">
              {['Заявки', 'Предложения'].map((t) => (
                <label key={t} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="w-4 h-4 rounded text-blue-500"
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{t}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                    {t === 'Заявки' ? 16 : 13}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Категория */}
          <div>
            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Категория</h4>
            <div className="space-y-2">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="w-4 h-4 rounded text-purple-500"
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Статус */}
          <div>
            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Статус</h4>
            <div className="space-y-2">
              {['На модерации', 'Одобрены', 'Отклонены'].map((s) => (
                <label key={s} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="w-4 h-4 rounded text-green-500"
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => { setSelectedTypes([]); setSelectedCategories([]); setSelectedStatuses([]) }}
            className="text-sm text-blue-500 hover:underline"
          >
            Сбросить все фильтры
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Здесь будут карточки...</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Выбрано: {selectedTypes.length > 0 ? selectedTypes.join(', ') : 'все типы'} |
            {selectedCategories.length > 0 ? ` ${selectedCategories.length} категорий` : ' все категории'} |
            {selectedStatuses.length > 0 ? ` ${selectedStatuses.join(', ')}` : ' все статусы'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Вариант 3: Умный поиск + теги
function Variant3() {
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>(['Заявки', 'Металлопрокат'])

  const popularTags = ['Арматура 12мм', 'Труба профильная', 'Цемент М500', 'На модерации', 'Срочно']

  const removeTag = (tag: string) => {
    setActiveTags(prev => prev.filter(t => t !== tag))
  }

  const addTag = (tag: string) => {
    if (!activeTags.includes(tag)) {
      setActiveTags(prev => [...prev, tag])
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Вариант 3: Умный поиск + теги
      </h3>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Введите запрос: арматура 12мм А500С Москва..."
          className="w-full px-4 py-4 pl-12 rounded-2xl text-lg"
          style={{
            background: 'var(--input-bg)',
            border: '2px solid var(--card-border)',
            color: 'var(--text-primary)'
          }}
        />
        <svg className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl">
          Найти
        </button>
      </div>

      {/* Active Tags */}
      {activeTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Активные фильтры:</span>
          {activeTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-600 rounded-lg text-sm"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-blue-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={() => setActiveTags([])}
            className="text-sm hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Сбросить все
          </button>
        </div>
      )}

      {/* Popular Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Популярные:</span>
        {popularTags.map((tag) => (
          <button
            key={tag}
            onClick={() => addTag(tag)}
            className="px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-105"
            style={{
              background: activeTags.includes(tag) ? 'var(--accent)' : 'var(--input-bg)',
              color: activeTags.includes(tag) ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--card-border)'
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* AI hint */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          💡 <strong>AI подсказка:</strong> Вводите запросы естественным языком. Например:
          "заявки на арматуру за последнюю неделю" или "одобренные предложения металлопроката"
        </p>
      </div>
    </div>
  )
}

// Вариант 4: Kanban доска
function Variant4() {
  const columns = [
    { id: 'pending', title: 'На модерации', color: 'yellow', count: 8 },
    { id: 'approved', title: 'Одобрены', color: 'green', count: 15 },
    { id: 'rejected', title: 'Отклонены', color: 'red', count: 6 },
  ]

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Вариант 4: Kanban доска по статусам
      </h3>

      {/* Quick filters */}
      <div className="flex gap-4 mb-6">
        <select
          className="px-4 py-2 rounded-xl"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        >
          <option>Все типы</option>
          <option>Заявки</option>
          <option>Предложения</option>
        </select>
        <select
          className="px-4 py-2 rounded-xl"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        >
          <option>Все категории</option>
          {categories.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Поиск..."
          className="px-4 py-2 rounded-xl flex-1"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-3 h-3 rounded-full ${
                col.color === 'yellow' ? 'bg-yellow-500' :
                col.color === 'green' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{col.title}</h4>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                {col.count}
              </span>
            </div>
            {/* Sample cards */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg mb-2 cursor-pointer hover:scale-[1.02] transition-transform"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Арматура А500С {i}2мм
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Металлопрокат • Заявка
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
        💡 Перетаскивайте карточки между колонками для изменения статуса
      </p>
    </div>
  )
}

// Вариант 5: Компактный комбинированный
function Variant5() {
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [status, setStatus] = useState('all')
  const [view, setView] = useState<'cards' | 'list' | 'table'>('cards')

  const selectedCat = categories.find(c => c.id === category)

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Вариант 5: Компактная панель фильтров
      </h3>

      {/* All filters in one row */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
        {/* Type */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-4 py-2.5 rounded-xl font-medium"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        >
          <option value="all">Все типы (29)</option>
          <option value="requests">Заявки (16)</option>
          <option value="offers">Предложения (13)</option>
        </select>

        <span style={{ color: 'var(--text-secondary)' }}>→</span>

        {/* Category */}
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setSubcategory('') }}
          className="px-4 py-2.5 rounded-xl font-medium"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        >
          <option value="">Все категории</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Subcategory - appears when category selected */}
        {selectedCat && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>→</span>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl font-medium"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
            >
              <option value="">Все {selectedCat.name.toLowerCase()}</option>
              {selectedCat.subcategories.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        <span style={{ color: 'var(--text-secondary)' }}>→</span>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl font-medium"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        >
          <option value="all">Все статусы</option>
          <option value="pending">На модерации</option>
          <option value="approved">Одобрены</option>
          <option value="rejected">Отклонены</option>
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <button
            onClick={() => setView('cards')}
            className={`p-2 rounded ${view === 'cards' ? 'bg-blue-500 text-white' : ''}`}
            style={view !== 'cards' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded ${view === 'list' ? 'bg-blue-500 text-white' : ''}`}
            style={view !== 'list' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-2 rounded ${view === 'table' ? 'bg-blue-500 text-white' : ''}`}
            style={view !== 'table' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-4 mt-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>На модерации: 8</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Одобрено: 15</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Отклонено: 6</span>
        </div>
      </div>

      {/* Content placeholder */}
      <div className="mt-4 p-8 rounded-xl text-center" style={{ background: 'var(--input-bg)', border: '1px dashed var(--card-border)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Отображение: {view === 'cards' ? 'Карточки' : view === 'list' ? 'Список' : 'Таблица'}
        </p>
      </div>
    </div>
  )
}

// Description component
function VariantDescription({ variant }: { variant: number }) {
  const descriptions: Record<number, { title: string; pros: string[]; cons: string[]; best: string }> = {
    1: {
      title: 'Каскадные 3-уровневые фильтры',
      pros: ['Чёткая иерархия', 'Понятная логика', 'Подкатегории появляются только когда нужны'],
      cons: ['Много кликов для глубокой фильтрации', 'Занимает много места'],
      best: 'Когда структура категорий чёткая и пользователи часто фильтруют по подкатегориям'
    },
    2: {
      title: 'Фасетный фильтр с чекбоксами',
      pros: ['Можно выбрать несколько значений', 'Видно все опции сразу', 'Привычный паттерн (Avito, Wildberries)'],
      cons: ['Нужна боковая панель', 'На мобильных менее удобно'],
      best: 'Когда нужна гибкая фильтрация с множественным выбором'
    },
    3: {
      title: 'Умный поиск + теги',
      pros: ['Минимум кликов', 'Естественный язык', 'Можно использовать AI для парсинга'],
      cons: ['Требует обучения пользователей', 'Сложнее в реализации'],
      best: 'Для B2B где пользователи знают что ищут и ценят скорость'
    },
    4: {
      title: 'Kanban доска по статусам',
      pros: ['Визуально понятно состояние', 'Drag & drop для модерации', 'Сразу видны очереди'],
      cons: ['Меньше места для карточек', 'Не подходит для поиска'],
      best: 'Для ежедневной модерации и workflow'
    },
    5: {
      title: 'Компактная панель фильтров',
      pros: ['Всё в одну строку', 'Экономит место', 'Быстрый доступ к статистике'],
      cons: ['Сложно если много подкатегорий', 'Dropdowns могут быть длинными'],
      best: 'Для админки когда нужен баланс между функциональностью и компактностью'
    }
  }

  const desc = descriptions[variant]

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {desc.title}
      </h3>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium text-green-600 mb-2">✓ Плюсы</h4>
          <ul className="space-y-1">
            {desc.pros.map((p, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-red-500 mb-2">✗ Минусы</h4>
          <ul className="space-y-1">
            {desc.cons.map((c, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {c}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-blue-500 mb-2">★ Лучше всего для</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc.best}</p>
        </div>
      </div>
    </div>
  )
}
