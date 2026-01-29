import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function PricingPage() {
  const plans = [
    {
      period: 'Месяц',
      basePrice: 5000,
      extraCategory: 3500,
      discount: 0,
      popular: false,
    },
    {
      period: '6 месяцев',
      basePrice: 25500,
      extraCategory: 17850,
      discount: 15,
      popular: true,
    },
    {
      period: '12 месяцев',
      basePrice: 42000,
      extraCategory: 29400,
      discount: 30,
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Тарифы</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Выберите подходящий тариф для вашего бизнеса. Чем дольше подписка — тем выгоднее.
          </p>
        </div>

        {/* Бесплатный доступ */}
        <div className="space-y-4 mb-12">
          {/* Поставщики бесплатно */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-xl font-bold text-white">Объявления поставщиков — бесплатно</h2>
                </div>
                <p className="text-white/60">Контакты продавцов, размещённых на нашей площадке, доступны без подписки</p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 font-medium whitespace-nowrap">
                Для всех
              </span>
            </div>
          </div>

          {/* 10 контактов */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <h2 className="text-xl font-bold text-white">10 контактов из Telegram</h2>
                </div>
                <p className="text-white/60">Для новых пользователей — просмотр контактов из агрегированных объявлений</p>
              </div>
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors whitespace-nowrap"
              >
                Получить бесплатно
              </Link>
            </div>
          </div>
        </div>

        {/* Тарифные планы */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.period}
              className={`relative p-6 rounded-2xl border ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-purple-500/30'
                  : 'bg-gray-800/50 border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium">
                  Популярный
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">{plan.period}</h3>
                {plan.discount > 0 && (
                  <span className="inline-block px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium mb-2">
                    Скидка {plan.discount}%
                  </span>
                )}
                <div className="text-3xl font-bold text-white">
                  {plan.basePrice.toLocaleString('ru-RU')} ₽
                </div>
                <p className="text-white/50 text-sm">за 1 категорию</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Безлимитный просмотр контактов
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  30 загрузок файлов/мес
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  До 100 позиций ИИ-анализа
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  ИИ поиск и анализ цен
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/50 mb-4">
                  +{plan.extraCategory.toLocaleString('ru-RU')} ₽ за доп. категорию
                </p>
                <Link
                  href="/register"
                  className={`block w-full py-3 rounded-xl text-center font-medium transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/25'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Выбрать
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Дополнительно */}
        <div className="p-6 rounded-2xl bg-gray-800/50 border border-white/10 mb-12">
          <h3 className="text-lg font-semibold text-white mb-4">Дополнительно</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="font-medium text-white">+30 загрузок файлов</p>
                <p className="text-sm text-white/50">Дополнительный пакет анализа</p>
              </div>
              <span className="text-xl font-bold text-white">1 000 ₽</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="font-medium text-white">Дополнительная категория</p>
                <p className="text-sm text-white/50">К активной подписке</p>
              </div>
              <span className="text-xl font-bold text-white">от 3 500 ₽</span>
            </div>
          </div>
        </div>

        {/* Способы оплаты */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-4">Способы оплаты</h3>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-white/60">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              <span>Банковская карта</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>СБП</span>
            </div>
          </div>
          <p className="text-sm text-white/40 mt-4">
            Возврат средств в течение 7 дней, если услуга не была использована
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
