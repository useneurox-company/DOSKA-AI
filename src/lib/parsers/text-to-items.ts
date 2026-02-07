/**
 * Извлечение позиций товаров из сырого текста
 * Используется для PDF и DOC файлов
 */

import { ExcelItem } from '@/lib/ai/excel-parser'
import { chatCompletion } from '@/lib/ai/openrouter'

const EXTRACTION_PROMPT = `Ты эксперт по строительным и промышленным материалам.
Из текста ниже извлеки ВСЕ позиции товаров/материалов.

Для каждой позиции определи:
- nomenclature: название товара (Арматура, Труба, Лист, Швеллер и т.д.)
- quantity: количество (число или null)
- unit: единица измерения (тн, шт, м, м2, м3 или null)
- price: цена в рублях (число или null)
- size: размер/сечение (12мм, 159х6, 60x40 или null)
- grade: марка стали/материала (А500С, Ст3, 09Г2С или null)

ВАЖНО:
- Извлекай ТОЛЬКО реальные товары/материалы из текста
- НЕ выдумывай позиции
- Если в тексте нет товаров — верни пустой массив
- Цену конвертируй в рубли (число)
- Количество — только число без единиц

Отвечай ТОЛЬКО валидным JSON массивом:
[{"nomenclature": "...", "quantity": число|null, "unit": "..."|null, "price": число|null, "size": "..."|null, "grade": "..."|null}]`

export async function textToItems(rawText: string): Promise<ExcelItem[]> {
  if (!rawText || rawText.trim().length < 10) {
    return []
  }

  // Обрезаем текст если слишком длинный (лимит токенов)
  const trimmedText = rawText.length > 8000 ? rawText.slice(0, 8000) + '\n...(текст обрезан)' : rawText

  try {
    const response = await chatCompletion([
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: `Извлеки позиции товаров из текста:\n\n${trimmedText}` },
    ], { model: 'lite', maxTokens: 2000 })

    const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanJson)

    if (!Array.isArray(parsed)) return []

    return parsed
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
  } catch (error) {
    console.error('[TextToItems] Ошибка AI извлечения:', error)
    return []
  }
}
