import { NextResponse } from 'next/server'
import { JobManager } from '@/lib/avito/jobManager'

interface Params {
  params: Promise<{ id: string }>
}

// GET - получить задачу по ID
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const job = await JobManager.getJobWithSource(id)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}
