/**
 * AI Category Matcher — сопоставление позиций товаров с категориями из БД
 */

import { ExcelItem } from '@/lib/ai/excel-parser'
import { chatCompletion } from '@/lib/ai/openrouter'

interface Category {
  id: string
  name: string
  slug: string
}

export interface CategoryAssignment {
  itemIndex: number
  categoryId: string
  categoryName: string
}

// Ключевые слова → slug категории
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'metal': [
    'арматур', 'труб', 'балк', 'швеллер', 'лист', 'уголок', 'круг', 'профиль',
    'двутавр', 'полос', 'проволок', 'катанк', 'рельс', 'квадрат', 'шестигран',
    'прокат', 'сталь', 'метал', 'чугун', 'алюмин', 'нержавейк', 'оцинков',
  ],
  'construction': [
    'лстк', 'ангар', 'склад', 'каркас', 'ферм', 'колонн', 'конструкц',
    'здани', 'модуль', 'бак ', 'ёмкост', 'емкост', 'металлоизд', 'металлоконструк',
  ],
  'metalwork': [
    'резк', 'гибк', 'сварк', 'токарн', 'фрезер', 'плазм', 'лазерн',
    'вальцов', 'покраск', 'пескостру', 'обработк', 'штампов',
  ],
  'building': [
    'сендвич', 'сэндвич', 'панел', 'профлист', 'профнастил', 'кровл',
    'утеплител', 'кирпич', 'бетон', 'цемент', 'песок', 'щебен',
    'пеноблок', 'газоблок', 'минват',
  ],
}

function matchByKeywords(nomenclature: string, categories: Category[]): Category | null {
  const lower = nomenclature.toLowerCase()

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const cat = categories.find(c => c.slug === slug)
        if (cat) return cat
      }
    }
  }
  return null
}

export async function categorizeItems(
  items: ExcelItem[],
  categories: Category[]
): Promise<CategoryAssignment[]> {
  if (items.length === 0 || categories.length === 0) return []

  const assignments: CategoryAssignment[] = []
  const unmatchedIndices: number[] = []

  // Фаза 1: по ключевым словам
  items.forEach((item, index) => {
    if (!item.nomenclature) {
      unmatchedIndices.push(index)
      return
    }

    const matched = matchByKeywords(item.nomenclature, categories)
    if (matched) {
      assignments.push({ itemIndex: index, categoryId: matched.id, categoryName: matched.name })
    } else {
      unmatchedIndices.push(index)
    }
  })

  // Фаза 2: AI для нераспознанных (батчами по 20)
  if (unmatchedIndices.length > 0 && categories.length > 0) {
    const batchSize = 20
    for (let i = 0; i < unmatchedIndices.length; i += batchSize) {
      const batch = unmatchedIndices.slice(i, i + batchSize)
      const batchItems = batch.map(idx => ({
        index: idx,
        name: items[idx].nomenclature || 'Неизвестно',
      }))

      try {
        const categoriesStr = categories.map(c => `"${c.id}": "${c.name}"`).join(', ')
        const itemsStr = batchItems.map(b => `${b.index}: "${b.name}"`).join('\n')

        const response = await chatCompletion([
          {
            role: 'system',
            content: `Ты классификатор товаров. Сопоставь каждый товар с одной из категорий.
Категории: {${categoriesStr}}
Если не подходит ни одна — выбери ближайшую.
Отвечай ТОЛЬКО JSON: [{"index": число, "categoryId": "id_категории"}]`,
          },
          { role: 'user', content: `Товары:\n${itemsStr}` },
        ], { model: 'lite', maxTokens: 1000 })

        const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim()
        const aiResults = JSON.parse(cleanJson) as { index: number; categoryId: string }[]

        for (const result of aiResults) {
          const cat = categories.find(c => c.id === result.categoryId)
          if (cat) {
            assignments.push({
              itemIndex: result.index,
              categoryId: cat.id,
              categoryName: cat.name,
            })
          }
        }
      } catch (error) {
        console.error('[CategoryMatcher] AI ошибка для батча:', error)
      }
    }
  }

  // Для позиций без категории — назначаем первую доступную
  const assignedIndices = new Set(assignments.map(a => a.itemIndex))
  const defaultCategory = categories[0]

  items.forEach((_, index) => {
    if (!assignedIndices.has(index) && defaultCategory) {
      assignments.push({
        itemIndex: index,
        categoryId: defaultCategory.id,
        categoryName: defaultCategory.name,
      })
    }
  })

  return assignments.sort((a, b) => a.itemIndex - b.itemIndex)
}
