'use client'

import { useState } from 'react'
import Header from '@/components/Header'

// Определение 5 вариантов светлой темы + тёмная
const themes = [
  {
    id: 'dark',
    name: 'Dark (текущая)',
    description: 'Тёмная тема, как сейчас',
    colors: {
      bg: '#030712',        // gray-950
      bgSecondary: '#111827', // gray-900
      card: 'rgba(31, 41, 55, 0.5)', // gray-800/50
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.6)',
      border: 'rgba(255,255,255,0.1)',
      gradient: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    }
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    description: 'Минималистичный, Apple-style',
    colors: {
      bg: '#FFFFFF',
      bgSecondary: '#F8FAFC',
      card: '#F1F5F9',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      gradient: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    }
  },
  {
    id: 'warm-cream',
    name: 'Warm Cream',
    description: 'Уютный, тёплый',
    colors: {
      bg: '#FFFBF5',
      bgSecondary: '#FEF7ED',
      card: '#FFF7ED',
      text: '#44403C',
      textSecondary: '#78716C',
      border: '#FED7AA',
      gradient: 'linear-gradient(to right, #F97316, #FBBF24)',
    }
  },
  {
    id: 'cool-gray',
    name: 'Cool Gray',
    description: 'Корпоративный, деловой',
    colors: {
      bg: '#F1F5F9',
      bgSecondary: '#E2E8F0',
      card: '#FFFFFF',
      text: '#334155',
      textSecondary: '#64748B',
      border: '#CBD5E1',
      gradient: 'linear-gradient(to right, #0EA5E9, #3B82F6)',
    }
  },
  {
    id: 'soft-blue',
    name: 'Soft Blue',
    description: 'Свежий, технологичный',
    colors: {
      bg: '#F0F9FF',
      bgSecondary: '#E0F2FE',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#BAE6FD',
      gradient: 'linear-gradient(to right, #06B6D4, #3B82F6)',
    }
  },
  {
    id: 'mint-green',
    name: 'Mint Green',
    description: 'Экологичный, природный',
    colors: {
      bg: '#F0FDF4',
      bgSecondary: '#DCFCE7',
      card: '#FFFFFF',
      text: '#166534',
      textSecondary: '#4D7C0F',
      border: '#BBF7D0',
      gradient: 'linear-gradient(to right, #10B981, #06B6D4)',
    }
  },
]

// Компонент мини-превью темы
function ThemePreview({ theme, isSelected, onClick }: {
  theme: typeof themes[0]
  isSelected: boolean
  onClick: () => void
}) {
  const { colors } = theme

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full rounded-2xl overflow-hidden border-2 transition-all
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/20 scale-105' : 'border-transparent hover:border-white/20'}
      `}
    >
      {/* Мини-сайт */}
      <div style={{ backgroundColor: colors.bg }} className="p-3">
        {/* Mini Header */}
        <div style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }} className="rounded-lg p-2 mb-2 border">
          <div className="flex items-center justify-between">
            <div style={{ background: colors.gradient }} className="w-16 h-3 rounded" />
            <div className="flex gap-1">
              <div style={{ backgroundColor: colors.border }} className="w-8 h-3 rounded" />
              <div style={{ backgroundColor: colors.border }} className="w-8 h-3 rounded" />
            </div>
          </div>
        </div>

        {/* Mini Search */}
        <div style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }} className="rounded-lg p-2 mb-2 border flex gap-2">
          <div style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 h-4 rounded border" />
          <div style={{ background: colors.gradient }} className="w-10 h-4 rounded" />
        </div>

        {/* Mini Cards */}
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map(i => (
            <div key={i} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-lg p-2 border">
              <div style={{ backgroundColor: colors.border }} className="w-full h-8 rounded mb-1" />
              <div style={{ color: colors.text }} className="h-2 rounded mb-1 text-[6px] font-medium">Заголовок</div>
              <div style={{ backgroundColor: colors.border }} className="w-3/4 h-1.5 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Label */}
      <div style={{ backgroundColor: colors.bgSecondary, color: colors.text, borderColor: colors.border }} className="p-2 border-t text-center">
        <div className="font-medium text-sm">{theme.name}</div>
        <div style={{ color: colors.textSecondary }} className="text-xs">{theme.description}</div>
      </div>

      {/* Selected badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

// Компонент полноразмерного превью
function FullPreview({ theme }: { theme: typeof themes[0] }) {
  const { colors } = theme

  return (
    <div style={{ backgroundColor: colors.bg }} className="rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }} className="p-4 border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ background: colors.gradient }} className="w-8 h-8 rounded-lg" />
            <span style={{ color: colors.text }} className="font-bold text-lg">doska.ai</span>
          </div>
          <div className="flex items-center gap-3">
            <button style={{ color: colors.textSecondary, borderColor: colors.border }} className="px-4 py-2 rounded-full border text-sm">
              Войти
            </button>
            <button style={{ background: colors.gradient }} className="px-4 py-2 rounded-full text-white text-sm">
              Регистрация
            </button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }} className="p-6 border-b">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <button style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }} className="px-4 py-3 rounded-xl border flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Категории
            </button>
            <div style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 rounded-xl border flex items-center px-4">
              <svg style={{ color: colors.textSecondary }} className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span style={{ color: colors.textSecondary }}>Поиск объявлений...</span>
            </div>
            <button style={{ background: colors.gradient }} className="px-6 py-3 rounded-xl text-white font-medium">
              Найти
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 mb-6">
            {['Все', 'Telegram', 'Поставщики', 'Заявки'].map((tab, i) => (
              <button
                key={tab}
                style={{
                  backgroundColor: i === 0 ? colors.gradient.includes('linear') ? undefined : colors.gradient : colors.card,
                  background: i === 0 ? colors.gradient : undefined,
                  color: i === 0 ? 'white' : colors.text,
                  borderColor: colors.border,
                }}
                className={`px-4 py-2 rounded-full text-sm ${i !== 0 ? 'border' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl border overflow-hidden">
                {/* Image placeholder */}
                <div style={{ backgroundColor: colors.bgSecondary }} className="h-32 flex items-center justify-center">
                  <svg style={{ color: colors.border }} className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {/* Content */}
                <div className="p-4">
                  <div style={{ color: colors.text }} className="font-medium mb-1">Балка двутавровая 20К1</div>
                  <div style={{ color: colors.textSecondary }} className="text-sm mb-3">12м, новая, в наличии 50 шт</div>
                  <div className="flex items-center justify-between">
                    <span style={{ background: colors.gradient }} className="bg-clip-text text-transparent font-bold text-lg">45 000 ₽</span>
                    <span style={{ color: colors.textSecondary }} className="text-xs">2 дня назад</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ThemeDemoPage() {
  const [selectedTheme, setSelectedTheme] = useState(themes[0])

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Выбор темы
            <span className="ml-3 px-3 py-1 text-sm bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              ДЕМО
            </span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Выберите вариант светлой темы для сайта. Нажмите на карточку чтобы увидеть превью.
          </p>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {themes.map(theme => (
            <ThemePreview
              key={theme.id}
              theme={theme}
              isSelected={selectedTheme.id === theme.id}
              onClick={() => setSelectedTheme(theme)}
            />
          ))}
        </div>

        {/* Selected Theme Info */}
        <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white/60 text-sm">Выбрана тема:</span>
              <h2 className="text-2xl font-bold text-white">{selectedTheme.name}</h2>
              <p className="text-white/60">{selectedTheme.description}</p>
            </div>
            <div className="flex gap-2">
              {Object.entries(selectedTheme.colors).slice(0, 5).map(([key, color]) => (
                <div key={key} className="text-center">
                  <div
                    style={{ background: color }}
                    className="w-10 h-10 rounded-lg border border-white/20 mb-1"
                  />
                  <span className="text-white/40 text-xs">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full Preview */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Полноразмерный превью</h3>
          <FullPreview theme={selectedTheme} />
        </div>

        {/* Apply Button */}
        <div className="mt-8 text-center">
          <p className="text-white/50 mb-4">
            После выбора темы она будет применена ко всему сайту с возможностью переключения.
          </p>
          <button
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg hover:opacity-90 transition-opacity"
            onClick={() => alert(`Выбрана тема: ${selectedTheme.name}\n\nДля применения на сайт скажите мне!`)}
          >
            Выбрать тему «{selectedTheme.name}»
          </button>
        </div>
      </main>
    </div>
  )
}
