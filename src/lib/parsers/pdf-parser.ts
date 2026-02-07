/**
 * PDF Parser — извлечение позиций из PDF файлов
 */

import { ExcelItem } from '@/lib/ai/excel-parser'
import { textToItems } from './text-to-items'

export async function parsePdf(buffer: Buffer): Promise<{ items: ExcelItem[]; rawText: string }> {
  // Dynamic import для pdf-parse (CommonJS модуль)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  const rawText = data.text

  if (!rawText || rawText.trim().length < 10) {
    return { items: [], rawText: rawText || '' }
  }

  const items = await textToItems(rawText)
  return { items, rawText }
}
