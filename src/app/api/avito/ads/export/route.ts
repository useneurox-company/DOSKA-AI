import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { AdsFilter } from '@/lib/avito/types'
import { Prisma } from '@prisma/client'

// GET - экспорт объявлений в CSV
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Парсить параметры фильтрации (те же что и для списка)
    const filter: AdsFilter = {
      sourceId: searchParams.get('sourceId') || undefined,
      city: searchParams.get('city') || undefined,
      priceMin: searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!, 10) : undefined,
      priceMax: searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!, 10) : undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
    }

    // Построить where условие
    const where: Prisma.AvitoAdWhereInput = {}

    if (filter.sourceId) {
      where.sourceId = filter.sourceId
    }

    if (filter.city) {
      where.city = {
        contains: filter.city,
        mode: 'insensitive',
      }
    }

    if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
      where.price = {}
      if (filter.priceMin !== undefined) {
        where.price.gte = filter.priceMin
      }
      if (filter.priceMax !== undefined) {
        where.price.lte = filter.priceMax
      }
    }

    if (filter.dateFrom || filter.dateTo) {
      where.parsedAt = {}
      if (filter.dateFrom) {
        where.parsedAt.gte = filter.dateFrom
      }
      if (filter.dateTo) {
        where.parsedAt.lte = filter.dateTo
      }
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { sellerName: { contains: filter.search, mode: 'insensitive' } },
      ]
    }

    // Получить все объявления по фильтру (лимит 10000)
    const ads = await prisma.avitoAd.findMany({
      where,
      orderBy: { parsedAt: 'desc' },
      take: 10000,
      include: {
        source: {
          select: { name: true },
        },
      },
    })

    // Формируем CSV
    const headers = [
      'ID',
      'Avito ID',
      'Заголовок',
      'Описание',
      'Цена',
      'Цена (текст)',
      'Город',
      'Адрес',
      'Район',
      'Продавец',
      'URL',
      'Категория',
      'Просмотры',
      'Дата публикации',
      'Дата парсинга',
      'Источник',
    ]

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // Экранировать кавычки и переносы строк
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
      }
      return str
    }

    const rows = ads.map(ad => [
      ad.id,
      ad.avitoId,
      escapeCSV(ad.title),
      escapeCSV(ad.description),
      ad.price?.toString() || '',
      escapeCSV(ad.priceText),
      escapeCSV(ad.city),
      escapeCSV(ad.address),
      escapeCSV(ad.district),
      escapeCSV(ad.sellerName),
      ad.url,
      escapeCSV(ad.category),
      ad.views?.toString() || '',
      ad.publishedAt?.toISOString() || '',
      ad.parsedAt.toISOString(),
      escapeCSV(ad.source.name),
    ])

    // BOM для корректного отображения кириллицы в Excel
    const BOM = '\uFEFF'
    const csv = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n')

    // Возвращаем как файл
    const filename = `avito_ads_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting ads:', error)
    return NextResponse.json(
      { error: 'Failed to export ads' },
      { status: 500 }
    )
  }
}
