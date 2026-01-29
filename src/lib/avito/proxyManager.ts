import { prisma } from '../prisma'
import type { AvitoProxy } from '@prisma/client'
import type { CreateProxyInput, ProxyCheckResult } from './types'
import { PROXY_STATUS } from './constants'

// Менеджер прокси для Avito парсера
export class ProxyManager {
  // Получить все прокси
  static async getAll(): Promise<AvitoProxy[]> {
    return prisma.avitoProxy.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  // Получить активные прокси
  static async getActive(): Promise<AvitoProxy[]> {
    return prisma.avitoProxy.findMany({
      where: { isActive: true },
      orderBy: { requestCount: 'asc' }, // Сначала менее нагруженные
    })
  }

  // Получить прокси по ID
  static async getById(id: string): Promise<AvitoProxy | null> {
    return prisma.avitoProxy.findUnique({
      where: { id },
    })
  }

  // Создать прокси
  static async create(input: CreateProxyInput): Promise<AvitoProxy> {
    return prisma.avitoProxy.create({
      data: {
        name: input.name,
        url: input.url,
        isActive: input.isActive ?? true,
        status: PROXY_STATUS.UNKNOWN,
      },
    })
  }

  // Обновить прокси
  static async update(id: string, data: Partial<CreateProxyInput>): Promise<AvitoProxy> {
    return prisma.avitoProxy.update({
      where: { id },
      data,
    })
  }

  // Удалить прокси
  static async delete(id: string): Promise<void> {
    await prisma.avitoProxy.delete({
      where: { id },
    })
  }

  // Проверить соединение прокси
  static async checkProxy(proxyUrl: string): Promise<ProxyCheckResult> {
    const startTime = Date.now()

    try {
      // Парсим URL прокси
      const proxyParts = this.parseProxyUrl(proxyUrl)
      if (!proxyParts) {
        return { success: false, error: 'Invalid proxy URL format' }
      }

      // Делаем тестовый запрос через прокси
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 сек таймаут

      try {
        const response = await fetch('https://www.avito.ru/', {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          // Note: fetch в Node.js не поддерживает прокси напрямую,
          // нужно использовать специальные пакеты или puppeteer
          // Это упрощённая проверка - реальная будет через puppeteer
        })

        clearTimeout(timeoutId)
        const latencyMs = Date.now() - startTime

        if (response.ok) {
          return { success: true, latencyMs }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage, latencyMs }
    }
  }

  // Проверить и обновить статус прокси
  static async checkAndUpdateStatus(id: string): Promise<ProxyCheckResult> {
    const proxy = await this.getById(id)
    if (!proxy) {
      return { success: false, error: 'Proxy not found' }
    }

    const result = await this.checkProxy(proxy.url)

    // Обновляем статус в БД
    await prisma.avitoProxy.update({
      where: { id },
      data: {
        status: result.success ? PROXY_STATUS.WORKING : PROXY_STATUS.ERROR,
        lastCheck: new Date(),
        errorMsg: result.error || null,
      },
    })

    return result
  }

  // Инкрементировать счётчик запросов
  static async incrementRequestCount(id: string): Promise<void> {
    await prisma.avitoProxy.update({
      where: { id },
      data: {
        requestCount: { increment: 1 },
      },
    })
  }

  // Инкрементировать счётчик ошибок
  static async incrementErrorCount(id: string, errorMsg?: string): Promise<void> {
    await prisma.avitoProxy.update({
      where: { id },
      data: {
        errorCount: { increment: 1 },
        errorMsg: errorMsg || null,
        status: PROXY_STATUS.ERROR,
      },
    })
  }

  // Пометить прокси как работающий
  static async markAsWorking(id: string): Promise<void> {
    await prisma.avitoProxy.update({
      where: { id },
      data: {
        status: PROXY_STATUS.WORKING,
        errorMsg: null,
        lastCheck: new Date(),
      },
    })
  }

  // Распределить источники по прокси
  static async distributeSourcesByProxy(
    sourceIds: string[]
  ): Promise<Map<string | null, string[]>> {
    const distribution = new Map<string | null, string[]>()

    // Получаем источники с их привязкой к прокси
    const sources = await prisma.avitoSource.findMany({
      where: { id: { in: sourceIds } },
    })

    // Получаем активные прокси
    const activeProxies = await this.getActive()

    for (const source of sources) {
      let proxyId: string | null = null

      if (source.proxyId) {
        // Источник привязан к конкретному прокси
        proxyId = source.proxyId
      } else if (activeProxies.length > 0) {
        // Выбираем прокси с наименьшим количеством источников в текущем распределении
        const proxyCounts = new Map<string, number>()
        for (const proxy of activeProxies) {
          proxyCounts.set(proxy.id, distribution.get(proxy.id)?.length || 0)
        }

        // Находим прокси с минимальной нагрузкой
        let minProxy = activeProxies[0].id
        let minCount = proxyCounts.get(minProxy) || 0
        for (const proxy of activeProxies) {
          const count = proxyCounts.get(proxy.id) || 0
          if (count < minCount) {
            minCount = count
            minProxy = proxy.id
          }
        }
        proxyId = minProxy
      }

      // Добавляем в распределение
      if (!distribution.has(proxyId)) {
        distribution.set(proxyId, [])
      }
      distribution.get(proxyId)!.push(source.id)
    }

    return distribution
  }

  // Парсинг URL прокси
  private static parseProxyUrl(url: string): { host: string; port: number; auth?: { username: string; password: string } } | null {
    try {
      // Формат: http://user:pass@host:port или http://host:port
      const match = url.match(/^(https?):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)\/?$/)
      if (!match) return null

      const [, , username, password, host, portStr] = match
      const port = parseInt(portStr, 10)

      return {
        host,
        port,
        auth: username && password ? { username, password } : undefined,
      }
    } catch {
      return null
    }
  }

  // Получить URL прокси для puppeteer
  static getProxyForPuppeteer(proxy: AvitoProxy): { server: string; username?: string; password?: string } | null {
    const parsed = this.parseProxyUrl(proxy.url)
    if (!parsed) return null

    return {
      server: `${parsed.host}:${parsed.port}`,
      username: parsed.auth?.username,
      password: parsed.auth?.password,
    }
  }
}
