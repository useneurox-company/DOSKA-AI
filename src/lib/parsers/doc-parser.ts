/**
 * DOC/DOCX Parser — извлечение позиций из Word файлов
 */

import mammoth from 'mammoth'
import { ExcelItem } from '@/lib/ai/excel-parser'
import { textToItems } from './text-to-items'

export async function parseDoc(buffer: Buffer): Promise<{ items: ExcelItem[]; rawText: string }> {
  const result = await mammoth.extractRawText({ buffer })
  const rawText = result.value

  if (!rawText || rawText.trim().length < 10) {
    return { items: [], rawText: rawText || '' }
  }

  const items = await textToItems(rawText)
  return { items, rawText }
}
