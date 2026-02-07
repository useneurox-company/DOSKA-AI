import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import BannerSlider from '@/components/BannerSlider'
import Filters from '@/components/Filters'
import AdCard from '@/components/AdCard'
import Footer from '@/components/Footer'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    search?: string
    source?: string
    city?: string
    page?: string
    tab?: string
    priceFrom?: string
    priceTo?: string
    view?: 'grid' | 'list'
  }>
}

// Интерфейс для преобразованной карточки из Telegram
interface TelegramAdCard {
  id: string
  title: string
  price: number | null
  city: { name: string }
  source: string
  isVerified: boolean
  createdAt: Date
  images: { url: string }[]
  type: 'request' | 'offer' | null
}

// Интерфейс для карточки Avito
interface AvitoAdCard {
  id: string
  title: string
  price: number | null
  city: { name: string }
  source: string
  isVerified: boolean
  createdAt: Date
  images: { url: string }[]
  type: 'request' | 'offer' | null
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const limit = 12
  const activeTab = params.tab || 'all'
  const viewMode = params.view || 'grid'

  // Для таба Telegram / Avito - загружаем из своих таблиц
  const isTelegramTab = activeTab === 'telegram'
  const isAvitoTab = activeTab === 'avito'

  // Build where clause for Ad table
  const where: any = {}

  if (params.search) {
    where.title = {
      contains: params.search,
      mode: 'insensitive',
    }
  }

  if (params.source && params.source !== 'all') {
    if (params.source === 'user') {
      where.isVerified = true
    } else {
      where.source = params.source
    }
  }

  // Tab filtering (кроме telegram - его обрабатываем отдельно)
  if (activeTab === 'verified') {
    where.isVerified = true
  } else if (activeTab === 'requests') {
    where.type = 'request'
  }

  if (params.city) {
    where.cityId = params.city
  }

  if (params.priceFrom) {
    where.price = { ...where.price, gte: parseInt(params.priceFrom) }
  }

  if (params.priceTo) {
    where.price = { ...where.price, lte: parseInt(params.priceTo) }
  }

  // Загружаем данные
  let ads: any[] = []
  let total = 0
  let telegramCards: TelegramAdCard[] = []
  let avitoCards: AvitoAdCard[] = []

  // Базовые данные (города, категории, счётчики)
  // Исключаем старые telegram карточки из Ad (source='telegram'), используем только RawMessage
  const [cities, categories, adsWithoutTelegram, totalTelegram, totalAvito, totalVerified, totalRequests] = await Promise.all([
    prisma.city.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    // Карточки из Ad БЕЗ старых telegram (они заменены на RawMessage)
    prisma.ad.count({ where: { source: { not: 'telegram' } } }),
    // Telegram = одобренные карточки из RawMessage
    prisma.rawMessage.count({
      where: {
        enrichedData: { not: null },
        moderationStatus: 'approved',
      },
    }),
    // Avito = одобренные карточки из AvitoAd
    prisma.avitoAd.count({
      where: {
        enrichedAt: { not: null },
        moderationStatus: 'approved',
      },
    }),
    prisma.ad.count({ where: { isVerified: true, source: { not: 'telegram' } } }),
    prisma.ad.count({ where: { type: 'request', source: { not: 'telegram' } } }),
  ])

  // Всего = карточки из Ad (без telegram) + одобренные из RawMessage + Avito
  const totalAll = adsWithoutTelegram + totalTelegram + totalAvito

  if (isTelegramTab) {
    // Загружаем одобренные карточки из RawMessage
    const telegramMessages = await prisma.rawMessage.findMany({
      where: {
        enrichedData: { not: null },
        moderationStatus: 'approved',
      },
      orderBy: { enrichedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        enrichedData: true,
        date: true,
        mediaUrl: true,
        mediaType: true,
        source: {
          select: { name: true },
        },
      },
    })

    // Преобразуем в формат AdCard
    telegramCards = telegramMessages.map((msg) => {
      let enriched: any = {}
      try {
        enriched = JSON.parse(msg.enrichedData as string)
      } catch {}

      // Извлекаем цену
      let price: number | null = null
      if (enriched.price?.value) {
        price = enriched.price.value
      }

      // Извлекаем город
      const cityName = enriched.city || msg.source?.name || 'Россия'

      return {
        id: msg.id,
        title: enriched.title || 'Без названия',
        price,
        city: { name: cityName },
        source: 'telegram',
        isVerified: false,
        createdAt: msg.date || new Date(),
        images: msg.mediaUrl && msg.mediaType === 'photo' ? [{ url: msg.mediaUrl }] : [],
        type: enriched.type === 'REQUEST' ? 'request' as const : 'offer' as const,
      }
    })

    total = totalTelegram
  } else if (isAvitoTab) {
    // Загружаем одобренные карточки из AvitoAd
    const avitoAds = await prisma.avitoAd.findMany({
      where: {
        enrichedAt: { not: null },
        moderationStatus: 'approved',
      },
      orderBy: { enrichedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        price: true,
        city: true,
        images: true,
        aiNomenclature: true,
        parsedAt: true,
        url: true,
      },
    })

    avitoCards = avitoAds.map((ad) => ({
      id: ad.id,
      title: ad.aiNomenclature ? `${ad.aiNomenclature} — ${ad.title}` : ad.title,
      price: ad.price,
      city: { name: ad.city || 'Россия' },
      source: 'avito',
      isVerified: true,
      createdAt: ad.parsedAt,
      images: Array.isArray(ad.images) && ad.images.length > 0
        ? [{ url: ad.images[0] as string }]
        : [],
      type: 'offer' as const,
    }))

    total = totalAvito
  } else {
    // Загружаем объявления из Ad (исключаем старые telegram - они заменены на RawMessage)
    const whereWithoutTelegram = { ...where, source: { not: 'telegram' } }
    const [adsData, adsCount] = await Promise.all([
      prisma.ad.findMany({
        where: whereWithoutTelegram,
        include: {
          city: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ad.count({ where: whereWithoutTelegram }),
    ])
    ads = adsData
    total = adsCount
  }

  const totalPages = Math.ceil(total / limit)

  // Build URL preserving filters
  const buildTabUrl = (tab: string) => {
    const urlParams = new URLSearchParams()
    if (tab !== 'all') urlParams.set('tab', tab)
    if (params.search) urlParams.set('search', params.search)
    if (params.city) urlParams.set('city', params.city)
    if (params.priceFrom) urlParams.set('priceFrom', params.priceFrom)
    if (params.priceTo) urlParams.set('priceTo', params.priceTo)
    if (params.view && params.view !== 'grid') urlParams.set('view', params.view)
    const queryString = urlParams.toString()
    return queryString ? `/?${queryString}` : '/'
  }

  // Build URL for view toggle
  const buildViewUrl = (view: 'grid' | 'list') => {
    const urlParams = new URLSearchParams()
    if (params.tab && params.tab !== 'all') urlParams.set('tab', params.tab)
    if (params.search) urlParams.set('search', params.search)
    if (params.city) urlParams.set('city', params.city)
    if (params.priceFrom) urlParams.set('priceFrom', params.priceFrom)
    if (params.priceTo) urlParams.set('priceTo', params.priceTo)
    if (view !== 'grid') urlParams.set('view', view)
    const queryString = urlParams.toString()
    return queryString ? `/?${queryString}` : '/'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Header />

      <BannerSlider />

      <Filters cities={cities} categories={categories} />

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div
          className="flex items-center gap-1 p-1 rounded-2xl w-fit"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
        >
          <Link
            href={buildTabUrl('all')}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : ''
            }`}
            style={activeTab !== 'all' ? { color: 'var(--text-secondary)' } : undefined}
          >
            Все
            <span className="ml-2 text-xs opacity-60">{totalAll}</span>
          </Link>
          <Link
            href={buildTabUrl('telegram')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'telegram'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : ''
            }`}
            style={activeTab !== 'telegram' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
            </svg>
            Telegram
            <span className="text-xs opacity-60">{totalTelegram}</span>
          </Link>
          <Link
            href={buildTabUrl('avito')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'avito'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : ''
            }`}
            style={activeTab !== 'avito' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z"/>
            </svg>
            Площадки
            <span className="text-xs opacity-60">{totalAvito}</span>
          </Link>
          <Link
            href={buildTabUrl('verified')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'verified'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : ''
            }`}
            style={activeTab !== 'verified' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Поставщики
            <span className="text-xs opacity-60">{totalVerified}</span>
          </Link>
          <Link
            href={buildTabUrl('requests')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : ''
            }`}
            style={activeTab !== 'requests' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Заявки
            <span className="text-xs opacity-60">{totalRequests}</span>
          </Link>
        </div>
      </div>

      {/* Results Info */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <p style={{ color: 'var(--text-secondary)' }}>
            {total > 0 ? (
              <>
                Найдено <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{total}</span> объявлений
              </>
            ) : (
              'Объявления не найдены'
            )}
          </p>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
            >
              <Link
                href={buildViewUrl('grid')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'grid' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </Link>
              <Link
                href={buildViewUrl('list')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'list' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
            <select
              className="px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)'
              }}
            >
              <option>По дате (новые)</option>
              <option>По цене (дешевле)</option>
              <option>По цене (дороже)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ads Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-12">
        {(isTelegramTab ? telegramCards.length : isAvitoTab ? avitoCards.length : ads.length) > 0 ? (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            : "flex flex-col gap-2"
          }>
            {isTelegramTab
              ? telegramCards.map((card) => (
                  <AdCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    price={card.price}
                    city={card.city.name}
                    source={card.source}
                    isVerified={card.isVerified}
                    createdAt={card.createdAt}
                    imageUrl={card.images[0]?.url}
                    type={card.type}
                    viewMode={viewMode}
                  />
                ))
              : isAvitoTab
              ? avitoCards.map((card) => (
                  <AdCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    price={card.price}
                    city={card.city.name}
                    source={card.source}
                    isVerified={card.isVerified}
                    createdAt={card.createdAt}
                    imageUrl={card.images[0]?.url}
                    type={card.type}
                    viewMode={viewMode}
                  />
                ))
              : ads.map((ad) => (
                  <AdCard
                    key={ad.id}
                    id={ad.id}
                    title={ad.title}
                    price={ad.price}
                    city={ad.city.name}
                    source={ad.source}
                    isVerified={ad.isVerified}
                    createdAt={ad.createdAt}
                    imageUrl={ad.images[0]?.url}
                    type={ad.type as 'request' | 'offer' | null}
                    viewMode={viewMode}
                  />
                ))
            }
          </div>
        ) : (
          <div className="text-center py-20">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
            >
              <svg className="w-10 h-10" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Объявлений не найдено</h3>
            <p className="max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Попробуйте изменить параметры поиска или сбросить фильтры
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10">
            <nav className="flex items-center gap-1">
              {/* Previous */}
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.source ? `&source=${params.source}` : ''}${params.city ? `&city=${params.city}` : ''}${params.tab ? `&tab=${params.tab}` : ''}${params.view ? `&view=${params.view}` : ''}`}
                  className="px-3 py-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              )}

              {/* Page Numbers */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                return pageNum
              }).map((p) => (
                <Link
                  key={p}
                  href={`?page=${p}${params.search ? `&search=${params.search}` : ''}${params.source ? `&source=${params.source}` : ''}${params.city ? `&city=${params.city}` : ''}${params.tab ? `&tab=${params.tab}` : ''}${params.view ? `&view=${params.view}` : ''}`}
                  className={`min-w-[40px] h-10 flex items-center justify-center rounded-xl font-medium transition-all ${
                    p === page
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : ''
                  }`}
                  style={p !== page ? { color: 'var(--text-secondary)' } : undefined}
                >
                  {p}
                </Link>
              ))}

              {/* Next */}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.source ? `&source=${params.source}` : ''}${params.city ? `&city=${params.city}` : ''}${params.tab ? `&tab=${params.tab}` : ''}${params.view ? `&view=${params.view}` : ''}`}
                  className="px-3 py-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </nav>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
