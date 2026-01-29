import { NextResponse } from 'next/server'
import { JobManager } from '@/lib/avito/jobManager'

// GET - получить список задач
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'recent'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let jobs

    switch (type) {
      case 'running':
        // Только запущенные задачи с прогрессом
        jobs = await JobManager.getRunningJobsProgress()
        break

      case 'recent':
      default:
        // Последние задачи
        jobs = await JobManager.getRecentJobs(limit)
        break
    }

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
