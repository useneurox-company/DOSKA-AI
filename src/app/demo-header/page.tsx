'use client'

import Link from 'next/link'

export default function DemoHeader() {
  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          Выберите вариант хедера
        </h1>

        <div className="space-y-10">
          {/* Вариант 1: Контурный классический */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Вариант 1: Контурный классический</span>
            </div>
            <header className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-b-2xl">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-white tracking-tight">
                    doska<span className="text-blue-500">.ai</span>
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  <Link href="#" className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-600 rounded-full hover:border-gray-400 hover:text-white transition-all">
                    Войти
                  </Link>
                  <Link href="#" className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-600 rounded-full hover:border-gray-400 hover:text-white transition-all">
                    Регистрация
                  </Link>
                  <Link href="#" className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white border border-blue-500 rounded-full hover:bg-blue-500/10 transition-all">
                    Разместить
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </header>
          </div>

          {/* Вариант 2: Pill группировка */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Вариант 2: Группировка в pill</span>
            </div>
            <header className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-b-2xl">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-white tracking-tight">
                    doska<span className="text-blue-500">.ai</span>
                  </span>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-600 rounded-full overflow-hidden">
                    <Link href="#" className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all">
                      Войти
                    </Link>
                    <div className="h-5 w-px bg-gray-600"></div>
                    <Link href="#" className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all">
                      Регистрация
                    </Link>
                  </div>
                  <Link href="#" className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white border border-blue-500 rounded-full hover:bg-blue-500/10 transition-all">
                    Разместить
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </header>
          </div>

          {/* Вариант 3: С иконками */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Вариант 3: С иконками в кругах</span>
            </div>
            <header className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-b-2xl">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-white tracking-tight">
                    doska<span className="text-blue-500">.ai</span>
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  <Link href="#" className="w-10 h-10 flex items-center justify-center border border-gray-600 rounded-full hover:border-gray-400 hover:text-white text-gray-400 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  <Link href="#" className="w-10 h-10 flex items-center justify-center border border-gray-600 rounded-full hover:border-gray-400 hover:text-white text-gray-400 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </Link>
                  <Link href="#" className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white border border-blue-500 rounded-full hover:bg-blue-500/10 transition-all">
                    Разместить
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </header>
          </div>

          {/* Вариант 4: Градиент на главной кнопке */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Вариант 4: Градиентная кнопка</span>
            </div>
            <header className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-b-2xl">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-xl font-semibold text-white tracking-tight">
                    doska<span className="text-blue-500">.ai</span>
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-600 rounded-full overflow-hidden">
                    <Link href="#" className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all">
                      Войти
                    </Link>
                    <div className="h-5 w-px bg-gray-600"></div>
                    <Link href="#" className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all">
                      Регистрация
                    </Link>
                  </div>
                  <Link href="#" className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-full hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25">
                    Разместить
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </header>
          </div>

          {/* Вариант 5: Полупрозрачный glassmorphism */}
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Вариант 5: Glassmorphism</span>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-xl"></div>
              <header className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-b-2xl">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <span className="text-xl font-semibold text-white tracking-tight">
                      doska<span className="text-blue-400">.ai</span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <Link href="#" className="px-5 py-2.5 text-sm font-medium text-white/70 border border-white/20 rounded-full hover:border-white/40 hover:text-white backdrop-blur-sm transition-all">
                      Войти
                    </Link>
                    <Link href="#" className="px-5 py-2.5 text-sm font-medium text-white/70 border border-white/20 rounded-full hover:border-white/40 hover:text-white backdrop-blur-sm transition-all">
                      Регистрация
                    </Link>
                    <Link href="#" className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-full hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25">
                      Разместить
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </header>
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
