import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { JobManager } from '@/lib/avito/jobManager'
import type { StatsResponse } from '@/lib/avito/types'

// GET - получить общую статистику
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalAds,
      todayAds,
      totalSources,
      activeSources,
      totalProxies,
      activeProxies,
      jobStats,
    ] = await Promise.all([
      prisma.avitoAd.count(),
      prisma.avitoAd.count({
        where: { parsedAt: { gte: today } },
      }),
      prisma.avitoSource.count(),
      prisma.avitoSource.count({ where: { isActive: true } }),
      prisma.avitoProxy.count(),
      prisma.avitoProxy.count({ where: { isActive: true } }),
      JobManager.getJobsStats(),
    ])

    const stats: StatsResponse = {
      totalAds,
      todayAds,
      totalSources,
      activeSources,
      totalProxies,
      activeProxies,
      runningJobs: jobStats.running,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
