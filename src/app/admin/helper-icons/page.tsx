'use client'

import { useState, useEffect } from 'react'
import HelperIcon from '@/components/helper/HelperIcon'
import Header from '@/components/Header'

const ICON_KEY = 'doskaai_helper_icon'

const iconNames = [
  'Классическая доска',
  'Доска с мелом',
  'Мольберт',
  'Флипчарт',
  'Школьная доска',
  'Kanban доска',
  'Пробковая доска',
  'Информационный стенд',
  'Доска объявлений',
  'AI-доска',
]

export default function HelperIconsPage() {
  const [selectedIcon, setSelectedIcon] = useState(10)

  useEffect(() => {
    const saved = localStorage.getItem(ICON_KEY)
    if (saved) {
      const num = parseInt(saved, 10)
      if (num >= 1 && num <= 10) {
        setSelectedIcon(num)
      }
    }
  }, [])

  const selectIcon = (variant: number) => {
    setSelectedIcon(variant)
    localStorage.setItem(ICON_KEY, variant.toString())
    // Перезагружаем страницу чтобы FloatingHelper обновился
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Выбор иконки помощника</h1>
          <p className="text-white/60">
            Выберите иконку для плавающей кнопки ИИ-помощника
          </p>
        </div>

        {/* Текущая иконка */}
        <div className="mb-12 p-6 bg-gray-800/50 rounded-2xl border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Текущая иконка</h2>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-4 shadow-lg shadow-purple-500/30">
              <HelperIcon variant={selectedIcon} />
            </div>
            <div>
              <p className="text-white font-medium">{iconNames[selectedIcon - 1]}</p>
              <p className="text-white/50 text-sm">Вариант #{selectedIcon}</p>
            </div>
          </div>
        </div>

        {/* Все варианты */}
        <h2 className="text-xl font-semibold text-white mb-6">Все варианты (10)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((variant) => (
            <button
              key={variant}
              onClick={() => selectIcon(variant)}
              className={`
                p-6 rounded-2xl border transition-all
                ${selectedIcon === variant
                  ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'bg-gray-800/50 border-white/10 hover:border-white/30 hover:bg-gray-800'
                }
              `}
            >
              {/* Иконка в круге */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-3 shadow-lg shadow-purple-500/25">
                <HelperIcon variant={variant} />
              </div>

              {/* Название */}
              <p className={`text-sm font-medium text-center ${
                selectedIcon === variant ? 'text-white' : 'text-white/70'
              }`}>
                {iconNames[variant - 1]}
              </p>

              {/* Номер */}
              <p className="text-xs text-center text-white/40 mt-1">
                #{variant}
              </p>

              {/* Галочка */}
              {selectedIcon === variant && (
                <div className="flex justify-center mt-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Подсказка */}
        <div className="mt-12 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-400 text-sm">
            <strong>Подсказка:</strong> Кликните на иконку чтобы выбрать её. Страница перезагрузится и новая иконка появится в правом нижнем углу.
          </p>
        </div>
      </main>
    </div>
  )
}
