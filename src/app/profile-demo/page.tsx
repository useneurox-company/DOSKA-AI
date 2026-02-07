'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'

// Демо данные объявлений
const demoAds = [
  {
    id: '1',
    title: 'Труба 100-ка',
    price: 4500,
    createdAt: '2026-02-05',
    isVerified: true,
    city: { name: 'Москва' },
    category: { name: 'Трубы' },
    images: [{ url: '/uploads/demo1.jpg' }],
    views: 156,
    responses: 12
  },
  {
    id: '2',
    title: 'Труба 50 см',
    price: 2000,
    createdAt: '2026-02-05',
    isVerified: true,
    city: { name: 'Москва' },
    category: { name: 'Трубы' },
    images: [],
    views: 89,
    responses: 5
  },
  {
    id: '3',
    title: 'Арматура А500С 12мм',
    price: 45000,
    createdAt: '2026-02-04',
    isVerified: false,
    city: { name: 'Санкт-Петербург' },
    category: { name: 'Арматура' },
    images: [{ url: '/uploads/demo2.jpg' }],
    views: 234,
    responses: 18
  },
]

export default function ProfileDemoPage() {
  const [activeVariant, setActiveVariant] = useState(1)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Демо: Варианты блока "Мои объявления"</h1>

          {/* Переключатель вариантов */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => setActiveVariant(num)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeVariant === num
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Вариант {num}
              </button>
            ))}
          </div>

          {/* Вариант 1: Карточки с расширенной информацией */}
          {activeVariant === 1 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-xl font-bold text-gray-900">Вариант 1: Карточки со статистикой</h2>
                <p className="text-gray-500 text-sm mt-1">Расширенные карточки с просмотрами и откликами</p>
              </div>
              <div className="p-6 space-y-4">
                {demoAds.map((ad, index) => (
                  <div
                    key={ad.id}
                    className="group relative bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-xl transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex gap-4">
                      {/* Изображение с overlay */}
                      <div className="relative w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                        {ad.images[0] ? (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Статус badge */}
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium ${
                          ad.isVerified ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {ad.isVerified ? '✓ Активно' : '⏳ На модерации'}
                        </div>
                      </div>

                      {/* Контент */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {ad.title}
                            </h3>
                            <p className="text-gray-500 text-sm mt-0.5">
                              {ad.city.name} · {ad.category.name}
                            </p>
                          </div>
                          <p className="text-xl font-bold text-blue-600 whitespace-nowrap">
                            {ad.price.toLocaleString('ru')} ₽
                          </p>
                        </div>

                        {/* Статистика */}
                        <div className="flex items-center gap-6 mt-4">
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{ad.views}</p>
                              <p className="text-xs text-gray-400">просмотров</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{ad.responses}</p>
                              <p className="text-xs text-gray-400">откликов</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(ad.createdAt).toLocaleDateString('ru')}
                          </div>
                        </div>
                      </div>

                      {/* Кнопки действий */}
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <button className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                        <button className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Вариант 2: Сетка карточек */}
          {activeVariant === 2 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <h2 className="text-xl font-bold text-gray-900">Вариант 2: Сетка карточек</h2>
                <p className="text-gray-500 text-sm mt-1">Компактные карточки в виде сетки</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {demoAds.map((ad) => (
                    <div
                      key={ad.id}
                      className="group relative bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-purple-200 hover:shadow-xl transition-all duration-300"
                    >
                      {/* Изображение */}
                      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        {/* Статус */}
                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                          ad.isVerified ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {ad.isVerified ? 'Активно' : 'Модерация'}
                        </div>
                        {/* Цена overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                          <p className="text-xl font-bold text-white">{ad.price.toLocaleString('ru')} ₽</p>
                        </div>
                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button className="p-3 bg-white rounded-full hover:bg-blue-50 transition-colors transform hover:scale-110">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button className="p-3 bg-white rounded-full hover:bg-red-50 transition-colors transform hover:scale-110">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Контент */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                          {ad.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">{ad.city.name} · {ad.category.name}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {ad.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {ad.responses}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(ad.createdAt).toLocaleDateString('ru')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Вариант 3: Минималистичный список */}
          {activeVariant === 3 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <h2 className="text-xl font-bold text-gray-900">Вариант 3: Минималистичный список</h2>
                <p className="text-gray-500 text-sm mt-1">Чистый дизайн со свайп-действиями</p>
              </div>
              <div className="divide-y">
                {demoAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="group relative flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent transition-all duration-300"
                  >
                    {/* Левая граница-индикатор */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${
                      ad.isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                    } opacity-0 group-hover:opacity-100`} />

                    {/* Миниатюра */}
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">{ad.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ad.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ad.isVerified ? 'Активно' : 'Модерация'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{ad.city.name} · {ad.category.name}</p>
                    </div>

                    {/* Статистика */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{ad.views}</p>
                        <p className="text-xs text-gray-400">просм.</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{ad.responses}</p>
                        <p className="text-xs text-gray-400">откл.</p>
                      </div>
                    </div>

                    {/* Цена */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{ad.price.toLocaleString('ru')} ₽</p>
                      <p className="text-xs text-gray-400">{new Date(ad.createdAt).toLocaleDateString('ru')}</p>
                    </div>

                    {/* Действия */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Редактировать">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-red-100 rounded-lg transition-colors" title="Удалить">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Вариант 4: Карточки с прогрессом */}
          {activeVariant === 4 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <h2 className="text-xl font-bold text-gray-900">Вариант 4: Карточки с аналитикой</h2>
                <p className="text-gray-500 text-sm mt-1">Подробная аналитика каждого объявления</p>
              </div>
              <div className="p-6 space-y-4">
                {demoAds.map((ad) => {
                  const maxViews = 300
                  const maxResponses = 30
                  const viewsPercent = Math.min((ad.views / maxViews) * 100, 100)
                  const responsesPercent = Math.min((ad.responses / maxResponses) * 100, 100)

                  return (
                    <div
                      key={ad.id}
                      className="group bg-gradient-to-r from-white to-orange-50/30 border-2 border-orange-100 rounded-2xl p-5 hover:border-orange-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex gap-5">
                        {/* Изображение */}
                        <div className="relative w-28 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {/* Ранг */}
                          <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                            #{demoAds.indexOf(ad) + 1}
                          </div>
                        </div>

                        {/* Контент */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">{ad.title}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  ad.isVerified
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {ad.isVerified ? '● Активно' : '○ Модерация'}
                                </span>
                              </div>
                              <p className="text-gray-500 text-sm">{ad.city.name} · {ad.category.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                                {ad.price.toLocaleString('ru')} ₽
                              </p>
                              <p className="text-xs text-gray-400">{new Date(ad.createdAt).toLocaleDateString('ru')}</p>
                            </div>
                          </div>

                          {/* Прогресс-бары */}
                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-500 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Просмотры
                                </span>
                                <span className="font-semibold text-gray-900">{ad.views}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${viewsPercent}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-500 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  Отклики
                                </span>
                                <span className="font-semibold text-gray-900">{ad.responses}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${responsesPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Действия */}
                        <div className="flex flex-col justify-center gap-2">
                          <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Изменить
                          </button>
                          <button className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Поднять
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
