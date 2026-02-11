'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Supplier {
  id: string
  title: string
  description: string | null
  price: number
  city: string
  category: string
  contactName: string | null
  contactPhone: string | null
  contactUsername: string | null
  matchScore: number
  image: string | null
  createdAt: string
}

export default function SupplierMatches({ adId }: { adId: string }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ads/${adId}/suppliers`)
      .then(r => r.json())
      .then(data => setSuppliers(data.suppliers || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Подходящие поставщики
        </h2>
        <p className="text-sm text-gray-500">
          Пока нет подходящих предложений. Они появятся здесь, когда поставщики разместят похожие товары.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Подходящие поставщики
        <span className="text-sm font-normal text-gray-500">({suppliers.length})</span>
      </h2>
      <div className="space-y-3">
        {suppliers.map(supplier => (
          <div
            key={supplier.id}
            className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/ad/${supplier.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate"
                  >
                    {supplier.title}
                  </Link>
                  {supplier.matchScore >= 50 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                      {supplier.matchScore}% совп.
                    </span>
                  )}
                  {supplier.matchScore >= 20 && supplier.matchScore < 50 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700 flex-shrink-0">
                      {supplier.matchScore}% совп.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {supplier.city}
                  </span>
                  <span>{supplier.category}</span>
                  {supplier.price > 0 && (
                    <span className="font-medium text-gray-900">
                      {supplier.price.toLocaleString('ru-RU')} ₽
                    </span>
                  )}
                </div>
                {supplier.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{supplier.description}</p>
                )}
              </div>
            </div>

            {/* Contact buttons */}
            {(supplier.contactPhone || supplier.contactUsername) && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                {supplier.contactPhone && (
                  <a
                    href={`tel:${supplier.contactPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {supplier.contactPhone}
                  </a>
                )}
                {supplier.contactUsername && (
                  <a
                    href={`https://t.me/${supplier.contactUsername.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z" />
                    </svg>
                    Telegram
                  </a>
                )}
                <Link
                  href={`/ad/${supplier.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors ml-auto"
                >
                  Подробнее
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}

            {/* If no direct contacts, show link to ad */}
            {!supplier.contactPhone && !supplier.contactUsername && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link
                  href={`/ad/${supplier.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Посмотреть карточку
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
