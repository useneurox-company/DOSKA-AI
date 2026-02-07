/**
 * Unified File Parser — единая точка входа для парсинга любых файлов
 */

import { ExcelItem, parseExcelBuffer } from '@/lib/ai/excel-parser'
import { parsePdf } from './pdf-parser'
import { parseDoc } from './doc-parser'
import { parseImage } from './image-parser'

export type SupportedFileType = 'excel' | 'csv' | 'pdf' | 'doc' | 'image' | 'unknown'

export interface ParseResult {
  success: boolean
  items: ExcelItem[]
  fileType: SupportedFileType
  rawText?: string
  error?: string
  warnings: string[]
}

function detectFileType(fileName: string, mimeType: string): SupportedFileType {
  const ext = fileName.toLowerCase().split('.').pop() || ''

  // По расширению
  if (['xlsx', 'xls'].includes(ext)) return 'excel'
  if (ext === 'csv') return 'csv'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'doc'
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image'

  // По MIME type
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel'
  if (mimeType === 'text/csv') return 'csv'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('msword')) return 'doc'
  if (mimeType.startsWith('image/')) return 'image'

  return 'unknown'
}

export async function parseFile(buffer: Buffer, fileName: string, mimeType: string): Promise<ParseResult> {
  const fileType = detectFileType(fileName, mimeType)
  const warnings: string[] = []

  if (fileType === 'unknown') {
    return {
      success: false,
      items: [],
      fileType,
      error: `Неподдерживаемый формат файла: ${fileName}`,
      warnings,
    }
  }

  try {
    let items: ExcelItem[] = []
    let rawText: string | undefined

    switch (fileType) {
      case 'excel':
      case 'csv': {
        items = parseExcelBuffer(buffer)
        if (items.length === 0) {
          warnings.push('Не удалось обнаружить позиции. Проверьте что файл содержит заголовки столбцов.')
        }
        break
      }

      case 'pdf': {
        const pdfResult = await parsePdf(buffer)
        items = pdfResult.items
        rawText = pdfResult.rawText
        if (items.length === 0 && rawText && rawText.length > 20) {
          warnings.push('Текст из PDF извлечён, но позиции не распознаны. Возможно файл содержит сканированные изображения.')
        }
        break
      }

      case 'doc': {
        const docResult = await parseDoc(buffer)
        items = docResult.items
        rawText = docResult.rawText
        if (items.length === 0 && rawText && rawText.length > 20) {
          warnings.push('Текст из документа извлечён, но позиции не распознаны.')
        }
        break
      }

      case 'image': {
        const imgResult = await parseImage(buffer, mimeType)
        items = imgResult.items
        rawText = imgResult.rawText
        if (items.length === 0) {
          warnings.push('Не удалось распознать позиции на изображении. Попробуйте загрузить файл в другом формате.')
        }
        break
      }
    }

    return {
      success: items.length > 0,
      items,
      fileType,
      rawText,
      warnings,
    }
  } catch (error) {
    console.error(`[FileParser] Ошибка парсинга ${fileType}:`, error)
    return {
      success: false,
      items: [],
      fileType,
      error: `Ошибка при обработке файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      warnings,
    }
  }
}
