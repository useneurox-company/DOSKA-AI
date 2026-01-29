"use client"

import { useState, useEffect, useCallback } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"

interface CardItem {
  name: string
  mark?: string
  size?: string
  quantity?: string
}

interface Price {
  value: number | null
  currency: string
  per?: string | null
  vat?: boolean | null
}

interface TelegramCard {
  id: string
  rawMessageId: string
  type: "REQUEST" | "OFFER"
  category: string
  subcategory: string
  title: string
  items: CardItem[]
  services?: string[]
  description?: string
  price?: Price
  city?: string
  region?: string
  company?: string
  urgency?: string
  date: string
  daysAgo: number
  sourceGroup: string
  mediaFiles: string[]
  hasMedia: boolean
  mediaType?: string
  mediaUrl?: string
  contacts: {
    hasPhone: boolean
    hasTelegram: boolean
    hasWhatsapp: boolean
    hasEmail: boolean
    name?: string
  }
}

type FilterType = "all" | "REQUEST" | "OFFER"

export default function TelegramCardsPage() {
  const [cards, setCards] = useState<TelegramCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchCards = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
      setOffset(0)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("limit", "20")
      params.set("offset", reset ? "0" : offset.toString())
      if (filterType !== "all") {
        params.set("type", filterType)
      }

      const res = await fetch(`/api/telegram-cards?${params.toString()}`, {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Ошибка загрузки")
      }

      const data = await res.json()

      if (reset) {
        setCards(data.cards || [])
      } else {
        setCards(prev => [...prev, ...(data.cards || [])])
      }
      setTotal(data.total || 0)
      setHasMore(data.hasMore || false)
      setOffset(prev => (reset ? 20 : prev + 20))
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filterType, offset])

  useEffect(() => {
    fetchCards(true)
  }, [filterType])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatPrice = (price?: Price) => {
    if (!price?.value) return null
    const formatted = new Intl.NumberFormat("ru-RU").format(price.value)
    let result = `${formatted} ${price.currency === "RUB" ? "₽" : price.currency}`
    if (price.per) result += ` / ${price.per}`
    if (price.vat === true) result += " с НДС"
    if (price.vat === false) result += " без НДС"
    return result
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const renderCard = (card: TelegramCard) => {
    const isExpanded = expandedId === card.id

    return (
      <div
        key={card.id}
        className={`bg-gray-800/50 rounded-2xl border transition-all ${
          isExpanded ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-white/10 hover:border-white/20"
        }`}
      >
        {/* Заголовок */}
        <div
          className="p-4 cursor-pointer"
          onClick={() => toggleExpand(card.id)}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                card.type === "REQUEST"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-green-500/20 text-green-400"
              }`}>
                {card.type === "REQUEST" ? "Заявка" : "Предложение"}
              </span>
              <span className="text-xs text-white/40">{card.category}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>{formatDate(card.date)}</span>
              <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 font-medium">
                {card.daysAgo} дн
              </span>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>

          {/* Описание */}
          {card.description && (
            <p className="text-white/60 text-sm mb-3">
              {isExpanded ? card.description : truncateText(card.description, 150)}
            </p>
          )}

          {/* Позиции (краткий список) */}
          {card.items.length > 0 && !isExpanded && (
            <div className="flex flex-wrap gap-1 mb-3">
              {card.items.slice(0, 3).map((item, i) => (
                <span key={i} className="text-xs bg-white/5 text-white/70 px-2 py-1 rounded">
                  {item.name}
                </span>
              ))}
              {card.items.length > 3 && (
                <span className="text-xs text-white/40 px-2 py-1">
                  +{card.items.length - 3} ещё
                </span>
              )}
            </div>
          )}

          {/* Цена */}
          {formatPrice(card.price) && (
            <div className="text-xl font-bold text-green-400 mb-3">
              {formatPrice(card.price)}
            </div>
          )}

          {/* Мета */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
            {card.city && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {card.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
              </svg>
              {card.sourceGroup}
            </span>
            {card.hasMedia && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Фото
              </span>
            )}
          </div>
        </div>

        {/* Раскрытая секция */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
            {/* Полный список позиций */}
            {card.items.length > 0 && (
              <div>
                <div className="text-xs font-medium text-white/50 mb-2">Позиции:</div>
                <ul className="space-y-1">
                  {card.items.map((item, i) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-white/40">•</span>
                      <span>
                        {item.name}
                        {item.mark && <span className="text-white/50"> {item.mark}</span>}
                        {item.size && <span className="text-white/50"> — {item.size}</span>}
                        {item.quantity && <span className="text-white/50"> ({item.quantity})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Услуги */}
            {card.services && card.services.length > 0 && (
              <div>
                <div className="text-xs font-medium text-white/50 mb-2">Услуги:</div>
                <div className="flex flex-wrap gap-1">
                  {card.services.map((service, i) => (
                    <span key={i} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Контакты (скрыты) */}
            <div className="relative">
              <div className="text-xs font-medium text-white/50 mb-2">Контакты:</div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
                <div className="flex items-center gap-3 blur-sm select-none pointer-events-none">
                  {card.contacts.hasPhone && (
                    <span className="text-white/70">+7 (XXX) XXX-XX-XX</span>
                  )}
                  {card.contacts.hasTelegram && (
                    <span className="text-white/70">@username</span>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link
                    href="/pricing"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
                  >
                    Доступно по подписке
                  </Link>
                </div>
              </div>
              {card.contacts.name && (
                <div className="mt-2 text-sm text-white/50">
                  Контактное лицо: {card.contacts.name}
                </div>
              )}
            </div>

            {/* Медиа */}
            {card.hasMedia && card.mediaUrl && (
              <div>
                <div className="text-xs font-medium text-white/50 mb-2">Файлы:</div>
                {card.mediaType === "photo" ? (
                  <img
                    src={card.mediaUrl}
                    alt="Фото"
                    className="max-w-full max-h-64 rounded-lg border border-white/10"
                  />
                ) : (
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm text-white/70">Документ</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Заявки из Telegram</h1>
          <p className="text-white/60">
            Актуальные заявки на покупку и предложения из Telegram-каналов по стройматериалам
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-2">
            {[
              { value: "all", label: "Все" },
              { value: "REQUEST", label: "Заявки на покупку" },
              { value: "OFFER", label: "Предложения" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value as FilterType)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterType === opt.value
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="text-sm text-white/40">
            Найдено: {total}
          </div>
        </div>

        {/* Контент */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-white/50">Загрузка...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">{error}</div>
            <button
              onClick={() => fetchCards(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Попробовать снова
            </button>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            Нет доступных карточек
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map(renderCard)}
            </div>

            {/* Загрузить ещё */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchCards(false)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Загрузка..." : "Показать ещё"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Призыв к регистрации */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Хотите видеть контакты?</h2>
          <p className="text-white/60 mb-4">
            Зарегистрируйтесь и получите 10 бесплатных просмотров контактов
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="px-5 py-2.5 text-sm font-medium text-white/70 border border-white/20 rounded-xl hover:border-white/40 hover:text-white transition-all"
            >
              Тарифы
            </Link>
            <Link
              href="/auth/register"
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
