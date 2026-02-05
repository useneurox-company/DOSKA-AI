import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ForumJobManager } from '@/lib/forum'

// POST - Остановить задачу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, all } = body

    if (all) {
      // Остановить все задачи
      const runningJobs = await prisma.forumJob.findMany({
        where: { status: 'running' },
      })

      for (const job of runningJobs) {
        await ForumJobManager.stopJob(job.id)
      }

      return NextResponse.json({
        success: true,
        stopped: runningJobs.length,
      })
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'Необходим jobId или all: true' },
        { status: 400 }
      )
    }

    await ForumJobManager.stopJob(jobId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Forum API] Ошибка остановки:', error)
    return NextResponse.json({ error: 'Ошибка остановки задачи' }, { status: 500 })
  }
}
