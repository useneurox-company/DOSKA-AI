import { prisma } from '@/lib/prisma'
import { ForumJobProgress } from './types'

// Хранилище сигналов остановки
export const stopSignals = new Map<string, boolean>()

export const ForumJobManager = {
  // Создать новую задачу
  async createJob(sourceId: string, proxyId?: string | null) {
    const job = await prisma.forumJob.create({
      data: {
        sourceId,
        proxyId: proxyId || null,
        status: 'pending',
      },
    })
    return job
  },

  // Запустить задачу
  async startJob(jobId: string) {
    stopSignals.set(jobId, false)
    return await prisma.forumJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    })
  },

  // Обновить прогресс
  async updateProgress(
    jobId: string,
    data: {
      total?: number
      processed?: number
      newPosts?: number
      skipped?: number
      errors?: number
    }
  ) {
    return await prisma.forumJob.update({
      where: { id: jobId },
      data,
    })
  },

  // Завершить задачу успешно
  async completeJob(jobId: string) {
    stopSignals.delete(jobId)
    return await prisma.forumJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })
  },

  // Завершить задачу с ошибкой
  async failJob(jobId: string, errorMsg: string) {
    stopSignals.delete(jobId)
    return await prisma.forumJob.update({
      where: { id: jobId },
      data: {
        status: 'error',
        errorMsg,
        stoppedAt: new Date(),
      },
    })
  },

  // Остановить задачу
  async stopJob(jobId: string) {
    stopSignals.set(jobId, true)
    return await prisma.forumJob.update({
      where: { id: jobId },
      data: {
        status: 'stopped',
        stoppedAt: new Date(),
      },
    })
  },

  // Проверить, нужно ли остановиться
  shouldStop(jobId: string): boolean {
    return stopSignals.get(jobId) === true
  },

  // Получить прогресс активных задач
  async getRunningJobsProgress(): Promise<ForumJobProgress[]> {
    const jobs = await prisma.forumJob.findMany({
      where: { status: 'running' },
      include: { source: true },
      orderBy: { startedAt: 'desc' },
    })

    return jobs.map((job) => ({
      id: job.id,
      sourceId: job.sourceId,
      sourceName: job.source.name,
      status: job.status,
      total: job.total,
      processed: job.processed,
      newPosts: job.newPosts,
      skipped: job.skipped,
      errors: job.errors,
      errorMsg: job.errorMsg || undefined,
      startedAt: job.startedAt?.toISOString(),
      percent: job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0,
    }))
  },

  // Получить статистику задач
  async getJobsStats() {
    const [running, completed, errors] = await Promise.all([
      prisma.forumJob.count({ where: { status: 'running' } }),
      prisma.forumJob.count({ where: { status: 'completed' } }),
      prisma.forumJob.count({ where: { status: 'error' } }),
    ])
    return { running, completed, errors }
  },
}
