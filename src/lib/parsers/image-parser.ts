/**
 * Image Parser — извлечение позиций товаров из фотографий через AI Vision
 */

import { ExcelItem } from '@/lib/ai/excel-parser'
import { chatCompletion } from '@/lib/ai/openrouter'

const IMAGE_EXTRACTION_PROMPT = `Ты эксперт по строительным материалам. Посмотри на изображение и извлеки ВСЕ позиции товаров/материалов которые ты видишь.

Это может быть:
- Фото прайс-листа или сметы
- Скриншот таблицы с товарами
- Фото с товарами на складе
- Документ с перечнем материалов

Для каждой позиции определи:
- nomenclature: название товара
- quantity: количество (число или null)
- unit: единица измерения или null
- price: цена в рублях (число) или null
- size: размер/сечение или null
- grade: марка стали/материала или null

ВАЖНО: Извлекай ТОЛЬКО то что реально видно. НЕ выдумывай.
Если не видно товаров — верни пустой массив [].

Отвечай ТОЛЬКО валидным JSON:
[{"nomenclature": "...", "quantity": число|null, "unit": "..."|null, "price": число|null, "size": "..."|null, "grade": "..."|null}]`

export async function parseImage(buffer: Buffer, mimeType: string): Promise<{ items: ExcelItem[]; rawText: string }> {
  const base64 = buffer.toString('base64')

  try {
    const response = await chatCompletion([
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: IMAGE_EXTRACTION_PROMPT },
        ],
      },
    ], { model: 'vision', maxTokens: 2000 })

    const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanJson)

    if (!Array.isArray(parsed)) return { items: [], rawText: response }

    const items: ExcelItem[] = parsed
      .filter((item: Record<string, unknown>) => item.nomenclature && String(item.nomenclature).length > 1)
      .map((item: Record<string, unknown>, index: number) => ({
        rowNumber: index + 1,
        nomenclature: String(item.nomenclature).trim(),
        quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
        unit: item.unit ? String(item.unit) : undefined,
        price: typeof item.price === 'number' ? item.price : undefined,
        size: item.size ? String(item.size) : undefined,
        grade: item.grade ? String(item.grade) : undefined,
        rawData: item as Record<string, unknown>,
      }))

    return { items, rawText: response }
  } catch (error) {
    console.error('[ImageParser] Ошибка AI извлечения:', error)
    return { items: [], rawText: '' }
  }
}
