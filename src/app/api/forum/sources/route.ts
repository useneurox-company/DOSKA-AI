import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Получить все источники
export async function GET() {
  try {
    const sources = await prisma.forumSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { posts: true, jobs: true },
        },
      },
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('[Forum API] Ошибка получения источников:', error)
    return NextResponse.json({ error: 'Ошибка получения источников' }, { status: 500 })
  }
}

// POST - Создать новый источник
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.baseUrl || !body.sectionUrl) {
      return NextResponse.json(
        { error: 'Необходимы name, baseUrl и sectionUrl' },
        { status: 400 }
      )
    }

    const source = await prisma.forumSource.create({
      data: {
        name: body.name,
        baseUrl: body.baseUrl,
        sectionUrl: body.sectionUrl,
        selectors: body.selectors || {},
        parseFields: body.parseFields || ['title', 'content', 'author', 'date', 'images', 'url'],
        proxyId: body.proxyId || null,
        maxPages: body.maxPages ?? 5,
        parseReplies: body.parseReplies ?? false,
        autoParseEnabled: body.autoParseEnabled ?? false,
        autoParseInterval: body.autoParseInterval ?? 24,
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('[Forum API] Ошибка создания источника:', error)
    return NextResponse.json({ error: 'Ошибка создания источника' }, { status: 500 })
  }
}
