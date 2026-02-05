'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface City {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ImageFile {
  file?: File
  preview: string
  url?: string
  isExisting?: boolean
}

interface Ad {
  id: string
  title: string
  description: string | null
  price: number
  cityId: string
  categoryId: string
  userId: string | null
  city: { id: string; name: string }
  category: { id: string; name: string }
  images: { id: string; url: string }[]
}

export default function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAd, setLoadingAd] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [cityId, setCityId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  // Изображения
  const [images, setImages] = useState<ImageFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)

  // Загрузка данных объявления
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch(`/api/ads/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Объявление не найдено')
          } else {
            setError('Ошибка загрузки объявления')
          }
          return
        }

        const ad: Ad = await res.json()

        // Проверяем права на редактирование
        if (session?.user?.id && ad.userId !== session.user.id) {
          setError('У вас нет прав на редактирование этого объявления')
          return
        }

        setTitle(ad.title)
        setDescription(ad.description || '')
        setPrice(ad.price.toString())
        setCityId(ad.cityId)
        setCategoryId(ad.categoryId)

        // Загружаем существующие изображения
        setImages(ad.images.map(img => ({
          preview: img.url,
          url: img.url,
          isExisting: true
        })))
      } catch {
        setError('Ошибка при загрузке объявления')
      } finally {
        setLoadingAd(false)
      }
    }

    if (session?.user) {
      fetchAd()
    }
  }, [id, session?.user])

  // Загрузка городов и категорий
  useEffect(() => {
    fetch('/api/cities')
      .then((res) => res.json())
      .then((data) => setCities(data))
      .catch(console.error)

    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch(console.error)
  }, [])

  // Очистка превью при размонтировании
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (!img.isExisting && img.preview) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [images])

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return

    const newImages: ImageFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, 5 - images.length)
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        isExisting: false
      }))

    setImages(prev => [...prev, ...newImages].slice(0, 5))
  }, [images.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleImageUpload(e.dataTransfer.files)
  }, [handleImageUpload])

  const removeImage = (index: number) => {
    setImages(prev => {
      const img = prev[index]
      if (!img.isExisting && img.preview) {
        URL.revokeObjectURL(img.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  if (status === 'loading' || loadingAd) {
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

  if (!session) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Требуется авторизация
            </h1>
            <p className="text-gray-500 mb-6">
              Для редактирования объявления необходимо войти в аккаунт
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105"
            >
              Войти в аккаунт
            </Link>
          </div>
        </div>
      </>
    )
  }

  if (error && !title) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{error}</h1>
            <Link
              href="/profile"
              className="inline-block mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Вернуться в профиль
            </Link>
          </div>
        </div>
      </>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Загружаем новые изображения
      const newImages = images.filter(img => !img.isExisting && img.file)
      let newImageUrls: string[] = []

      if (newImages.length > 0) {
        setUploadingImages(true)
        const formData = new FormData()
        newImages.forEach(img => {
          if (img.file) formData.append('images', img.file)
        })

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const data = await uploadRes.json()
          throw new Error(data.error || 'Ошибка загрузки изображений')
        }

        const uploadData = await uploadRes.json()
        newImageUrls = uploadData.urls
        setUploadingImages(false)
      }

      // Собираем все URL изображений (существующие + новые)
      const existingUrls = images.filter(img => img.isExisting).map(img => img.url!)
      const allImageUrls = [...existingUrls, ...newImageUrls]

      // Обновляем объявление
      const res = await fetch(`/api/ads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: parseInt(price),
          cityId,
          categoryId,
          images: allImageUrls,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка при обновлении объявления')
        return
      }

      setSuccess('Объявление успешно обновлено!')
      setTimeout(() => {
        router.push(`/ad/${id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Хлебные крошки */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-blue-600 transition-colors">Главная</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/profile" className="hover:text-blue-600 transition-colors">Профиль</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900">Редактирование</span>
          </nav>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Заголовок */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <h1 className="text-2xl font-bold text-white">Редактирование объявления</h1>
              <p className="text-blue-100 mt-1">Измените информацию о вашем товаре</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              {/* Загрузка фото */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Фотографии <span className="text-gray-400 font-normal">(до 5 штук)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    dragOver
                      ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  } ${images.length >= 5 ? 'opacity-50 pointer-events-none' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="photo-upload"
                    disabled={images.length >= 5}
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center transition-transform hover:scale-110">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">
                      {images.length >= 5 ? 'Максимум 5 фото' : 'Перетащите фото сюда'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">или нажмите для выбора</p>
                  </label>
                </div>

                {/* Превью загруженных фото */}
                {images.length > 0 && (
                  <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative group flex-shrink-0 animate-fadeIn"
                      >
                        <img
                          src={img.preview}
                          alt={`Фото ${i + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                        />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                            Главное
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* Кнопка добавления ещё */}
                    {images.length < 5 && (
                      <label
                        htmlFor="photo-upload"
                        className="w-24 h-24 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Заголовок */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Заголовок <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  placeholder="Например: Труба профильная 60x40 б/у"
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none"
                  placeholder="Подробное описание товара: состояние, размеры, количество..."
                />
              </div>

              {/* Цена и категория */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цена (₽) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none pr-12"
                      placeholder="0"
                      min="0"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Категория <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none bg-white appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Город */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Город <span className="text-red-500">*</span>
                </label>
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none bg-white appearance-none cursor-pointer"
                  required
                >
                  <option value="">Выберите город</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Кнопки */}
              <div className="pt-4 flex gap-4">
                <Link
                  href="/profile"
                  className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-center"
                >
                  Отмена
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{uploadingImages ? 'Загрузка фото...' : 'Сохранение...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Сохранить изменения</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
