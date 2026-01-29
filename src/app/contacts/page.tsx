import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ContactsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Контакты</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <a
            href="mailto:info@doska.ai"
            className="p-6 rounded-2xl bg-gray-800/50 border border-white/10 hover:border-blue-500/30 transition-colors group"
          >
            <div className="w-12 h-12 mb-4 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Email</h3>
            <p className="text-blue-400">info@doska.ai</p>
            <p className="text-white/50 text-sm mt-2">Для общих вопросов и поддержки</p>
          </a>

          {/* Telegram */}
          <a
            href="https://t.me/doskaai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-2xl bg-gray-800/50 border border-white/10 hover:border-sky-500/30 transition-colors group"
          >
            <div className="w-12 h-12 mb-4 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/30 transition-colors">
              <svg className="w-6 h-6 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Telegram</h3>
            <p className="text-sky-400">@doskaai</p>
            <p className="text-white/50 text-sm mt-2">Быстрые ответы и новости</p>
          </a>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Частые вопросы</h2>
          <div className="space-y-4">
            <details className="group p-4 rounded-xl bg-gray-800/50 border border-white/10">
              <summary className="font-medium text-white cursor-pointer list-none flex items-center justify-between">
                Как оформить подписку?
                <svg className="w-5 h-5 text-white/50 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-white/60 text-sm">
                Зарегистрируйтесь на сайте, перейдите в раздел «Тарифы», выберите подходящий план и оплатите
                банковской картой или через СБП.
              </p>
            </details>

            <details className="group p-4 rounded-xl bg-gray-800/50 border border-white/10">
              <summary className="font-medium text-white cursor-pointer list-none flex items-center justify-between">
                Как вернуть деньги?
                <svg className="w-5 h-5 text-white/50 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-white/60 text-sm">
                Возврат возможен в течение 7 дней с момента оплаты, если услуга не была использована.
                Напишите на info@doska.ai с темой «Возврат».
              </p>
            </details>

            <details className="group p-4 rounded-xl bg-gray-800/50 border border-white/10">
              <summary className="font-medium text-white cursor-pointer list-none flex items-center justify-between">
                Откуда берутся объявления?
                <svg className="w-5 h-5 text-white/50 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-white/60 text-sm">
                Мы агрегируем объявления из Telegram-каналов по стройматериалам, других досок объявлений,
                а также от пользователей, которые размещают напрямую на нашей площадке. Контакты поставщиков
                (прямые размещения) доступны бесплатно, для Telegram — 10 бесплатных просмотров.
              </p>
            </details>

            <details className="group p-4 rounded-xl bg-gray-800/50 border border-white/10">
              <summary className="font-medium text-white cursor-pointer list-none flex items-center justify-between">
                Вы гарантируете качество товаров?
                <svg className="w-5 h-5 text-white/50 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-white/60 text-sm">
                Нет, мы информационная площадка и не являемся стороной сделок. Рекомендуем самостоятельно
                проверять поставщиков перед заключением договоров.
              </p>
            </details>
          </div>
        </div>

        {/* Время работы */}
        <div className="mt-12 p-6 rounded-2xl bg-gray-800/50 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Время работы поддержки</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/50">Пн-Пт</p>
              <p className="text-white">09:00 — 18:00 (МСК)</p>
            </div>
            <div>
              <p className="text-white/50">Сб-Вс</p>
              <p className="text-white">Выходной</p>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-4">
            Telegram-бот отвечает круглосуточно на типовые вопросы.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
