'use client'

import { useState, useEffect } from 'react'

const slides = [
  {
    title: 'B2B площадка стройматериалов с ИИ',
    subtitle: 'Объединяем Telegram-каналы, доски объявлений и поставщиков в одном месте',
    accent: '5 000+ объявлений • Вся Россия',
  },
  {
    title: 'Загрузите смету — найдите лучшие цены',
    subtitle: 'Excel, Word, PDF или текст — ИИ разберёт до 50 позиций',
    button: 'Попробовать',
  },
  {
    title: 'Продайте складские остатки за минуты',
    subtitle: 'ИИ категоризирует товары и покажет рыночные цены',
    button: 'Разместить',
  },
]

export default function DemoBanner() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          10 вариантов баннера-слайдера
        </h1>

        <div className="space-y-12">

          {/* Вариант 1: Минималистичный градиент */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">1. Минималистичный градиент</span>
            </div>
            <div className="relative h-28 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{slides[activeSlide].title}</h2>
                <p className="text-white/70 text-sm mt-1">{slides[activeSlide].subtitle}</p>
              </div>
              <div className="absolute bottom-3 flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? 'bg-white w-6' : 'bg-white/40'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 2: Glassmorphism тёмный */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">2. Glassmorphism тёмный</span>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl"></div>
              <div className="relative h-28 bg-gray-900/80 backdrop-blur-xl border border-white/10 flex items-center px-8">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                  <p className="text-white/60 text-sm">{slides[activeSlide].subtitle}</p>
                </div>
                {slides[activeSlide].button && (
                  <button className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-full">
                    {slides[activeSlide].button} →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Вариант 3: С иконкой слева */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">3. С иконкой слева</span>
            </div>
            <div className="h-28 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 flex items-center px-8 gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                <p className="text-gray-400 text-sm">{slides[activeSlide].subtitle}</p>
              </div>
              <div className="flex gap-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`w-8 h-1 rounded-full transition-all ${i === activeSlide ? 'bg-blue-500' : 'bg-gray-700'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 4: Карточка с тенью */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">4. Карточка с тенью</span>
            </div>
            <div className="p-4 bg-gray-900">
              <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-2xl shadow-blue-500/30 flex items-center justify-between px-8">
                <div>
                  <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                  <p className="text-blue-100/80 text-sm">{slides[activeSlide].subtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Вариант 5: Неоновый акцент */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">5. Неоновый акцент</span>
            </div>
            <div className="h-28 bg-black flex items-center px-8 relative overflow-hidden">
              <div className="absolute -left-20 -top-20 w-40 h-40 bg-cyan-500 rounded-full blur-3xl opacity-30"></div>
              <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-30"></div>
              <div className="relative flex-1">
                <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                <p className="text-gray-400 text-sm">{slides[activeSlide].subtitle}</p>
              </div>
              <div className="relative flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`w-3 h-3 rounded-full transition-all ${i === activeSlide ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' : 'bg-gray-700'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 6: Split с картинкой */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">6. Split дизайн</span>
            </div>
            <div className="h-28 flex">
              <div className="flex-1 bg-gray-900 flex items-center px-8">
                <div>
                  <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                  <p className="text-gray-400 text-sm">{slides[activeSlide].subtitle}</p>
                </div>
              </div>
              <div className="w-1/3 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-3xl font-bold">5000+</div>
                  <div className="text-sm opacity-80">объявлений</div>
                </div>
              </div>
            </div>
          </div>

          {/* Вариант 7: Волна */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">7. С волной</span>
            </div>
            <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative flex items-center px-8">
              <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 1440 40" fill="none">
                <path d="M0 40V20C240 0 480 0 720 20C960 40 1200 40 1440 20V40H0Z" fill="rgba(0,0,0,0.2)" />
              </svg>
              <div className="relative z-10 flex-1">
                <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                <p className="text-white/70 text-sm">{slides[activeSlide].subtitle}</p>
              </div>
              <div className="relative z-10 flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`w-2 h-2 rounded-full ${i === activeSlide ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 8: Контурный */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">8. Контурный минимализм</span>
            </div>
            <div className="h-28 bg-gray-950 border-2 border-gray-800 flex items-center px-8">
              <div className="w-12 h-12 border-2 border-blue-500 rounded-xl flex items-center justify-center mr-6">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                <p className="text-gray-500 text-sm">{slides[activeSlide].subtitle}</p>
              </div>
              <div className="flex gap-3">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`text-xs font-medium ${i === activeSlide ? 'text-blue-500' : 'text-gray-600'}`}>
                    0{i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 9: Градиент mesh */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">9. Mesh градиент</span>
            </div>
            <div className="h-28 relative flex items-center px-8" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'}}>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative flex-1">
                <h2 className="text-lg font-bold text-white drop-shadow-lg">{slides[activeSlide].title}</h2>
                <p className="text-white/80 text-sm drop-shadow">{slides[activeSlide].subtitle}</p>
              </div>
              <div className="relative flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`w-8 h-2 rounded-full ${i === activeSlide ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Вариант 10: Premium тёмный */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">10. Premium тёмный</span>
            </div>
            <div className="h-28 bg-gray-900 border border-gray-800 flex items-center px-8 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">NEW</span>
                </div>
                <h2 className="text-lg font-bold text-white">{slides[activeSlide].title}</h2>
                <p className="text-gray-400 text-sm">{slides[activeSlide].subtitle}</p>
              </div>
              {slides[activeSlide].button && (
                <button className="px-6 py-2.5 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100">
                  {slides[activeSlide].button}
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} className={`w-1.5 h-1.5 rounded-full ${i === activeSlide ? 'bg-blue-500' : 'bg-gray-700'}`} />
                ))}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-10 text-center text-gray-500 text-sm">
          Напишите номер варианта (1-10), который вам нравится
        </div>
      </div>
    </div>
  )
}
