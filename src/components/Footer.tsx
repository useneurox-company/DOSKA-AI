import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Лого и описание */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg shadow-blue-500/30 overflow-hidden flex items-center justify-center p-1.5">
                <img
                  src="/logo.png"
                  alt="doska.ai"
                  className="w-full h-full object-contain brightness-150"
                />
              </div>
              <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                doska<span className="text-blue-500">.ai</span>
              </span>
            </Link>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              B2B площадка стройматериалов с ИИ. Объединяем поставщиков и покупателей.
            </p>
          </div>

          {/* О сервисе */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>О сервисе</h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><Link href="/about" className="hover:opacity-80 transition-opacity">О нас</Link></li>
              <li><Link href="/pricing" className="hover:opacity-80 transition-opacity">Тарифы</Link></li>
              <li><Link href="/contacts" className="hover:opacity-80 transition-opacity">Контакты</Link></li>
            </ul>
          </div>

          {/* Документы */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Документы</h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><Link href="/terms" className="hover:opacity-80 transition-opacity">Договор оферты</Link></li>
              <li><Link href="/privacy" className="hover:opacity-80 transition-opacity">Политика конфиденциальности</Link></li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Связаться</h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <a href="mailto:info@doska.ai" className="hover:opacity-80 transition-opacity flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  info@doska.ai
                </a>
              </li>
              <li>
                <a href="https://t.me/doskaai" className="hover:opacity-80 transition-opacity flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.155.233.17.358.015.124.034.357.019.548z"/>
                  </svg>
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 pt-6 text-center text-sm"
          style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-secondary)', opacity: 0.7 }}
        >
          © 2024 doska.ai. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
