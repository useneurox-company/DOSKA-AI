import Link from 'next/link'

interface AdCardProps {
  id: string
  title: string
  price: number | null
  city: string
  source: string
  isVerified: boolean
  createdAt: Date
  imageUrl?: string
  type?: 'request' | 'offer' | null
  viewMode?: 'grid' | 'list'
}

export default function AdCard({
  id,
  title,
  price,
  city,
  source,
  isVerified,
  createdAt,
  imageUrl,
  type,
  viewMode = 'grid',
}: AdCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Сегодня'
    if (days === 1) return 'Вчера'
    if (days < 7) return `${days} дн. назад`
    return date.toLocaleDateString('ru-RU')
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Договорная'
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽'
  }

  // Режим списка
  if (viewMode === 'list') {
    return (
      <Link href={`/ad/${id}`} className="group block">
        <article
          className="rounded-xl overflow-hidden transition-all duration-300 flex h-16"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          {/* Image */}
          <div className="w-20 h-16 overflow-hidden flex-shrink-0" style={{ background: 'var(--input-bg)' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 px-4 flex items-center justify-between min-w-0">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <h3
                className="font-medium truncate group-hover:text-blue-500 transition-colors"
                style={{ color: 'var(--text-primary)' }}
                title={title}
              >
                {title}
              </h3>
              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-600 text-xs font-medium rounded-md">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {source === 'telegram' && !isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/20 text-sky-600 text-xs font-medium rounded-md">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                    </svg>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 flex-shrink-0">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{city}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{formatDate(createdAt)}</span>
              <span className="font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatPrice(price)}</span>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // Режим сетки (по умолчанию)
  return (
    <Link href={`/ad/${id}`} className="group block">
      <article
        className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 1px 3px var(--shadow-color)',
        }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--input-bg)' }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--card-border)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {type === 'request' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Куплю
              </span>
            )}
            {type === 'offer' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Продам
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-lg">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Проверено
              </span>
            )}
            {source === 'telegram' && !isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-lg">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                </svg>
                Telegram
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            className="font-semibold mb-2 line-clamp-2 leading-snug group-hover:text-blue-500 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            title={title}
          >
            {title}
          </h3>

          <p className="text-xl font-bold mb-3" style={{ color: 'var(--accent)' }}>
            {formatPrice(price)}
          </p>

          <div className="flex items-center justify-between text-sm">
            <span
              className="flex items-center gap-1.5 truncate max-w-[60%]"
              style={{ color: 'var(--text-secondary)' }}
              title={city}
            >
              <svg className="w-4 h-4 flex-shrink-0" style={{ opacity: 0.6 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{city}</span>
            </span>
            <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }} className="flex-shrink-0">
              {formatDate(createdAt)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
