import { NextRequest, NextResponse } from 'next/server'
import { textToItems } from '@/lib/parsers/text-to-items'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Введите описание (минимум 5 символов)' },
        { status: 400 }
      )
    }

    const items = await textToItems(text.trim())

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Не удалось извлечь позиции из текста. Попробуйте описать подробнее.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Parse text error:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при обработке текста' },
      { status: 500 }
    )
  }
}
