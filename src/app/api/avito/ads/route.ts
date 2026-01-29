import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { AdsFilter, AdsListResponse } from '@/lib/avito/types'
import { Prisma } from '@prisma/client'

// GET - получить список объявлений с фильтрами
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Парсить параметры фильтрации
    const filter: AdsFilter = {
      sourceId: searchParams.get('sourceId') || undefined,
      city: searchParams.get('city') || undefined,
      priceMin: searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!, 10) : undefined,
      priceMax: searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!, 10) : undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: (searchParams.get('sort') as AdsFilter['sort']) || 'parsedAt',
      order: (searchParams.get('order') as AdsFilter['order']) || 'desc',
    }

    // Ограничить limit
    if (filter.limit! > 100) filter.limit = 100
    if (filter.limit! < 1) filter.limit = 20

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

    // Построить orderBy
    const orderBy: Prisma.AvitoAdOrderByWithRelationInput = {}
    const sortField = filter.sort || 'parsedAt'
    const sortOrder = filter.order || 'desc'

    switch (sortField) {
      case 'price':
        orderBy.price = sortOrder
        break
      case 'createdAt':
        orderBy.createdAt = sortOrder
        break
      case 'title':
        orderBy.title = sortOrder
        break
      case 'parsedAt':
      default:
        orderBy.parsedAt = sortOrder
        break
    }

    // Выполнить запрос
    const [ads, total] = await Promise.all([
      prisma.avitoAd.findMany({
        where,
        orderBy,
        skip: (filter.page! - 1) * filter.limit!,
        take: filter.limit,
        include: {
          source: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.avitoAd.count({ where }),
    ])

    const response: AdsListResponse = {
      ads,
      total,
      page: filter.page!,
      limit: filter.limit!,
      totalPages: Math.ceil(total / filter.limit!),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads' },
      { status: 500 }
    )
  }
}
