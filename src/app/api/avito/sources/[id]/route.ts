import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { UpdateSourceInput } from '@/lib/avito/types'

interface Params {
  params: Promise<{ id: string }>
}

// GET - получить источник по ID
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params

    const source = await prisma.avitoSource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ads: true, jobs: true },
        },
      },
    })

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error fetching source:', error)
    return NextResponse.json(
      { error: 'Failed to fetch source' },
      { status: 500 }
    )
  }
}

// PUT - обновить источник
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json() as UpdateSourceInput

    // Валидация URL если указан
    if (body.searchUrl) {
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
    }

    const source = await prisma.avitoSource.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.searchUrl && { searchUrl: body.searchUrl }),
        ...(body.parseFields && { parseFields: body.parseFields }),
        ...(typeof body.isActive === 'boolean' && { isActive: body.isActive }),
        ...(body.proxyId !== undefined && { proxyId: body.proxyId }),
        ...(typeof body.autoParseEnabled === 'boolean' && { autoParseEnabled: body.autoParseEnabled }),
        ...(body.autoParseInterval && { autoParseInterval: body.autoParseInterval }),
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating source:', error)
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    )
  }
}

// DELETE - удалить источник (вместе с объявлениями и задачами)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params

    // Prisma каскадно удалит связанные записи (ads, jobs)
    await prisma.avitoSource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting source:', error)
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    )
  }
}
