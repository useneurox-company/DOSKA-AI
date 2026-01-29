import { prisma } from '../prisma'
import type { AvitoJob, AvitoSource } from '@prisma/client'
import type { JobProgress } from './types'
import { JOB_STATUS } from './constants'

// Хранилище для сигналов остановки
const stopSignals = new Map<string, boolean>()

// Менеджер задач парсинга Avito
export class JobManager {
  // Создать задачу
  static async createJob(sourceId: string, proxyId?: string): Promise<AvitoJob> {
    return prisma.avitoJob.create({
      data: {
        sourceId,
        proxyId,
        status: JOB_STATUS.PENDING,
      },
    })
  }

  // Запустить задачу
  static async startJob(jobId: string): Promise<AvitoJob> {
    stopSignals.set(jobId, false)
    return prisma.avitoJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.RUNNING,
        startedAt: new Date(),
      },
    })
  }

  // Обновить прогресс
  static async updateProgress(
    jobId: string,
    progress: {
      total?: number
      processed?: number
      newAds?: number
      skipped?: number
      errors?: number
    }
  ): Promise<AvitoJob> {
    return prisma.avitoJob.update({
      where: { id: jobId },
      data: progress,
    })
  }

  // Завершить задачу успешно
  static async completeJob(jobId: string): Promise<AvitoJob> {
    stopSignals.delete(jobId)
    return prisma.avitoJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.COMPLETED,
        completedAt: new Date(),
      },
    })
  }

  // Остановить задачу
  static async stopJob(jobId: string): Promise<AvitoJob> {
    stopSignals.set(jobId, true)
    return prisma.avitoJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.STOPPED,
        stoppedAt: new Date(),
      },
    })
  }

  // Завершить задачу с ошибкой
  static async failJob(jobId: string, errorMsg: string): Promise<AvitoJob> {
    stopSignals.delete(jobId)
    return prisma.avitoJob.update({
      where: { id: jobId },
      data: {
        status: JOB_STATUS.ERROR,
        errorMsg,
        completedAt: new Date(),
      },
    })
  }

  // Проверить, нужно ли остановить задачу
  static shouldStop(jobId: string): boolean {
    return stopSignals.get(jobId) === true
  }

  // Остановить все задачи
  static async stopAllJobs(): Promise<number> {
    // Устанавливаем сигналы остановки для всех запущенных задач
    const runningJobs = await prisma.avitoJob.findMany({
      where: { status: JOB_STATUS.RUNNING },
    })

    for (const job of runningJobs) {
      stopSignals.set(job.id, true)
    }

    // Обновляем статусы в БД
    const result = await prisma.avitoJob.updateMany({
      where: { status: JOB_STATUS.RUNNING },
      data: {
        status: JOB_STATUS.STOPPED,
        stoppedAt: new Date(),
      },
    })

    return result.count
  }

  // Получить задачу по ID
  static async getJob(jobId: string): Promise<AvitoJob | null> {
    return prisma.avitoJob.findUnique({
      where: { id: jobId },
    })
  }

  // Получить задачу с источником
  static async getJobWithSource(jobId: string): Promise<(AvitoJob & { source: AvitoSource }) | null> {
    return prisma.avitoJob.findUnique({
      where: { id: jobId },
      include: { source: true },
    })
  }

  // Получить все запущенные задачи
  static async getRunningJobs(): Promise<AvitoJob[]> {
    return prisma.avitoJob.findMany({
      where: { status: JOB_STATUS.RUNNING },
      include: { source: true },
      orderBy: { startedAt: 'desc' },
    })
  }

  // Получить прогресс всех запущенных задач
  static async getRunningJobsProgress(): Promise<JobProgress[]> {
    const jobs = await prisma.avitoJob.findMany({
      where: { status: JOB_STATUS.RUNNING },
      include: { source: true },
      orderBy: { startedAt: 'desc' },
    })

    // Получаем имена прокси
    const proxyIds = jobs.map(j => j.proxyId).filter(Boolean) as string[]
    const proxies = proxyIds.length > 0
      ? await prisma.avitoProxy.findMany({
          where: { id: { in: proxyIds } },
        })
      : []
    const proxyMap = new Map(proxies.map(p => [p.id, p.name]))

    return jobs.map(job => ({
      id: job.id,
      sourceId: job.sourceId,
      sourceName: job.source.name,
      status: job.status as JobProgress['status'],
      total: job.total,
      processed: job.processed,
      newAds: job.newAds,
      skipped: job.skipped,
      errors: job.errors,
      proxyName: job.proxyId ? proxyMap.get(job.proxyId) : undefined,
      errorMsg: job.errorMsg || undefined,
      startedAt: job.startedAt || undefined,
      percent: job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0,
    }))
  }

  // Получить последние задачи
  static async getRecentJobs(limit = 20): Promise<AvitoJob[]> {
    return prisma.avitoJob.findMany({
      include: { source: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  // Получить задачи по источнику
  static async getJobsBySource(sourceId: string): Promise<AvitoJob[]> {
    return prisma.avitoJob.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Очистить старые завершённые задачи (старше N дней)
  static async cleanOldJobs(daysOld = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.avitoJob.deleteMany({
      where: {
        status: { in: [JOB_STATUS.COMPLETED, JOB_STATUS.STOPPED, JOB_STATUS.ERROR] },
        createdAt: { lt: cutoffDate },
      },
    })

    return result.count
  }

  // Статистика задач
  static async getJobsStats(): Promise<{
    running: number
    pending: number
    completed: number
    stopped: number
    error: number
    totalToday: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [running, pending, completed, stopped, error, totalToday] = await Promise.all([
      prisma.avitoJob.count({ where: { status: JOB_STATUS.RUNNING } }),
      prisma.avitoJob.count({ where: { status: JOB_STATUS.PENDING } }),
      prisma.avitoJob.count({ where: { status: JOB_STATUS.COMPLETED } }),
      prisma.avitoJob.count({ where: { status: JOB_STATUS.STOPPED } }),
      prisma.avitoJob.count({ where: { status: JOB_STATUS.ERROR } }),
      prisma.avitoJob.count({ where: { createdAt: { gte: today } } }),
    ])

    return { running, pending, completed, stopped, error, totalToday }
  }
}
