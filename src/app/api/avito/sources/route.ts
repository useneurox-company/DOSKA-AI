import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CreateSourceInput } from '@/lib/avito/types'
import { DEFAULT_PARSE_FIELDS } from '@/lib/avito/constants'

// GET - получить список источников
export async function GET() {
  try {
    const sources = await prisma.avitoSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { ads: true, jobs: true },
        },
      },
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}

// POST - создать источник
export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateSourceInput

    if (!body.name || !body.searchUrl) {
      return NextResponse.json(
        { error: 'Name and searchUrl are required' },
        { status: 400 }
      )
    }

    // Валидация URL
    try {
      const url = new URL(body.searchUrl)
      if (!url.hostname.includes('avito.ru')) {
        return NextResponse.json(
          { error: 'URL must be from avito.ru' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const source = await prisma.avitoSource.create({
      data: {
        name: body.name,
        searchUrl: body.searchUrl,
        parseFields: body.parseFields || DEFAULT_PARSE_FIELDS,
        proxyId: body.proxyId,
        fastMode: body.fastMode ?? true, // По умолчанию быстрый режим
        autoParseEnabled: body.autoParseEnabled ?? false,
        autoParseInterval: body.autoParseInterval ?? 24,
      },
    })

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    )
  }
}
