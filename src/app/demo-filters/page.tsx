'use client'

import { useState } from 'react'

const categories = [
  { id: '1', name: 'Металлопрокат' },
  { id: '2', name: 'Кирпич' },
  { id: '3', name: 'Бетон и ЖБИ' },
  { id: '4', name: 'Пиломатериалы' },
  { id: '5', name: 'Утеплители' },
  { id: '6', name: 'Кровля' },
]

export default function DemoFilters() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showDropdown1, setShowDropdown1] = useState(false)
  const [showDropdown2, setShowDropdown2] = useState(false)
  const [showDropdown3, setShowDropdown3] = useState(false)
  const [showDropdown4, setShowDropdown4] = useState(false)
  const [showDropdown5, setShowDropdown5] = useState(false)

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedCategories(categories.map(c => c.id))
  }

  const clearAll = () => {
    setSelectedCategories([])
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          5 вариантов фильтра с категориями
        </h1>

        <div className="space-y-16">

          {/* Вариант 1: Dropdown с чекбоксами */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">1. Dropdown с чекбоксами</span>
            </div>
            <div className="bg-gray-900 border-b border-white/10 p-6">
              <div className="flex items-center gap-3">
                {/* Categories Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown1(!showDropdown1)}
                    className="flex items-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/70 hover:bg-white/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span className="font-medium">Категории</span>
                    {selectedCategories.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                        {selectedCategories.length}
                      </span>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${showDropdown1 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown1 && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-2xl border border-white/10 shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-white/10">
                        <button onClick={selectAll} className="w-full px-3 py-2 text-sm text-blue-400 hover:bg-white/5 rounded-lg transition-colors text-left">
                          Выбрать все
                        </button>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat.id)}
                              onChange={() => toggleCategory(cat.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                            />
                            <span className="text-white/80 text-sm">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Поиск объявлений..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                {/* Upload Button */}
                <button className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25" title="Загрузить смету">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Filters */}
                <button className="flex items-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="font-medium">Фильтры</span>
                </button>

                {/* Search */}
                <button className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25">
                  Найти
                </button>
              </div>
            </div>
          </div>

          {/* Вариант 2: Категории как теги */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">2. Категории как теги (chips)</span>
            </div>
            <div className="bg-gray-900 border-b border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Поиск объявлений..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                {/* Upload Button */}
                <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all" title="Загрузить смету">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Filters */}
                <button className="flex items-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="font-medium">Фильтры</span>
                </button>

                {/* Search */}
                <button className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25">
                  Найти
                </button>
              </div>
              {/* Category chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={selectAll} className="px-3 py-1.5 text-sm text-blue-400 border border-blue-500/30 rounded-full hover:bg-blue-500/10 transition-colors">
                  Все категории
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                      selectedCategories.includes(cat.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 3: Компактный dropdown + кнопка внутри поиска */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">3. Компактный - категория внутри поиска</span>
            </div>
            <div className="bg-gray-900 border-b border-white/10 p-6">
              <div className="flex items-center gap-3">
                {/* Combined search with category */}
                <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  {/* Category selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown3(!showDropdown3)}
                      className="flex items-center gap-2 px-4 py-3.5 text-white/70 hover:bg-white/5 border-r border-white/10 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <span className="text-sm">Все категории</span>
                      <svg className={`w-4 h-4 transition-transform ${showDropdown3 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showDropdown3 && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-2xl border border-white/10 shadow-xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-white/10">
                          <button onClick={selectAll} className="w-full px-3 py-2 text-sm text-blue-400 hover:bg-white/5 rounded-lg transition-colors text-left">
                            Выбрать все
                          </button>
                        </div>
                        <div className="p-2 max-h-64 overflow-y-auto">
                          {categories.map(cat => (
                            <label key={cat.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded" />
                              <span className="text-white/80 text-sm">{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Search input */}
                  <input
                    type="text"
                    placeholder="Поиск объявлений..."
                    className="flex-1 px-4 py-3.5 bg-transparent text-white placeholder-white/40 focus:outline-none"
                  />
                  {/* Upload inside */}
                  <button className="px-4 py-3.5 text-white/50 hover:text-white border-l border-white/10 transition-colors" title="Загрузить смету">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Filters */}
                <button className="flex items-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="font-medium">Фильтры</span>
                </button>

                {/* Search */}
                <button className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25">
                  Найти
                </button>
              </div>
            </div>
          </div>

          {/* Вариант 4: С иконками категорий */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">4. Dropdown с иконками категорий</span>
            </div>
            <div className="bg-gray-900 border-b border-white/10 p-6">
              <div className="flex items-center gap-3">
                {/* Categories Dropdown with icons */}
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown4(!showDropdown4)}
                    className="flex items-center gap-2 px-4 py-3.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl text-white hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
                  >
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="font-medium">Категории</span>
                    {selectedCategories.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                        {selectedCategories.length}
                      </span>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${showDropdown4 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown4 && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 rounded-2xl border border-white/10 shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-white/10 flex items-center justify-between">
                        <span className="text-white/50 text-sm">Выберите категории</span>
                        <button onClick={selectAll} className="text-sm text-blue-400 hover:text-blue-300">
                          Выбрать все
                        </button>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto grid grid-cols-2 gap-1">
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 rounded-xl cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat.id)}
                              onChange={() => toggleCategory(cat.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
                            />
                            <span className="text-white/80 text-sm">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Поиск объявлений..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                {/* Upload Button - gradient outline */}
                <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border-2 border-transparent bg-clip-padding text-white/60 hover:text-white transition-all relative before:absolute before:inset-0 before:rounded-full before:p-[2px] before:bg-gradient-to-r before:from-blue-500 before:to-purple-500 before:-z-10" title="Загрузить смету">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Filters */}
                <button className="flex items-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="font-medium">Фильтры</span>
                </button>

                {/* Search */}
                <button className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25">
                  Найти
                </button>
              </div>
            </div>
          </div>

          {/* Вариант 5: Минималистичный с pill-кнопками */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">5. Минималистичный pill-стиль</span>
            </div>
            <div className="bg-gray-900 border-b border-white/10 p-6">
              <div className="flex items-center gap-2">
                {/* Categories Dropdown - pill */}
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown5(!showDropdown5)}
                    className="flex items-center gap-2 h-12 px-4 bg-white/5 border border-white/10 rounded-full text-white/70 hover:bg-white/10 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span className="text-sm">Категории</span>
                    {selectedCategories.length > 0 && (
                      <span className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full">
                        {selectedCategories.length}
                      </span>
                    )}
                  </button>
                  {showDropdown5 && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-2xl border border-white/10 shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-white/10">
                        <button onClick={selectAll} className="w-full px-3 py-2 text-sm text-blue-400 hover:bg-white/5 rounded-lg transition-colors text-left flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Выбрать все
                        </button>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded" />
                            <span className="text-white/80 text-sm">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Input - pill */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Поиск объявлений..."
                    className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                {/* Upload Button - small pill */}
                <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all" title="Загрузить смету">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Filters - pill */}
                <button className="flex items-center gap-2 h-12 px-4 bg-white/5 border border-white/10 rounded-full text-white/60 hover:bg-white/10 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-sm">Фильтры</span>
                </button>

                {/* Search - gradient pill */}
                <button className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25">
                  Найти
                </button>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-10 text-center text-gray-500 text-sm">
          Напишите номер варианта (1-5), который вам нравится
        </div>
      </div>
    </div>
  )
}
