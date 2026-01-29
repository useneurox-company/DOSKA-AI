import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - получить статус автопарсинга
export async function GET() {
  try {
    // Получить или создать настройки
    let settings = await prisma.avitoAutoParseSettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      settings = await prisma.avitoAutoParseSettings.create({
        data: { id: 'default' },
      })
    }

    // Получить источники с автопарсингом
    const sourcesWithAutoParse = await prisma.avitoSource.count({
      where: {
        isActive: true,
        autoParseEnabled: true,
      },
    })

    // Вычислить когда следующий автопарсинг
    let nextAutoParseAt: Date | null = null

    if (!settings.isPaused && sourcesWithAutoParse > 0) {
      // Найти источник с ближайшим временем парсинга
      const sources = await prisma.avitoSource.findMany({
        where: {
          isActive: true,
          autoParseEnabled: true,
        },
        select: {
          lastParsed: true,
          autoParseInterval: true,
        },
      })

      for (const source of sources) {
        const lastParsed = source.lastParsed || new Date(0)
        const nextParse = new Date(lastParsed.getTime() + source.autoParseInterval * 60 * 60 * 1000)

        if (!nextAutoParseAt || nextParse < nextAutoParseAt) {
          nextAutoParseAt = nextParse
        }
      }
    }

    return NextResponse.json({
      isPaused: settings.isPaused,
      lastAutoParseAt: settings.lastAutoParseAt,
      nextAutoParseAt,
      sourcesWithAutoParse,
    })
  } catch (error) {
    console.error('Error fetching autoparse status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch autoparse status' },
      { status: 500 }
    )
  }
}

// POST - управление автопарсингом (pause/resume)
export async function POST(request: Request) {
  try {
    const body = await request.json() as { action: 'pause' | 'resume' }

    if (!['pause', 'resume'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "pause" or "resume"' },
        { status: 400 }
      )
    }

    const isPaused = body.action === 'pause'

    const settings = await prisma.avitoAutoParseSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        isPaused,
      },
      update: {
        isPaused,
      },
    })

    return NextResponse.json({
      isPaused: settings.isPaused,
      message: isPaused ? 'Автопарсинг приостановлен' : 'Автопарсинг возобновлён',
    })
  } catch (error) {
    console.error('Error updating autoparse:', error)
    return NextResponse.json(
      { error: 'Failed to update autoparse' },
      { status: 500 }
    )
  }
}
