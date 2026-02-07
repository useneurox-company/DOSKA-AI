import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { categorizeItems } from '@/lib/ai/category-matcher'
import { ExcelItem } from '@/lib/ai/excel-parser'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { items } = await request.json() as { items: ExcelItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Позиции не найдены' }, { status: 400 })
    }

    // Получаем все категории из БД
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    })

    if (categories.length === 0) {
      return NextResponse.json({ error: 'Категории не настроены' }, { status: 500 })
    }

    const assignments = await categorizeItems(items, categories)

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('[Categorize] Error:', error)
    return NextResponse.json({ error: 'Ошибка категоризации' }, { status: 500 })
  }
}
