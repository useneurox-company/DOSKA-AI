'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

type Step = 'upload' | 'parsing' | 'preview' | 'success'

interface UploadModalProps {
  onClose: () => void
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [cityId, setCityId] = useState('')
  const [adType, setAdType] = useState<'offer' | 'request'>('offer')
  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<ParsedItem[]>([])
  const [parsingStatus, setParsingStatus] = useState('')
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [createdAdId, setCreatedAdId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Load cities and categories
  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(setCities).catch(() => {})
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // Parse file
  const startParsing = async () => {
    if (!file || !cityId) {
      setError('Выберите файл и город')
      return
    }

    setStep('parsing')
    setError('')
    setParsingStatus('Анализируем файл...')

    try {
      // Step 1: Parse file
      const formData = new FormData()
      formData.append('file', file)

      const parseRes = await fetch('/api/upload-parse', { method: 'POST', body: formData })
      const parseData = await parseRes.json()

      if (!parseRes.ok || !parseData.success) {
        setError(parseData.error || 'Не удалось распознать позиции из файла')
        setWarnings(parseData.warnings || [])
        setStep('upload')
        return
      }

      if (parseData.warnings) setWarnings(parseData.warnings)

      // Step 2: Categorize items
      setParsingStatus('Определяем категории...')

      const catRes = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parseData.items }),
      })
      const catData = await catRes.json()

      // Merge items with categories
      const assignments = catData.assignments || []
      const assignmentMap = new Map(assignments.map((a: { itemIndex: number; categoryId: string; categoryName: string }) => [a.itemIndex, a]))

      const defaultCat = categories[0]
      const parsedItems: ParsedItem[] = parseData.items.map((item: Record<string, unknown>, index: number) => {
        const assignment = assignmentMap.get(index) as { categoryId: string; categoryName: string } | undefined
        return {
          rowNumber: index + 1,
          nomenclature: item.nomenclature || 'Без названия',
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          size: item.size,
          grade: item.grade,
          categoryId: assignment?.categoryId || defaultCat?.id || '',
          categoryName: assignment?.categoryName || defaultCat?.name || '',
          selected: true,
        }
      })

      setItems(parsedItems)
      setStep('preview')
    } catch (err) {
      console.error('Parsing error:', err)
      setError('Ошибка при обработке файла')
      setStep('upload')
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

  // Toggle item selection
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
      // Generate title from items
      const uniqueNames = [...new Set(selected.map(i => i.nomenclature))]
      let title: string
      if (uniqueNames.length <= 3) {
        title = uniqueNames.join(', ')
      } else {
        title = `${uniqueNames.slice(0, 3).join(', ')} и ещё ${uniqueNames.length - 3} поз.`
      }

      // Description with item list
      const description = selected.map(i => {
        const parts = [i.nomenclature]
        if (i.size) parts.push(i.size)
        if (i.grade) parts.push(i.grade)
        if (i.quantity) parts.push(`${i.quantity} ${i.unit || 'шт'}`)
        if (i.price) parts.push(`${i.price.toLocaleString('ru-RU')} ₽`)
        return `• ${parts.join(' — ')}`
      }).join('\n')

      // Find most common category
      const categoryCounts = new Map<string, number>()
      selected.forEach(i => categoryCounts.set(i.categoryId, (categoryCounts.get(i.categoryId) || 0) + 1))
      const mainCategoryId = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || categories[0]?.id

      // Items JSON for storage
      const itemsJson = selected.map(i => ({
        nomenclature: i.nomenclature,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        size: i.size,
        grade: i.grade,
        categoryName: i.categoryName,
      }))

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
            {step === 'upload' && 'Загрузить файл'}
            {step === 'parsing' && 'Анализ файла'}
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
          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
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
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      Перетащите файл сюда или нажмите для выбора
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Excel, PDF, Word, CSV или фото (до 20МБ)
                    </p>
                  </>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Город</label>
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

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Тип</label>
                <div className="flex gap-3">
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
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-400">{w}</p>
                  ))}
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
              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Найдено <span className="font-bold text-blue-500">{items.length}</span> позиций из файла <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{file?.name}</span>
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                >
                  {items.every(i => i.selected) ? 'Снять все' : 'Выбрать все'}
                </button>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  {warnings.map((w, i) => <p key={i} className="text-sm text-amber-400">{w}</p>)}
                </div>
              )}

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
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>КП создано!</h3>
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
                  onClick={() => { router.push('/?tab=verified'); onClose() }}
                  className="px-6 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-500/10"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                >
                  К поставщикам
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'upload' || step === 'preview') && (
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
            <button
              onClick={step === 'preview' ? () => setStep('upload') : onClose}
              className="px-5 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-500/10"
              style={{ color: 'var(--text-secondary)' }}
            >
              {step === 'preview' ? 'Назад' : 'Отмена'}
            </button>

            {step === 'upload' && (
              <button
                onClick={startParsing}
                disabled={!file || !cityId}
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
