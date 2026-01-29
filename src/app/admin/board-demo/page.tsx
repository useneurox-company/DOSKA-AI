'use client'

import { useState } from 'react'
import BoardCharacter, { CharacterState } from '@/components/helper/BoardCharacter'
import Header from '@/components/Header'

const states: { state: CharacterState; label: string; description: string; color: string }[] = [
  { state: 'idle', label: 'Idle', description: 'Дышит, моргает', color: 'bg-gray-500' },
  { state: 'appear', label: 'Появление', description: 'Выпрыгивает снизу', color: 'bg-green-500' },
  { state: 'disappear', label: 'Исчезновение', description: 'Уезжает вниз', color: 'bg-red-500' },
  { state: 'wave', label: 'Машет', description: 'Машет рукой', color: 'bg-blue-500' },
  { state: 'think', label: 'Думает', description: 'Рука у подбородка, точки', color: 'bg-purple-500' },
  { state: 'typing', label: 'Печатает', description: 'Глаза бегают', color: 'bg-cyan-500' },
  { state: 'happy', label: 'Радуется', description: 'Прыгает, сердечки', color: 'bg-pink-500' },
  { state: 'sad', label: 'Грустит', description: 'Грустные глаза и рот', color: 'bg-orange-500' },
  { state: 'surprise', label: 'Удивлён', description: 'Большие глаза', color: 'bg-yellow-500' },
  { state: 'angry', label: 'Злится', description: 'Нахмуренные брови', color: 'bg-red-600' },
  { state: 'dance', label: 'Танцует', description: 'Качается влево-вправо', color: 'bg-violet-500' },
  { state: 'sleep', label: 'Спит', description: 'Закрытые глаза, zzz', color: 'bg-indigo-500' },
]

export default function BoardDemoPage() {
  const [currentState, setCurrentState] = useState<CharacterState>('idle')
  const [isVisible, setIsVisible] = useState(true)

  const handleStateChange = (state: CharacterState) => {
    if (state === 'appear') {
      setIsVisible(false)
      setTimeout(() => {
        setIsVisible(true)
        setCurrentState('appear')
      }, 100)
    } else if (state === 'disappear') {
      setCurrentState('disappear')
      setTimeout(() => {
        setIsVisible(false)
      }, 600)
    } else {
      // Убедимся что персонаж видим при любом другом состоянии
      if (!isVisible) {
        setIsVisible(true)
      }
      setCurrentState(state)
    }
  }

  const handleAnimationEnd = () => {
    if (currentState === 'appear' || currentState === 'wave' || currentState === 'happy' || currentState === 'surprise') {
      setTimeout(() => setCurrentState('idle'), 500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Доска-персонаж
            <span className="ml-3 px-3 py-1 text-sm bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              ДЕМО
            </span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Анимированный помощник в стиле Clippy. Нажимайте на кнопки чтобы увидеть разные состояния.
          </p>
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Персонаж */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-80 flex items-center justify-center bg-gray-900/50 rounded-3xl border border-white/10">
              {/* Фон с градиентом */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 rounded-3xl" />

              {/* Персонаж */}
              {isVisible && (
                <BoardCharacter
                  state={currentState}
                  size={200}
                  onAnimationEnd={handleAnimationEnd}
                />
              )}

              {/* Текущее состояние */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm font-medium">
                  {states.find(s => s.state === currentState)?.label || currentState}
                </span>
              </div>
            </div>

            {/* Подпись */}
            <p className="mt-6 text-white/50 text-sm text-center max-w-xs">
              Глаза следят за курсором мыши.
              <br />
              В idle-состоянии персонаж моргает каждые 3-5 секунд.
            </p>
          </div>

          {/* Кнопки состояний */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Состояния (12)</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {states.map(({ state, label, description, color }) => (
                <button
                  key={state}
                  onClick={() => handleStateChange(state)}
                  className={`
                    p-4 rounded-xl border transition-all text-left
                    ${currentState === state
                      ? 'bg-white/10 border-white/30'
                      : 'bg-gray-800/50 border-white/10 hover:border-white/20 hover:bg-gray-800/80'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="font-medium text-white">{label}</span>
                  </div>
                  <p className="text-xs text-white/50">{description}</p>
                </button>
              ))}
            </div>

            {/* Инструкция */}
            <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h3 className="font-medium text-blue-400 mb-2">Как работает в чате:</h3>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Открытие чата → <code className="text-blue-400">appear</code> → <code className="text-blue-400">wave</code></li>
                <li>• Пользователь пишет → <code className="text-purple-400">surprise</code></li>
                <li>• AI думает → <code className="text-purple-400">think</code></li>
                <li>• AI печатает → <code className="text-cyan-400">typing</code></li>
                <li>• Ответ готов → <code className="text-pink-400">happy</code></li>
                <li>• Ошибка → <code className="text-orange-400">sad</code></li>
                <li>• Бездействие 30сек → <code className="text-indigo-400">sleep</code></li>
                <li>• Закрытие чата → <code className="text-red-400">disappear</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Быстрые сценарии */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-6">Сценарии</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                handleStateChange('appear')
                await new Promise(r => setTimeout(r, 1000))
                setCurrentState('wave')
                await new Promise(r => setTimeout(r, 1500))
                setCurrentState('idle')
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:opacity-90"
            >
              Приветствие
            </button>

            <button
              onClick={async () => {
                setCurrentState('surprise')
                await new Promise(r => setTimeout(r, 800))
                setCurrentState('think')
                await new Promise(r => setTimeout(r, 2000))
                setCurrentState('typing')
                await new Promise(r => setTimeout(r, 2000))
                setCurrentState('happy')
                await new Promise(r => setTimeout(r, 1000))
                setCurrentState('idle')
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90"
            >
              Ответ на вопрос
            </button>

            <button
              onClick={async () => {
                setCurrentState('surprise')
                await new Promise(r => setTimeout(r, 800))
                setCurrentState('think')
                await new Promise(r => setTimeout(r, 1500))
                setCurrentState('sad')
                await new Promise(r => setTimeout(r, 2000))
                setCurrentState('idle')
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium hover:opacity-90"
            >
              Ошибка API
            </button>

            <button
              onClick={async () => {
                setCurrentState('dance')
                await new Promise(r => setTimeout(r, 3000))
                setCurrentState('happy')
                await new Promise(r => setTimeout(r, 1000))
                setCurrentState('idle')
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium hover:opacity-90"
            >
              Танец!
            </button>

            <button
              onClick={async () => {
                setCurrentState('sleep')
                await new Promise(r => setTimeout(r, 5000))
                setCurrentState('surprise')
                await new Promise(r => setTimeout(r, 800))
                setCurrentState('idle')
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-medium hover:opacity-90"
            >
              Сон и пробуждение
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
