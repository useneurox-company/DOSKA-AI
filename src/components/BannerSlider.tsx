'use client'

import { useState, useEffect, useCallback } from 'react'

const slides = [
  {
    title: 'B2B площадка стройматериалов с ИИ',
    subtitle: 'Объединяем Telegram-каналы, доски объявлений и поставщиков в одном месте',
    bgImage: '/banner/task_01kgvrjc1ffk99g5n0tgvhn17q_1770458297_img_1.jpg',
    gradient: 'from-blue-900 via-indigo-900 to-slate-900',
    accentColor: 'from-blue-500 to-cyan-400',
    iconBg: 'from-blue-500 to-cyan-500',
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid1" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid1)" />
      </svg>
    ),
    decorElements: (
      <>
        <div className="absolute top-6 right-[15%] w-20 h-20 border border-blue-400/10 rounded-xl rotate-12" />
        <div className="absolute bottom-8 left-[10%] w-16 h-16 border border-cyan-400/10 rounded-full" />
        <div className="absolute top-1/2 right-[8%] w-3 h-3 bg-blue-400/20 rounded-full" />
        <div className="absolute top-8 left-[20%] w-2 h-2 bg-cyan-400/20 rounded-full" />
      </>
    ),
  },
  {
    title: 'Загрузите смету — найдите лучшие цены',
    subtitle: 'Excel, Word, PDF или текст — ИИ разберёт до 100 позиций и подберёт поставщиков',
    bgImage: '/banner/69e7395e-894c-444e-9b06-53e699058cb1.png',
    gradient: 'from-violet-900 via-purple-900 to-indigo-900',
    accentColor: 'from-violet-500 to-purple-400',
    iconBg: 'from-violet-500 to-purple-500',
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots2" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.5" fill="white"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots2)" />
      </svg>
    ),
    decorElements: (
      <>
        <div className="absolute top-4 right-[12%] w-24 h-16 border border-violet-400/10 rounded-lg -rotate-6" />
        <div className="absolute bottom-6 left-[12%] w-14 h-20 border border-purple-400/10 rounded-lg rotate-6" />
        <div className="absolute top-10 left-[25%] w-2 h-2 bg-violet-400/20 rounded-full" />
        <div className="absolute bottom-10 right-[20%] w-3 h-3 bg-purple-400/15 rounded-full" />
      </>
    ),
  },
  {
    title: 'Продайте складские остатки',
    subtitle: 'Загрузите файл — ИИ категоризирует товары и покажет рыночные цены',
    bgImage: '/banner/task_01kgtdj6a3egjbqcf07vqnfy33_1770413211_img_0.webp',
    gradient: 'from-emerald-900 via-teal-900 to-cyan-900',
    accentColor: 'from-emerald-500 to-teal-400',
    iconBg: 'from-emerald-500 to-teal-500',
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex3" width="28" height="49" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <path d="M14 0L28 8.08v16.16L14 32.32 0 24.24V8.08z" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex3)" />
      </svg>
    ),
    decorElements: (
      <>
        <div className="absolute top-6 right-[10%] w-12 h-12 border border-emerald-400/10 rotate-45" />
        <div className="absolute bottom-6 left-[15%] w-16 h-16 border border-teal-400/10 rotate-12" />
        <div className="absolute top-12 left-[30%] w-2 h-2 bg-emerald-400/20 rounded-full" />
        <div className="absolute bottom-12 right-[25%] w-3 h-3 bg-teal-400/15 rounded-full" />
      </>
    ),
  },
  {
    title: 'Не замораживайте деньги на складе',
    subtitle: 'Превращайте неликвид в оборотные средства. Деньги должны работать',
    bgImage: '/banner/task_01kgvrtvhyfg2vta1n0s8z7fra_1770458578_img_0.jpg',
    gradient: 'from-amber-900 via-orange-900 to-yellow-900',
    accentColor: 'from-amber-500 to-yellow-400',
    iconBg: 'from-amber-500 to-orange-500',
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diag4" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 16L16 0" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag4)" />
      </svg>
    ),
    decorElements: (
      <>
        <div className="absolute top-5 right-[14%] w-16 h-16 border border-amber-400/10 rounded-full" />
        <div className="absolute bottom-5 left-[10%] w-10 h-10 border border-orange-400/10 rounded-full" />
        <div className="absolute top-1/3 left-[22%] w-3 h-3 bg-amber-400/20 rounded-full" />
        <div className="absolute bottom-8 right-[18%] w-2 h-2 bg-yellow-400/20 rounded-full" />
      </>
    ),
  },
  {
    title: 'ИИ найдёт поставщика за вас',
    subtitle: 'Автоматический подбор по цене, локации и рейтингу',
    bgImage: '/banner/task_01kgvr8hpsfkcbmqfwbr521kbd_1770457974_img_1.webp',
    gradient: 'from-rose-900 via-pink-900 to-fuchsia-900',
    accentColor: 'from-rose-500 to-pink-400',
    iconBg: 'from-rose-500 to-pink-500',
    icon: (
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    pattern: (
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cross5" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M12 0v24M0 12h24" fill="none" stroke="white" strokeWidth="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cross5)" />
      </svg>
    ),
    decorElements: (
      <>
        <div className="absolute top-4 right-[10%] w-20 h-14 border border-rose-400/10 rounded-xl rotate-3" />
        <div className="absolute bottom-4 left-[12%] w-12 h-12 border border-pink-400/10 rounded-lg -rotate-12" />
        <div className="absolute top-10 left-[28%] w-2 h-2 bg-rose-400/20 rounded-full" />
        <div className="absolute bottom-10 right-[22%] w-3 h-3 bg-pink-400/15 rounded-full" />
      </>
    ),
  },
]

export default function BannerSlider() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goToSlide = useCallback((index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setActiveSlide(index)
    setTimeout(() => setIsAnimating(false), 600)
  }, [isAnimating])

  useEffect(() => {
    const timer = setInterval(() => {
      goToSlide((activeSlide + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [activeSlide, goToSlide])

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-auto lg:max-w-6xl mt-2">
      {/* Slides container */}
      <div className="relative h-[200px] sm:h-[220px]">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-600 ease-in-out ${
              index === activeSlide
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
            }`}
            style={{ transitionDuration: '600ms' }}
          >
            {/* Background image or gradient */}
            {slide.bgImage ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${slide.bgImage})` }}
                />
                <div className="absolute inset-0 bg-black/55" />
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-40`} />
              </>
            ) : (
              <>
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
                {/* Ambient glow */}
                <div className={`absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br ${slide.accentColor} rounded-full opacity-[0.08] blur-3xl`} />
                <div className={`absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr ${slide.accentColor} rounded-full opacity-[0.06] blur-3xl`} />
                {/* Pattern overlay */}
                {slide.pattern}
                {/* Decorative elements */}
                {slide.decorElements}
              </>
            )}
          </div>
        ))}

        {/* Content overlay - fixed position for all slides */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-full max-w-2xl mx-auto px-12 sm:px-16">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 flex flex-col items-center justify-center px-12 sm:px-16 transition-all duration-500 ${
                  index === activeSlide
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl flex items-center justify-center text-white/70 mb-3">
                  {slide.icon}
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-2xl font-bold text-white mb-2 text-center leading-tight">
                  {slide.title}
                </h2>

                {/* Subtitle */}
                <p className="text-white/60 text-sm sm:text-base text-center max-w-lg leading-relaxed">
                  {slide.subtitle}
                </p>

              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => goToSlide((activeSlide - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all z-20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => goToSlide((activeSlide + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all z-20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeSlide
                ? `bg-white w-6`
                : 'bg-white/30 w-1.5 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
