import { NextResponse } from 'next/server'
import { startParallelParsing } from '@/lib/avito/parser'
import { JobManager } from '@/lib/avito/jobManager'
import type { ParseRequest } from '@/lib/avito/types'
import { prisma } from '@/lib/prisma'
import { AVITO_CONFIG } from '@/lib/avito/constants'

// GET - получить статус текущих задач
export async function GET() {
  try {
    const [runningJobs, stats] = await Promise.all([
      JobManager.getRunningJobsProgress(),
      JobManager.getJobsStats(),
    ])

    return NextResponse.json({
      runningJobs,
      stats,
    })
  } catch (error) {
    console.error('Error fetching parse status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parse status' },
      { status: 500 }
    )
  }
}

// POST - запустить парсинг
export async function POST(request: Request) {
  try {
    const body = await request.json() as ParseRequest

    // Проверить количество уже запущенных задач
    const stats = await JobManager.getJobsStats()
    if (stats.running >= AVITO_CONFIG.MAX_CONCURRENT_JOBS) {
      return NextResponse.json(
        { error: `Максимум ${AVITO_CONFIG.MAX_CONCURRENT_JOBS} параллельных задач` },
        { status: 400 }
      )
    }

    let sourceIds: string[]

    if (body.sourceIds === 'all') {
      // Запустить все активные источники
      const sources = await prisma.avitoSource.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      sourceIds = sources.map(s => s.id)
    } else {
      sourceIds = body.sourceIds
    }

    if (sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'Нет источников для парсинга' },
        { status: 400 }
      )
    }

    // Ограничить количество одновременных задач
    const availableSlots = AVITO_CONFIG.MAX_CONCURRENT_JOBS - stats.running
    const toStart = sourceIds.slice(0, availableSlots)

    if (toStart.length < sourceIds.length) {
      console.log(`[Avito] Ограничение: запускаем ${toStart.length} из ${sourceIds.length} источников`)
    }

    // Запустить параллельный парсинг (Puppeteer)
    const result = await startParallelParsing(toStart)

    return NextResponse.json({
      message: `Запущено ${result.jobs.length} задач`,
      jobs: result.jobs,
      limited: toStart.length < sourceIds.length,
    })
  } catch (error) {
    console.error('Error starting parse:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start parse' },
      { status: 500 }
    )
  }
}
