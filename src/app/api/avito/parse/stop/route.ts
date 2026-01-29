import { NextResponse } from 'next/server'
import { stopParsing, stopAllParsing } from '@/lib/avito/parser'
import type { StopRequest } from '@/lib/avito/types'

// POST - остановить парсинг
export async function POST(request: Request) {
  try {
    const body = await request.json() as StopRequest

    if (body.all) {
      // Остановить все задачи
      const count = await stopAllParsing()
      return NextResponse.json({
        message: `Остановлено ${count} задач`,
        stopped: count,
      })
    }

    if (body.jobId) {
      // Остановить конкретную задачу
      await stopParsing(body.jobId)
      return NextResponse.json({
        message: 'Задача остановлена',
        jobId: body.jobId,
      })
    }

    return NextResponse.json(
      { error: 'Укажите jobId или all: true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error stopping parse:', error)
    return NextResponse.json(
      { error: 'Failed to stop parse' },
      { status: 500 }
    )
  }
}
