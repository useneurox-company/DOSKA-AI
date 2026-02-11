'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface City {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ParsedItem {
  rowNumber: number
  nomenclature: string
  quantity?: number
  unit?: string
  price?: number
  size?: string
  grade?: string
  categoryId: string
  categoryName: string
  selected: boolean
}

type Step = 'form' | 'parsing' | 'preview' | 'success'

interface UploadModalProps {
  onClose: () => void
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  // State
  const [step, setStep] = useState<Step>('form')
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [cityId, setCityId] = useState('')
  const [adType, setAdType] = useState<'offer' | 'request'>('request')
  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<ParsedItem[]>([])
  const [parsingStatus, setParsingStatus] = useState('')
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [createdAdId, setCreatedAdId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])

  // Load cities and categories
  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(setCities).catch(() => {})
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  // Pre-fill from profile if logged in
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/profile')
        .then(r => r.json())
        .then(profile => {
          if (profile.name && !contactName) setContactName(profile.name)
          if (profile.phone && !contactPhone) setContactPhone(profile.phone)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // File handling
  const handleFile = useCallback((f: File) => {
    const allowed = /\.(xlsx|xls|csv|pdf|doc|docx|jpg|jpeg|png|webp)$/i
    if (!allowed.test(f.name)) {
      setError('Неподдерживаемый формат файла')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 20МБ)')
      return
    }
    setFile(f)
    setError('')
  }, [])

  // Photo handling
  const addPhotos = useCallback((files: FileList | File[]) => {
    const newPhotos: File[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      if (f.size > 10 * 1024 * 1024) continue
      newPhotos.push(f)
    }
    setPhotos(prev => {
      const combined = [...prev, ...newPhotos].slice(0, 5)
      // Generate preview URLs
      const urls = combined.map(f => URL.createObjectURL(f))
      // Revoke old URLs
      photoPreviewUrls.forEach(u => URL.revokeObjectURL(u))
      setPhotoPreviewUrls(urls)
      return combined
    })
  }, [photoPreviewUrls])

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index)
      URL.revokeObjectURL(photoPreviewUrls[index])
      setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index))
      return updated
    })
  }, [photoPreviewUrls])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // Validate form
  const isFormValid = () => {
    if (!contactName.trim() || !contactPhone.trim() || !cityId) return false
    // Need at least a file OR text with 5+ chars
    if (!file && textInput.trim().length < 5) return false
    return true
  }

  // Parse
  const startParsing = async () => {
    if (!isFormValid()) {
      setError('Заполните все обязательные поля')
      return
    }

    setStep('parsing')
    setError('')

    try {
      let parseData: { success: boolean; items: Record<string, unknown>[]; warnings?: string[]; error?: string }

      if (file) {
        // Parse file (primary)
        setParsingStatus('Анализируем файл...')
        const formData = new FormData()
        formData.append('file', file)
        const parseRes = await fetch('/api/upload-parse', { method: 'POST', body: formData })
        parseData = await parseRes.json()
      } else {
        // Parse text (fallback when no file)
        setParsingStatus('Анализируем текст...')
        const parseRes = await fetch('/api/parse-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput }),
        })
        parseData = await parseRes.json()
      }

      if (!parseData.success || !parseData.items?.length) {
        setError(parseData.error || 'Не удалось извлечь позиции')
        setWarnings(parseData.warnings || [])
        setStep('form')
        return
      }

      if (parseData.warnings) setWarnings(parseData.warnings as string[])

      // Categorize items
      setParsingStatus('Определяем категории...')
      const catRes = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parseData.items }),
      })
      const catData = await catRes.json()

      const assignments = catData.assignments || []
      const assignmentMap = new Map(assignments.map((a: { itemIndex: number; categoryId: string; categoryName: string }) => [a.itemIndex, a]))

      const defaultCat = categories[0]
      const parsedItems: ParsedItem[] = parseData.items.map((item: Record<string, unknown>, index: number) => {
        const assignment = assignmentMap.get(index) as { categoryId: string; categoryName: string } | undefined
        return {
          rowNumber: index + 1,
          nomenclature: (item.nomenclature as string) || 'Без названия',
          quantity: item.quantity as number | undefined,
          unit: item.unit as string | undefined,
          price: item.price as number | undefined,
          size: item.size as string | undefined,
          grade: item.grade as string | undefined,
          categoryId: assignment?.categoryId || defaultCat?.id || '',
          categoryName: assignment?.categoryName || defaultCat?.name || '',
          selected: true,
        }
      })

      setItems(parsedItems)
      setStep('preview')
    } catch (err) {
      console.error('Parsing error:', err)
      setError('Ошибка при обработке')
      setStep('form')
    }
  }

  // Update item field
  const updateItem = (index: number, field: string, value: unknown) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      if (field === 'categoryId') {
        const cat = categories.find(c => c.id === value)
        return { ...item, categoryId: value as string, categoryName: cat?.name || '' }
      }
      return { ...item, [field]: value }
    }))
  }

  const toggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item))
  }

  const toggleAll = () => {
    const allSelected = items.every(i => i.selected)
    setItems(prev => prev.map(item => ({ ...item, selected: !allSelected })))
  }

  // Publish
  const publish = async () => {
    const selected = items.filter(i => i.selected)
    if (selected.length === 0) {
      setError('Выберите хотя бы одну позицию')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const uniqueNames = [...new Set(selected.map(i => i.nomenclature))]
      let title: string
      if (uniqueNames.length <= 3) {
        title = uniqueNames.join(', ')
      } else {
        title = `${uniqueNames.slice(0, 3).join(', ')} и ещё ${uniqueNames.length - 3} поз.`
      }

      let description = selected.map(i => {
        const parts = [i.nomenclature]
        if (i.size) parts.push(i.size)
        if (i.grade) parts.push(i.grade)
        if (i.quantity) parts.push(`${i.quantity} ${i.unit || 'шт'}`)
        if (i.price) parts.push(`${i.price.toLocaleString('ru-RU')} ₽`)
        return `• ${parts.join(' — ')}`
      }).join('\n')

      // Append optional text as a comment if file was uploaded
      if (file && textInput.trim()) {
        description = `${textInput.trim()}\n\n${description}`
      }

      const categoryCounts = new Map<string, number>()
      selected.forEach(i => categoryCounts.set(i.categoryId, (categoryCounts.get(i.categoryId) || 0) + 1))
      const mainCategoryId = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || categories[0]?.id

      const itemsJson = selected.map(i => ({
        nomenclature: i.nomenclature,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        size: i.size,
        grade: i.grade,
        categoryName: i.categoryName,
      }))

      // Upload photos if any
      let imageUrls: string[] = []
      if (photos.length > 0) {
        const formData = new FormData()
        photos.forEach(p => formData.append('images', p))
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData.urls) {
          imageUrls = uploadData.urls
        }
      }

      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: 0,
          cityId,
          categoryId: mainCategoryId,
          type: adType,
          items: itemsJson,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          address: address.trim() || undefined,
          images: imageUrls.length > 0 ? imageUrls : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ошибка создания объявления')
        return
      }

      setCreatedAdId(data.id)
      setStep('success')
    } catch (err) {
      console.error('Publish error:', err)
      setError('Ошибка при публикации')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = items.filter(i => i.selected).length
  const cityName = cities.find(c => c.id === cityId)?.name || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {step === 'form' && 'Создать заявку'}
            {step === 'parsing' && 'Анализ данных'}
            {step === 'preview' && 'Предпросмотр позиций'}
            {step === 'success' && 'Готово!'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-500/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: FORM */}
          {step === 'form' && (
            <div className="space-y-4">
              {/* Contact fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Имя *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Телефон или Telegram *</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+7... или @username"
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* City + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Город *</label>
                  <select
                    value={cityId}
                    onChange={e => setCityId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Выберите город</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Адрес доставки</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Улица, дом, корпус..."
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Тип</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAdType('request')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      adType === 'request' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:bg-gray-500/10'
                    }`}
                    style={adType !== 'request' ? { border: '1px solid var(--card-border)' } : {}}
                  >
                    Куплю
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdType('offer')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      adType === 'offer' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-500/10'
                    }`}
                    style={adType !== 'offer' ? { border: '1px solid var(--card-border)' } : {}}
                  >
                    Продам
                  </button>
                </div>
              </div>

              {/* File upload (primary) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Загрузите файл (КП, смета, фото) {!file && !textInput.trim() && '*'}
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-blue-500 bg-blue-500/10' : file ? 'border-green-500/50 bg-green-500/5' : 'border-gray-600/30 hover:border-blue-500/50'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-left">
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {(file.size / 1024 / 1024).toFixed(1)} МБ
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setFile(null) }}
                        className="ml-2 p-1 rounded-lg hover:bg-red-500/10 text-red-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        Перетащите файл или нажмите
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Excel, PDF, Word, CSV или фото (до 20МБ)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Description / text input (optional if file, required if no file) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {file ? 'Комментарий к заявке' : 'Описание (что нужно купить/продать) *'}
                  {file && <span className="text-gray-500 font-normal"> (необязательно)</span>}
                </label>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={adType === 'request'
                    ? 'Например: Нужна арматура 12мм 10 тонн А500С, труба профильная 60x40x3 200 шт'
                    : 'Например: Продаём арматуру А500С 12-32мм, трубу профильную 40x20 - 100x100'}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', minHeight: file ? '80px' : '120px' }}
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Фотографии <span className="text-gray-500 font-normal">(необязательно, до 5 шт.)</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] mt-0.5">Фото</span>
                    </button>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={e => { if (e.target.files) addPhotos(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  {warnings.map((w, i) => <p key={i} className="text-sm text-amber-400">{w}</p>)}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP: PARSING */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6" />
              <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{parsingStatus}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Это может занять несколько секунд</p>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Contact info summary */}
              <div className="flex flex-wrap gap-4 p-4 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{contactName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{contactPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cityName}</span>
                </div>
                {address && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{address}</span>
                  </div>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                  adType === 'request' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {adType === 'request' ? 'Куплю' : 'Продам'}
                </span>
              </div>

              {/* Photo previews */}
              {photoPreviewUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photoPreviewUrls.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                  ))}
                  <span className="text-xs self-center ml-1" style={{ color: 'var(--text-secondary)' }}>
                    {photos.length} фото
                  </span>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Найдено <span className="font-bold text-blue-500">{items.length}</span> позиций
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                >
                  {items.every(i => i.selected) ? 'Снять все' : 'Выбрать все'}
                </button>
              </div>

              {/* Items table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--input-bg)' }}>
                        <th className="px-3 py-2.5 text-left w-8">
                          <input type="checkbox" checked={items.every(i => i.selected)} onChange={toggleAll} className="rounded" />
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Наименование</th>
                        <th className="px-3 py-2.5 text-left font-medium w-20" style={{ color: 'var(--text-secondary)' }}>Кол-во</th>
                        <th className="px-3 py-2.5 text-left font-medium w-24" style={{ color: 'var(--text-secondary)' }}>Цена</th>
                        <th className="px-3 py-2.5 text-left font-medium w-20" style={{ color: 'var(--text-secondary)' }}>Размер</th>
                        <th className="px-3 py-2.5 text-left font-medium w-20" style={{ color: 'var(--text-secondary)' }}>Марка</th>
                        <th className="px-3 py-2.5 text-left font-medium w-36" style={{ color: 'var(--text-secondary)' }}>Категория</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={index}
                          className={`transition-colors ${item.selected ? '' : 'opacity-40'}`}
                          style={{ borderTop: '1px solid var(--card-border)' }}
                        >
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={item.selected} onChange={() => toggleItem(index)} className="rounded" />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.nomenclature}
                              onChange={e => updateItem(index, 'nomenclature', e.target.value)}
                              className="w-full bg-transparent focus:outline-none focus:bg-blue-500/5 px-1 py-0.5 rounded"
                              style={{ color: 'var(--text-primary)' }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={e => updateItem(index, 'quantity', e.target.value ? Number(e.target.value) : undefined)}
                              className="w-full bg-transparent focus:outline-none focus:bg-blue-500/5 px-1 py-0.5 rounded"
                              style={{ color: 'var(--text-primary)' }}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.price || ''}
                              onChange={e => updateItem(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                              className="w-full bg-transparent focus:outline-none focus:bg-blue-500/5 px-1 py-0.5 rounded"
                              style={{ color: 'var(--text-primary)' }}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.size || ''}
                              onChange={e => updateItem(index, 'size', e.target.value || undefined)}
                              className="w-full bg-transparent focus:outline-none focus:bg-blue-500/5 px-1 py-0.5 rounded"
                              style={{ color: 'var(--text-primary)' }}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.grade || ''}
                              onChange={e => updateItem(index, 'grade', e.target.value || undefined)}
                              className="w-full bg-transparent focus:outline-none focus:bg-blue-500/5 px-1 py-0.5 rounded"
                              style={{ color: 'var(--text-primary)' }}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.categoryId}
                              onChange={e => updateItem(index, 'categoryId', e.target.value)}
                              className="w-full bg-transparent focus:outline-none text-xs px-1 py-0.5 rounded"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {adType === 'request' ? 'Заявка создана!' : 'КП создано!'}
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {selectedCount} позиций опубликовано
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { router.push(`/ad/${createdAdId}`); onClose() }}
                  className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  Открыть карточку
                </button>
                <button
                  onClick={() => { router.push(adType === 'request' ? '/?tab=requests' : '/?tab=verified'); onClose() }}
                  className="px-6 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-500/10"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                >
                  {adType === 'request' ? 'К заявкам' : 'К поставщикам'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'form' || step === 'preview') && (
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
            <button
              onClick={step === 'preview' ? () => setStep('form') : onClose}
              className="px-5 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-500/10"
              style={{ color: 'var(--text-secondary)' }}
            >
              {step === 'preview' ? 'Назад' : 'Отмена'}
            </button>

            {step === 'form' && (
              <button
                onClick={startParsing}
                disabled={!isFormValid()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
              >
                Далее
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={publish}
                disabled={selectedCount === 0 || isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
              >
                {isSubmitting ? 'Публикация...' : `Опубликовать ${selectedCount} поз.`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
