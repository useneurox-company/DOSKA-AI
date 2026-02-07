'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

interface City {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

interface FiltersProps {
  cities: City[]
  categories: Category[]
}

export default function Filters({ cities, categories }: FiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [source, setSource] = useState(searchParams.get('source') || 'all')
  const [cityId, setCityId] = useState(searchParams.get('city') || '')
  const [priceFrom, setPriceFrom] = useState(searchParams.get('priceFrom') || '')
  const [priceTo, setPriceTo] = useState(searchParams.get('priceTo') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [suggestions, setSuggestions] = useState<{id: string, title: string, price: number | null, category: {name: string} | null}[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) || []
  )

  // Fetch suggestions with debounce
  const fetchSuggestions = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ads/suggestions?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    fetchSuggestions(value)
  }

  const selectSuggestion = (title: string) => {
    setSearch(title)
    setShowSuggestions(false)
    const params = new URLSearchParams()
    params.set('search', title)
    if (source !== 'all') params.set('source', source)
    if (cityId) params.set('city', cityId)
    if (priceFrom) params.set('priceFrom', priceFrom)
    if (priceTo) params.set('priceTo', priceTo)
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','))
    router.push(`/?${params.toString()}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (source !== 'all') params.set('source', source)
    if (cityId) params.set('city', cityId)
    if (priceFrom) params.set('priceFrom', priceFrom)
    if (priceTo) params.set('priceTo', priceTo)
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','))
    router.push(`/?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setSource('all')
    setCityId('')
    setPriceFrom('')
    setPriceTo('')
    setSelectedCategories([])
    router.push('/')
  }

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.id))
  }

  const clearCategories = () => {
    setSelectedCategories([])
  }

  const hasActiveFilters = search || source !== 'all' || cityId || priceFrom || priceTo || selectedCategories.length > 0

  return (
    <section style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--card-border)' }}>
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Main Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-3">
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-secondary)'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="font-medium hidden sm:inline">Категории</span>
                {selectedCategories.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {selectedCategories.length}
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCategories && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCategories(false)} />
                  <div
                    className="absolute top-full left-0 mt-2 w-64 rounded-2xl shadow-xl z-50 overflow-hidden"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                  >
                    <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <button
                        type="button"
                        onClick={selectAllCategories}
                        className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        Выбрать все
                      </button>
                      {selectedCategories.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCategories}
                          className="text-sm transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {categories.length > 0 ? (
                        categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat.id)}
                              onChange={() => toggleCategory(cat.id)}
                              className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500/20"
                              style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>Категории не найдены</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Search Input with Suggestions */}
            <div className="flex-1 relative" ref={suggestionsRef}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Поиск объявлений..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)'
                }}
              />
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectSuggestion(item.title)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-500/10 transition-colors"
                      style={{ borderBottom: '1px solid var(--card-border)' }}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.category && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.category.name}</span>
                          )}
                          {item.price && (
                            <span className="text-xs font-medium text-blue-500">
                              {item.price.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Estimate Button */}
            <button
              type="button"
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25"
              title="Загрузить смету"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-500'
                  : ''
              }`}
              style={!showFilters && !hasActiveFilters ? {
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              } : { border: '1px solid var(--accent)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-medium hidden sm:inline">Фильтры</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>

            {/* Search Button */}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-medium hover:from-blue-400 hover:to-purple-400 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25"
            >
              <span className="hidden sm:inline">Найти</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Expanded Filters */}
        {showFilters && (
          <div
            className="mt-4 p-5 rounded-2xl animate-in slide-in-from-top-2 duration-200"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Source */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Источник
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="all">Все источники</option>
                  <option value="telegram">Telegram</option>
                  <option value="user">Проверенные</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Город
                </label>
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">Все города</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price From */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Цена от
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>₽</span>
                </div>
              </div>

              {/* Price To */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Цена до
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Любая"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>₽</span>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Сбросить фильтры
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-xl hover:from-blue-400 hover:to-purple-400 transition-all"
              >
                Применить
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {hasActiveFilters && !showFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {selectedCategories.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-600 text-sm rounded-lg border border-purple-500/30">
                Категории: {selectedCategories.length}
                <button onClick={clearCategories} className="hover:text-purple-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-600 text-sm rounded-lg border border-blue-500/30">
                Поиск: {search}
                <button onClick={() => { setSearch(''); applyFilters() }} className="hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {source !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-600 text-sm rounded-lg border border-blue-500/30">
                {source === 'telegram' ? 'Telegram' : 'Проверенные'}
                <button onClick={() => { setSource('all'); applyFilters() }} className="hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {cityId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-600 text-sm rounded-lg border border-blue-500/30">
                {cities.find(c => c.id === cityId)?.name}
                <button onClick={() => { setCityId(''); applyFilters() }} className="hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Сбросить все
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
