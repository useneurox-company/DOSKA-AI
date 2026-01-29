import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface PageProps {
  params: Promise<{ id: string }>
}

interface EnrichedData {
  title: string
  description: string
  price: number | null
  category: string
  type: 'offer' | 'request'
  phone?: string
  username?: string
  contactName?: string
}

const FREE_VIEWS_LIMIT = 10

export default async function AdPage({ params }: PageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  // Получаем данные пользователя для проверки подписки
  let user = null
  let canViewPremium = false
  let viewsLeft = 0

  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        freeViewsUsed: true,
        hasSubscription: true,
        subscriptionEnd: true,
      },
    })

    if (user) {
      const hasActiveSubscription = user.hasSubscription &&
        (!user.subscriptionEnd || new Date(user.subscriptionEnd) > new Date())

      if (hasActiveSubscription) {
        canViewPremium = true
        viewsLeft = -1 // unlimited
      } else if (user.freeViewsUsed < FREE_VIEWS_LIMIT) {
        canViewPremium = true
        viewsLeft = FREE_VIEWS_LIMIT - user.freeViewsUsed
      } else {
        canViewPremium = false
        viewsLeft = 0
      }
    }
  }

  // Сначала ищем в таблице Ad
  const ad = await prisma.ad.findUnique({
    where: { id },
    include: {
      city: true,
      category: true,
      images: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  // Если не найдено в Ad, ищем в RawMessage (Telegram карточки)
  let telegramCard = null
  let enrichedData: EnrichedData | null = null

  if (!ad) {
    telegramCard = await prisma.rawMessage.findUnique({
      where: { id },
      include: { source: true }
    })

    if (!telegramCard || !telegramCard.enrichedData || telegramCard.moderationStatus !== 'approved') {
      notFound()
    }

    try {
      enrichedData = JSON.parse(telegramCard.enrichedData) as EnrichedData
    } catch {
      notFound()
    }

    // Увеличиваем счётчик бесплатных просмотров для Telegram карточек
    if (user && canViewPremium && !user.hasSubscription && user.freeViewsUsed < FREE_VIEWS_LIMIT) {
      await prisma.user.update({
        where: { id: user.id },
        data: { freeViewsUsed: { increment: 1 } },
      })
      viewsLeft = viewsLeft - 1
    }
  }

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return 'Договорная'
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽'
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date))
  }

  // Компонент пейвола
  const PaywallBlock = ({ viewsLeft }: { viewsLeft: number }) => (
    <div className="relative">
      <div className="blur-sm select-none pointer-events-none">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full" />
          <div>
            <div className="h-4 w-24 bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-700 rounded mt-2" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-12 bg-green-900/50 rounded-xl" />
          <div className="h-12 bg-sky-900/50 rounded-xl" />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-[2px] rounded-xl">
        <svg className="w-10 h-10 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {session ? (
          <>
            <p className="text-gray-400 text-sm text-center mb-2 px-4">
              Бесплатные просмотры исчерпаны
            </p>
            <p className="text-gray-500 text-xs text-center mb-4 px-4">
              Использовано {FREE_VIEWS_LIMIT} из {FREE_VIEWS_LIMIT}
            </p>
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center mb-4 px-4">
            Войдите, чтобы увидеть контакты
          </p>
        )}
        <Link
          href={session ? "/pricing" : "/auth/login"}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg"
        >
          {session ? "Оформить подписку" : "Войти"}
        </Link>
        {!session && (
          <Link
            href="/auth/register"
            className="mt-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Регистрация — 10 бесплатных просмотров
          </Link>
        )}
      </div>
    </div>
  )

  // Рендер для Telegram карточки
  if (telegramCard && enrichedData) {
    const contacts = {
      phone: enrichedData.phone || telegramCard.aiPhone || telegramCard.senderPhone,
      username: enrichedData.username || telegramCard.senderUsername,
      name: enrichedData.contactName || telegramCard.senderName,
    }
    const hasContacts = contacts.phone || contacts.username
    const sourceName = telegramCard.source?.name || 'Telegram'

    return (
      <div className="min-h-screen bg-gray-950">
        <Header />

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Views left indicator */}
          {session && viewsLeft > 0 && viewsLeft <= 5 && (
            <div className="mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
              Осталось бесплатных просмотров: {viewsLeft}
            </div>
          )}

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              Главная
            </Link>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/?tab=telegram" className="text-gray-400 hover:text-white transition-colors">
              Telegram
            </Link>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white font-medium truncate max-w-[200px]">{enrichedData.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Media */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden border border-white/10">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  {telegramCard.mediaUrl && telegramCard.mediaType === 'photo' ? (
                    <img
                      src={telegramCard.mediaUrl}
                      alt={enrichedData.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-500 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm">Фото отсутствует</span>
                    </div>
                  )}
                </div>

                {/* Download buttons - only for premium users */}
                {telegramCard.mediaUrl && canViewPremium && (
                  <div className="p-4 border-t border-white/10">
                    <a
                      href={telegramCard.mediaUrl}
                      download={telegramCard.mediaFileName || 'file'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {telegramCard.mediaType === 'photo' ? 'Скачать фото' : `Скачать: ${telegramCard.mediaFileName || 'файл'}`}
                    </a>
                  </div>
                )}
              </div>

              {/* Title and Badges */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-white/10">
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  {enrichedData.type === 'request' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Куплю
                    </span>
                  )}
                  {enrichedData.type === 'offer' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Продам
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 text-sky-400 text-sm font-medium rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                    </svg>
                    Telegram
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{enrichedData.title}</h1>

                <div className="text-3xl sm:text-4xl font-bold text-blue-400">
                  {formatPrice(enrichedData.price)}
                </div>
              </div>

              {/* Description */}
              {enrichedData.description && (
                <div className="bg-gray-900 rounded-2xl p-6 border border-white/10">
                  <h2 className="text-lg font-semibold text-white mb-4">Описание</h2>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{enrichedData.description}</p>
                </div>
              )}

              {/* Original Message - PREMIUM ONLY */}
              {telegramCard.text && (
                <div className="bg-gray-900 rounded-2xl p-6 border border-white/10">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                    </svg>
                    Оригинальное сообщение
                  </h2>
                  {canViewPremium ? (
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                      <p className="text-gray-400 whitespace-pre-wrap text-sm leading-relaxed">{telegramCard.text}</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5 blur-sm select-none">
                        <p className="text-gray-400 whitespace-pre-wrap text-sm leading-relaxed">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt...
                        </p>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Link
                          href={session ? "/pricing" : "/auth/login"}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          {session ? "Доступно по подписке" : "Войдите для просмотра"}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Details */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-semibold text-white mb-4">Детали</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-gray-500">Категория</span>
                    <p className="font-medium text-white mt-1">{enrichedData.category || 'Не указана'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Источник</span>
                    {canViewPremium ? (
                      <p className="font-medium text-white mt-1">{sourceName}</p>
                    ) : (
                      <p className="font-medium text-gray-500 mt-1 blur-sm select-none">Скрыто</p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Дата публикации</span>
                    <p className="font-medium text-white mt-1">{formatDate(telegramCard.date)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Тип объявления</span>
                    <p className="font-medium text-white mt-1">
                      {enrichedData.type === 'request' ? 'Заявка на покупку' : 'Предложение'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-white/10 sticky top-24">
                <h3 className="text-lg font-semibold text-white mb-4">Контакты</h3>

                {canViewPremium ? (
                  // Premium user - show contacts
                  <>
                    {contacts.name && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                          {contacts.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{contacts.name}</p>
                          <p className="text-sm text-gray-400">Контакт</p>
                        </div>
                      </div>
                    )}

                    {hasContacts ? (
                      <div className="space-y-3">
                        {contacts.phone && (
                          <a
                            href={`tel:${contacts.phone}`}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {contacts.phone}
                          </a>
                        )}
                        {contacts.username && (
                          <a
                            href={`https://t.me/${contacts.username.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 w-full px-4 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                            </svg>
                            Написать в Telegram
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Контактная информация отсутствует</p>
                    )}
                  </>
                ) : (
                  // Not premium - show paywall
                  <PaywallBlock viewsLeft={viewsLeft} />
                )}
              </div>

              {/* Safety Tips */}
              <div className="bg-amber-500/10 rounded-2xl p-5 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-amber-300 mb-1">Советы безопасности</h4>
                    <ul className="text-sm text-amber-200/70 space-y-1">
                      <li>• Проверяйте товар перед оплатой</li>
                      <li>• Не переводите предоплату</li>
                      <li>• Встречайтесь в безопасных местах</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8">
            <Link
              href="/?tab=telegram"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Вернуться к списку
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Рендер для обычной карточки из Ad (не Telegram)
  // Если дошли сюда - ad точно существует (иначе бы был telegramCard или notFound)
  if (!ad) {
    notFound()
  }

  const contacts = {
    phone: ad.contactPhone || ad.user?.phone,
    username: ad.contactUsername,
    name: ad.contactName || ad.user?.name,
  }

  const hasContacts = contacts.phone || contacts.username

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
            Главная
          </Link>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/?category=${ad.category.slug}`} className="text-gray-500 hover:text-gray-900 transition-colors">
            {ad.category.name}
          </Link>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{ad.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                {ad.images.length > 0 ? (
                  <img
                    src={ad.images[0].url}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-gray-200/80 flex items-center justify-center mb-3">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm">Фото отсутствует</span>
                  </div>
                )}
              </div>

              {/* Image Gallery Thumbnails */}
              {ad.images.length > 1 && (
                <div className="p-4 flex gap-3 overflow-x-auto">
                  {ad.images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 cursor-pointer transition-all ${
                        index === 0 ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`${ad.title} - фото ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title and Badges */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-start gap-3 mb-4">
                {ad.type === 'request' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Куплю
                  </span>
                )}
                {ad.type === 'offer' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Продам
                  </span>
                )}
                {ad.isVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Проверено
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{ad.title}</h1>

              <div className="text-3xl sm:text-4xl font-bold text-blue-600">
                {formatPrice(ad.price)}
              </div>
            </div>

            {/* Description */}
            {ad.description && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Описание</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ad.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Детали</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-sm text-gray-500">Город</span>
                  <p className="font-medium text-gray-900 mt-1">{ad.city.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Категория</span>
                  <p className="font-medium text-gray-900 mt-1">{ad.category.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Дата публикации</span>
                  <p className="font-medium text-gray-900 mt-1">{formatDate(ad.createdAt)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Источник</span>
                  <p className="font-medium text-gray-900 mt-1">Сайт</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Контакты продавца</h3>

              {session ? (
                // Authorized - show contacts
                <>
                  {contacts.name && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white text-lg font-medium">
                        {contacts.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contacts.name}</p>
                        <p className="text-sm text-gray-500">Продавец</p>
                      </div>
                    </div>
                  )}

                  {hasContacts ? (
                    <div className="space-y-3">
                      {contacts.phone && (
                        <a
                          href={`tel:${contacts.phone}`}
                          className="flex items-center gap-3 w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {contacts.phone}
                        </a>
                      )}
                      {contacts.username && (
                        <a
                          href={`https://t.me/${contacts.username.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 w-full px-4 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                          </svg>
                          Написать в Telegram
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Контактная информация отсутствует</p>
                  )}
                </>
              ) : (
                // Not authorized - show blurred contacts with CTA
                <div className="relative">
                  <div className="blur-sm select-none pointer-events-none">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full" />
                      <div>
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                        <div className="h-3 w-16 bg-gray-200 rounded mt-2" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-12 bg-green-200 rounded-xl" />
                      <div className="h-12 bg-sky-200 rounded-xl" />
                    </div>
                  </div>

                  {/* Overlay CTA */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-xl">
                    <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-gray-600 text-sm text-center mb-4 px-4">
                      Войдите, чтобы увидеть контакты продавца
                    </p>
                    <Link
                      href="/auth/login"
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
                    >
                      Войти
                    </Link>
                    <Link
                      href="/auth/register"
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Нет аккаунта? Зарегистрируйтесь
                    </Link>
                  </div>
                </div>
              )}

              {/* Source Link */}
              {ad.sourceUrl && session && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <a
                    href={ad.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Источник объявления
                  </a>
                </div>
              )}
            </div>

            {/* Safety Tips */}
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-amber-900 mb-1">Советы безопасности</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Проверяйте товар перед оплатой</li>
                    <li>• Не переводите предоплату</li>
                    <li>• Встречайтесь в безопасных местах</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Вернуться к списку
          </Link>
        </div>
      </main>
    </div>
  )
}
