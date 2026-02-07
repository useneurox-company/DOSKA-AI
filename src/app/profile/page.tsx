'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface Ad {
  id: string
  title: string
  price: number
  createdAt: string
  isVerified: boolean
  city: { name: string }
  category: { name: string }
  images: { url: string }[]
  views: number
  responses: number
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  createdAt: string
  ads: Ad[]
  freeViewsUsed: number
  hasSubscription: boolean
  subscriptionEnd: string | null
}

type TabType = 'ads' | 'settings' | 'subscription'

// Хук для анимации счётчика
function useCountUp(end: number, duration: number = 2000, startOnMount: boolean = true) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    if (!startOnMount) return

    const startTime = performance.now()

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function для плавной анимации
      const easeOutExpo = 1 - Math.pow(2, -10 * progress)
      const currentCount = Math.floor(easeOutExpo * end)

      setCount(currentCount)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(updateCount)
      } else {
        setCount(end)
      }
    }

    const timer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(updateCount)
    }, 300)

    return () => {
      clearTimeout(timer)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration, startOnMount])

  return count
}

// Компонент карточки статистики
function StatCard({
  value,
  label,
  icon,
  gradient,
  lightBg,
  delay = 0,
  isText = false
}: {
  value: number | string
  label: string
  icon: React.ReactNode
  gradient: string
  lightBg: string
  delay?: number
  isText?: boolean
}) {
  const [isVisible, setIsVisible] = useState(false)
  const numericValue = typeof value === 'number' ? value : 0
  const count = useCountUp(numericValue, 2000, isVisible && !isText)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${lightBg} p-6 group hover:shadow-lg transition-all duration-500 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          {icon}
        </div>
        <div>
          <div className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent tabular-nums`}>
            {isText ? value : count}
          </div>
          <div className="text-gray-500 text-sm">{label}</div>
        </div>
      </div>

      {/* Декоративный элемент */}
      <div className={`absolute -right-4 -bottom-4 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500`} />
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('ads')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Форма редактирования
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.name || '')
        setPhone(data.phone || '')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? { ...prev, ...data } : null)
        setMessage({ type: 'success', text: 'Профиль успешно обновлён' })
      } else {
        setMessage({ type: 'error', text: 'Ошибка при сохранении' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Произошла ошибка' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Удалить это объявление?')) return

    try {
      const res = await fetch(`/api/ads/${adId}`, { method: 'DELETE' })
      if (res.ok) {
        setProfile(prev => prev ? {
          ...prev,
          ads: prev.ads.filter(ad => ad.id !== adId)
        } : null)
      }
    } catch (error) {
      console.error('Error deleting ad:', error)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Можно загружать только изображения' })
      return
    }

    // Проверяем размер (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Максимальный размер файла 5MB' })
      return
    }

    setAvatarUploading(true)
    setMessage({ type: '', text: '' })

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? { ...prev, avatar: data.url } : null)
        setMessage({ type: 'success', text: 'Аватар успешно обновлён' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Ошибка загрузки' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка при загрузке аватара' })
    } finally {
      setAvatarUploading(false)
      // Сбросим input для повторной загрузки того же файла
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Загрузка...</span>
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  const tabs = [
    { id: 'ads' as TabType, label: 'Мои объявления', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )},
    { id: 'settings' as TabType, label: 'Настройки', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'subscription' as TabType, label: 'Подписка', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )},
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Шапка профиля */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
              <div className="flex items-center gap-6">
                {/* Аватар с возможностью загрузки */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative w-20 h-20 rounded-full overflow-hidden group cursor-pointer"
                  title="Нажмите, чтобы изменить аватар"
                >
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Аватар"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl font-bold">
                      {(profile?.name || session.user?.email)?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  {/* Оверлей при наведении */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  {/* Индикатор загрузки */}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white">
                    {profile?.name || 'Пользователь'}
                  </h1>
                  <p className="text-blue-100">{session.user?.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="inline-flex items-center gap-1 text-blue-100 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      На сайте с {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ru') : '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-blue-100 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {profile?.ads.length || 0} объявлений
                    </span>
                  </div>
                </div>
                <Link
                  href="/create"
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Новое объявление
                </Link>
              </div>
            </div>

            {/* Статистика с анимацией */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
              <StatCard
                value={profile?.ads.length || 0}
                label="Объявлений"
                gradient="from-violet-500 to-purple-600"
                lightBg="bg-violet-50"
                delay={0}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
              />
              <StatCard
                value={10 - (profile?.freeViewsUsed || 0)}
                label="Бесплатных просмотров"
                gradient="from-pink-500 to-rose-600"
                lightBg="bg-pink-50"
                delay={150}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              />
              <StatCard
                value={profile?.hasSubscription ? 'PRO' : 'Нет'}
                label="Подписка"
                gradient={profile?.hasSubscription ? "from-emerald-500 to-green-600" : "from-amber-500 to-orange-600"}
                lightBg={profile?.hasSubscription ? "bg-emerald-50" : "bg-amber-50"}
                delay={300}
                isText
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Табы и контент */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Навигация табов */}
            <div className="border-b flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Контент табов */}
            <div className="p-6">
              {/* Мои объявления */}
              {activeTab === 'ads' && (
                <div>
                  {profile?.ads.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">У вас пока нет объявлений</h3>
                      <p className="text-gray-500 mb-6">Создайте своё первое объявление прямо сейчас</p>
                      <Link
                        href="/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Создать объявление
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profile?.ads.map((ad, index) => (
                        <div
                          key={ad.id}
                          className="group relative bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-xl transition-all duration-300"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex gap-4">
                            {/* Изображение с overlay */}
                            <div className="relative w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                              {ad.images[0] ? (
                                <img src={ad.images[0].url} alt={ad.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              {/* Статус badge */}
                              <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium ${
                                ad.isVerified ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                              }`}>
                                {ad.isVerified ? '✓ Активно' : '⏳ На модерации'}
                              </div>
                            </div>

                            {/* Контент */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <Link href={`/ad/${ad.id}`}>
                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {ad.title}
                                    </h3>
                                  </Link>
                                  <p className="text-gray-500 text-sm mt-0.5">
                                    {ad.city.name} · {ad.category.name}
                                  </p>
                                </div>
                                <p className="text-xl font-bold text-blue-600 whitespace-nowrap">
                                  {ad.price.toLocaleString('ru')} ₽
                                </p>
                              </div>

                              {/* Статистика */}
                              <div className="flex items-center gap-6 mt-4">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{ad.views || 0}</p>
                                    <p className="text-xs text-gray-400">просмотров</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{ad.responses || 0}</p>
                                    <p className="text-xs text-gray-400">откликов</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {new Date(ad.createdAt).toLocaleDateString('ru')}
                                </div>
                              </div>
                            </div>

                            {/* Кнопки действий */}
                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                              <Link
                                href={`/ad/${ad.id}/edit`}
                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                title="Редактировать"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => handleDeleteAd(ad.id)}
                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                title="Удалить"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Настройки */}
              {activeTab === 'settings' && (
                <div className="max-w-xl">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Настройки профиля</h2>

                  {/* Секция аватара */}
                  <div className="mb-8 p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                          {profile?.avatar ? (
                            <img
                              src={profile.avatar}
                              alt="Аватар"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                              {(profile?.name || session.user?.email)?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        {avatarUploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Фото профиля</h3>
                        <p className="text-sm text-gray-500 mb-3">JPG, PNG или GIF. Максимум 5MB.</p>
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {avatarUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Загрузить фото
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                      message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {message.type === 'success' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      {message.text}
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Имя
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                        placeholder="Ваше имя"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={session.user?.email || ''}
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-gray-400 text-sm mt-1">Email нельзя изменить</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        'Сохранить изменения'
                      )}
                    </button>
                  </form>

                  <hr className="my-8" />

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Опасная зона</h3>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full px-4 py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Выйти из аккаунта
                    </button>
                  </div>
                </div>
              )}

              {/* Подписка */}
              {activeTab === 'subscription' && (
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Подписка</h2>

                  {/* Текущий статус */}
                  <div className={`p-6 rounded-2xl mb-8 ${
                    profile?.hasSubscription ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        profile?.hasSubscription ? 'bg-green-200' : 'bg-gray-200'
                      }`}>
                        {profile?.hasSubscription ? (
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-semibold ${profile?.hasSubscription ? 'text-green-800' : 'text-gray-700'}`}>
                          {profile?.hasSubscription ? 'Подписка активна' : 'Подписка не активна'}
                        </h3>
                        <p className={profile?.hasSubscription ? 'text-green-600' : 'text-gray-500'}>
                          {profile?.hasSubscription && profile.subscriptionEnd
                            ? `Действует до ${new Date(profile.subscriptionEnd).toLocaleDateString('ru')}`
                            : 'Используется бесплатный тариф'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Тарифы */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Бесплатный */}
                    <div className="border-2 border-gray-200 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Бесплатный</h3>
                      <p className="text-3xl font-bold text-gray-900 mb-4">0 ₽<span className="text-base font-normal text-gray-500">/мес</span></p>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          10 просмотров контактов
                        </li>
                        <li className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Размещение объявлений
                        </li>
                        <li className="flex items-center gap-2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Ограниченный функционал
                        </li>
                      </ul>
                      <button disabled className="w-full py-3 border-2 border-gray-300 text-gray-400 rounded-xl font-medium cursor-not-allowed">
                        Текущий тариф
                      </button>
                    </div>

                    {/* Премиум */}
                    <div className="border-2 border-blue-500 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                        Популярный
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Премиум</h3>
                      <p className="text-3xl font-bold text-gray-900 mb-4">990 ₽<span className="text-base font-normal text-gray-500">/мес</span></p>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Безлимитные просмотры
                        </li>
                        <li className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Приоритет в поиске
                        </li>
                        <li className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Доступ к аналитике
                        </li>
                      </ul>
                      <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all">
                        Оформить подписку
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
