import { NextRequest, NextResponse } from 'next/server'
import { startForumParsing, ForumJobManager } from '@/lib/forum'

// POST - Запустить парсинг
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceIds } = body

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'Необходим массив sourceIds' },
        { status: 400 }
      )
    }

    const result = await startForumParsing(sourceIds)

    return NextResponse.json({
      success: true,
      started: result.started,
      message: `Запущен парсинг для ${result.started} источников`,
    })
  } catch (error) {
    console.error('[Forum API] Ошибка запуска парсинга:', error)
    return NextResponse.json({ error: 'Ошибка запуска парсинга' }, { status: 500 })
  }
}

// GET - Получить статус активных задач
export async function GET() {
  try {
    const jobs = await ForumJobManager.getRunningJobsProgress()
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('[Forum API] Ошибка получения статуса:', error)
    return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 })
  }
}
