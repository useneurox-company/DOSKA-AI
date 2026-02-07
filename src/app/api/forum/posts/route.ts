import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Получить посты с фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const postType = searchParams.get('postType')
    const city = searchParams.get('city')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}

    if (sourceId) where.sourceId = sourceId
    if (postType) where.postType = postType
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        include: {
          source: {
            select: { id: true, name: true },
          },
        },
        orderBy: { parsedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.forumPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[Forum API] Ошибка получения постов:', error)
    return NextResponse.json({ error: 'Ошибка получения постов' }, { status: 500 })
  }
}
