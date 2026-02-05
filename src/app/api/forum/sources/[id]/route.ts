import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Получить источник по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const source = await prisma.forumSource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true, jobs: true },
        },
      },
    })

    if (!source) {
      return NextResponse.json({ error: 'Источник не найден' }, { status: 404 })
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('[Forum API] Ошибка получения источника:', error)
    return NextResponse.json({ error: 'Ошибка получения источника' }, { status: 500 })
  }
}

// PUT - Обновить источник
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const source = await prisma.forumSource.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.baseUrl && { baseUrl: body.baseUrl }),
        ...(body.sectionUrl && { sectionUrl: body.sectionUrl }),
        ...(body.selectors && { selectors: body.selectors }),
        ...(body.parseFields && { parseFields: body.parseFields }),
        ...(typeof body.isActive === 'boolean' && { isActive: body.isActive }),
        ...(body.proxyId !== undefined && { proxyId: body.proxyId || null }),
        ...(typeof body.maxPages === 'number' && { maxPages: body.maxPages }),
        ...(typeof body.parseReplies === 'boolean' && { parseReplies: body.parseReplies }),
        ...(typeof body.autoParseEnabled === 'boolean' && { autoParseEnabled: body.autoParseEnabled }),
        ...(typeof body.autoParseInterval === 'number' && { autoParseInterval: body.autoParseInterval }),
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('[Forum API] Ошибка обновления источника:', error)
    return NextResponse.json({ error: 'Ошибка обновления источника' }, { status: 500 })
  }
}

// DELETE - Удалить источник
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Удалить все связанные посты и задачи
    await prisma.forumPost.deleteMany({ where: { sourceId: id } })
    await prisma.forumJob.deleteMany({ where: { sourceId: id } })

    await prisma.forumSource.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Forum API] Ошибка удаления источника:', error)
    return NextResponse.json({ error: 'Ошибка удаления источника' }, { status: 500 })
  }
}
