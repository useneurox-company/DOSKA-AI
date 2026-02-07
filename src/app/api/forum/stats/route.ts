import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Получить статистику
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalPosts, todayPosts, totalSources, activeSources, runningJobs] = await Promise.all([
      prisma.forumPost.count(),
      prisma.forumPost.count({
        where: { parsedAt: { gte: today } },
      }),
      prisma.forumSource.count(),
      prisma.forumSource.count({ where: { isActive: true } }),
      prisma.forumJob.count({ where: { status: 'running' } }),
    ])

    return NextResponse.json({
      totalPosts,
      todayPosts,
      totalSources,
      activeSources,
      runningJobs,
    })
  } catch (error) {
    console.error('[Forum API] Ошибка получения статистики:', error)
    return NextResponse.json({ error: 'Ошибка получения статистики' }, { status: 500 })
  }
}
