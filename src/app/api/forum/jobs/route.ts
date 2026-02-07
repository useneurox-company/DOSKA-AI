import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Получить список задач
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'running' | 'all'

    const where = type === 'running' ? { status: 'running' } : {}

    const jobs = await prisma.forumJob.findMany({
      where,
      include: {
        source: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const result = jobs.map((job) => ({
      id: job.id,
      sourceId: job.sourceId,
      sourceName: job.source.name,
      status: job.status,
      total: job.total,
      processed: job.processed,
      newPosts: job.newPosts,
      skipped: job.skipped,
      errors: job.errors,
      errorMsg: job.errorMsg,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      percent: job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Forum API] Ошибка получения задач:', error)
    return NextResponse.json({ error: 'Ошибка получения задач' }, { status: 500 })
  }
}
