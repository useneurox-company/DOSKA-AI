'use client'

import { useState, useEffect } from 'react'

const slides = [
  {
    title: 'B2B площадка стройматериалов с ИИ',
    subtitle: 'Объединяем Telegram-каналы, доски объявлений и поставщиков в одном месте',
    accent: '5 000+ объявлений • Вся Россия',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Загрузите смету — найдите лучшие цены',
    subtitle: 'Excel, Word, PDF или текст — ИИ разберёт до 100 позиций и подберёт поставщиков',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Продайте складские остатки',
    subtitle: 'Загрузите файл — ИИ категоризирует товары и покажет рыночные цены',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'Не замораживайте деньги на складе',
    subtitle: 'Превращайте неликвид в оборотные средства. Деньги должны работать',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'ИИ найдёт поставщика за вас',
    subtitle: 'Автоматический подбор по цене, локации и рейтингу',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function BannerSlider() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      goToSlide((activeSlide + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [activeSlide])

  const goToSlide = (index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setActiveSlide(index)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const slide = slides[activeSlide]

  return (
    <div className="relative overflow-hidden">
      {/* Top gradient separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

      {/* Background gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/15 to-pink-600/10"></div>

      {/* Main container */}
      <div className="relative bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Content - Centered */}
          <div
            className={`flex flex-col items-center text-center gap-4 transition-all duration-500 ${
              isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              {slide.icon}
            </div>

            {/* Text */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {slide.title}
              </h2>
              <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
                {slide.subtitle}
              </p>
              {slide.accent && (
                <p className="text-blue-400 text-sm font-medium mt-3">{slide.accent}</p>
              )}
            </div>
          </div>

          {/* Indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeSlide
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 w-8'
                    : 'bg-white/20 w-2 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => goToSlide((activeSlide - 1 + slides.length) % slides.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => goToSlide((activeSlide + 1) % slides.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
