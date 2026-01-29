import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-500/30 overflow-hidden flex items-center justify-center p-3">
            <img
              src="/logo.png"
              alt="doska.ai"
              className="w-full h-full object-contain brightness-150"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            doska<span className="text-blue-400">.ai</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            B2B площадка стройматериалов с искусственным интеллектом.
            Объединяем поставщиков и покупателей со всей России.
          </p>
        </div>

        {/* Преимущества */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-gray-800/50 border border-white/10">
            <div className="w-12 h-12 mb-4 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Вся Россия</h3>
            <p className="text-white/60 text-sm">
              Агрегируем объявления из Telegram-каналов, досок объявлений и прямых размещений по всей стране.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-800/50 border border-white/10">
            <div className="w-12 h-12 mb-4 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">ИИ-анализ</h3>
            <p className="text-white/60 text-sm">
              Загрузите смету или прайс — ИИ разберёт до 100 позиций и подберёт лучших поставщиков.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-800/50 border border-white/10">
            <div className="w-12 h-12 mb-4 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Экономия</h3>
            <p className="text-white/60 text-sm">
              Сравнивайте цены, находите выгодные предложения и экономьте на закупках стройматериалов.
            </p>
          </div>
        </div>

        {/* Как работает */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Как это работает</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Регистрация</h3>
                <p className="text-white/60">Создайте аккаунт и получите 5 бесплатных просмотров контактов.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Поиск</h3>
                <p className="text-white/60">Ищите товары по категориям, городам и ценам. Или загрузите смету — ИИ найдёт всё сам.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Связь</h3>
                <p className="text-white/60">Получите контакты поставщика и свяжитесь напрямую для заключения сделки.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-8 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">Готовы начать?</h2>
          <p className="text-white/60 mb-6">Объявления поставщиков бесплатны + 10 контактов из Telegram</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              Тарифы
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
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
