'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { data: session, status } = useSession()
  const loading = status === 'loading'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50">
      <div
        className="relative backdrop-blur-xl"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
          boxShadow: '0 4px 6px -1px var(--shadow-color)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow overflow-hidden flex items-center justify-center p-1.5">
              <img
                src="/logo.png"
                alt="doska.ai"
                className="w-full h-full object-contain brightness-150"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              doska<span className="text-blue-500">.ai</span>
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {loading ? (
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--input-bg)' }} />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors"
                  style={{ border: '1px solid var(--card-border)' }}
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl py-2 z-20"
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)'
                      }}
                    >
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {session.user?.name || 'Пользователь'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {session.user?.email}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-blue-500/10"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Личный кабинет
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-5 py-2.5 text-sm font-medium rounded-full backdrop-blur-sm transition-all"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--card-border)'
                  }}
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="px-5 py-2.5 text-sm font-medium rounded-full backdrop-blur-sm transition-all"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--card-border)'
                  }}
                >
                  Регистрация
                </Link>
              </>
            )}
            <Link
              href="/create"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-full hover:from-blue-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/25"
            >
              Разместить
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
