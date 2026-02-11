'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MatchedRequest {
  id: string
  title: string
  description: string | null
  city: string
  category: string
  contactName: string | null
  contactPhone: string | null
  matchScore: number
  createdAt: string
}

export default function RequestMatches({ adId }: { adId: string }) {
  const [requests, setRequests] = useState<MatchedRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ads/${adId}/requests`)
      .then(r => r.json())
      .then(data => setRequests(data.requests || []))
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

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Подходящие заявки
        </h2>
        <p className="text-sm text-gray-500">
          Пока нет подходящих заявок на покупку. Они появятся здесь, когда покупатели разместят похожие запросы.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Подходящие заявки
        <span className="text-sm font-normal text-gray-500">({requests.length})</span>
      </h2>
      <div className="space-y-3">
        {requests.map(req => (
          <div
            key={req.id}
            className="border border-gray-100 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/ad/${req.id}`}
                    className="font-medium text-gray-900 hover:text-emerald-600 transition-colors truncate"
                  >
                    {req.title}
                  </Link>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 flex-shrink-0">
                    Куплю
                  </span>
                  {req.matchScore >= 50 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                      {req.matchScore}% совп.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {req.city}
                  </span>
                  <span>{req.category}</span>
                  {req.contactName && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {req.contactName}
                    </span>
                  )}
                </div>
                {req.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                )}
              </div>
            </div>

            {/* Contact buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              {req.contactPhone && (
                <a
                  href={req.contactPhone.startsWith('@')
                    ? `https://t.me/${req.contactPhone.replace('@', '')}`
                    : `tel:${req.contactPhone}`}
                  target={req.contactPhone.startsWith('@') ? '_blank' : undefined}
                  rel={req.contactPhone.startsWith('@') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {req.contactPhone}
                </a>
              )}
              <Link
                href={`/ad/${req.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors ml-auto"
              >
                Подробнее
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
