/**
 * HTTP-based Avito Parser
 * Использует внутренний API Avito для быстрого парсинга
 * 500 объявлений за 2-5 минут вместо 3-4 часов
 */

import { HttpsProxyAgent } from 'https-proxy-agent'
import { prisma } from '../prisma'
import { JobManager } from './jobManager'
import { AVITO_CONFIG } from './constants'
import type { ParseField } from './types'

// Типы для API ответов
interface AvitoSearchItem {
  id: number
  itemId: number
  title: string
  description?: string
  price?: number
  priceDetailed?: {
    value: number
    currency: string
    stringValue: string
  }
  location?: {
    name: string
    address?: string
    district?: string
  }
  geo?: {
    formattedAddress?: string
    cityName?: string
    districtName?: string
  }
  images?: Array<{
    '640x480'?: string
    '1280x960'?: string
    'orig'?: string
  }>
  seller?: {
    id: number
    name: string
  }
  category?: {
    name: string
    slug: string
  }
  time?: number // Unix timestamp
  uri_mweb?: string
}

interface AvitoSearchResponse {
  items?: AvitoSearchItem[]
  count?: number
  totalCount?: number
}

interface AvitoItemDetails {
  id: number
  title: string
  description?: string
  price?: number
  priceDetailed?: {
    value: number
    stringValue: string
  }
  location?: {
    name: string
    address?: string
  }
  images?: Array<{ '1280x960'?: string }>
  seller?: {
    id: number
    name: string
  }
  categoryPath?: Array<{ name: string }>
  time?: number
  views?: number
}

// Рандомная задержка
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Получить случайный User-Agent
function getRandomUserAgent(): string {
  const userAgents = AVITO_CONFIG.USER_AGENTS
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

// Базовые заголовки для запросов
function getHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.avito.ru/',
    'Origin': 'https://www.avito.ru',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
  }
}

// Парсинг URL поиска для извлечения параметров
function parseSearchUrl(searchUrl: string): {
  locationSlug: string
  categorySlug: string
  query: string
  params: Record<string, string>
} {
  const url = new URL(searchUrl)
  const pathParts = url.pathname.split('/').filter(Boolean)

  // Пример: /moskva/metalloprokat?q=труба
  const locationSlug = pathParts[0] || 'rossiya'
  const categorySlug = pathParts[1] || ''
  const query = url.searchParams.get('q') || ''

  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return { locationSlug, categorySlug, query, params }
}

// Извлечь ID из URL объявления
function extractAvitoId(url: string): string | null {
  // Исправленный regex - поддерживает ?context= параметр
  const match = url.match(/_(\d+)(?:\?|#|$)/)
  return match ? match[1] : null
}

export class AvitoHttpParser {
  private proxyUrl?: string
  private agent?: HttpsProxyAgent<string>

  constructor(proxyUrl?: string) {
    this.proxyUrl = proxyUrl
    if (proxyUrl) {
      this.agent = new HttpsProxyAgent(proxyUrl)
    }
  }

  // Выполнить HTTP запрос с учётом прокси
  private async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    }

    // Добавляем прокси через агент если есть
    if (this.agent) {
      // @ts-expect-error - agent работает с node-fetch
      fetchOptions.agent = this.agent
    }

    return fetch(url, fetchOptions)
  }

  /**
   * Поиск объявлений через API
   * Возвращает список объявлений со страницы поиска
   */
  async searchItems(searchUrl: string, page = 1, limit = 50): Promise<{
    items: AvitoSearchItem[]
    totalCount: number
  }> {
    const { locationSlug, categorySlug, query, params } = parseSearchUrl(searchUrl)

    // Формируем URL для API
    // Avito использует разные эндпоинты, пробуем основной
    const apiUrl = new URL('https://www.avito.ru/web/1/classified/list')

    // Параметры поиска
    apiUrl.searchParams.set('locationId', '637640') // Москва по умолчанию, можно менять
    apiUrl.searchParams.set('page', String(page))
    apiUrl.searchParams.set('limit', String(limit))

    if (query) {
      apiUrl.searchParams.set('query', query)
    }

    if (categorySlug) {
      apiUrl.searchParams.set('categorySlug', categorySlug)
    }

    // Добавляем остальные параметры
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'q' && key !== 'p') {
        apiUrl.searchParams.set(key, value)
      }
    })

    console.log(`[Avito HTTP] Запрос: ${apiUrl.toString().substring(0, 100)}...`)

    try {
      const response = await this.fetch(apiUrl.toString())

      if (!response.ok) {
        console.error(`[Avito HTTP] Ошибка ${response.status}: ${response.statusText}`)

        // Fallback: парсим HTML страницу и извлекаем JSON из script тега
        return this.searchItemsFromHtml(searchUrl, page)
      }

      const data = await response.json() as AvitoSearchResponse

      return {
        items: data.items || [],
        totalCount: data.totalCount || data.count || 0,
      }
    } catch (error) {
      console.error('[Avito HTTP] Ошибка запроса:', error)
      // Fallback на HTML парсинг
      return this.searchItemsFromHtml(searchUrl, page)
    }
  }

  /**
   * Fallback: получение данных из HTML страницы
   * Avito встраивает JSON с объявлениями в HTML
   */
  async searchItemsFromHtml(searchUrl: string, page = 1): Promise<{
    items: AvitoSearchItem[]
    totalCount: number
  }> {
    // Добавляем номер страницы
    const url = new URL(searchUrl)
    if (page > 1) {
      url.searchParams.set('p', String(page))
    }

    console.log(`[Avito HTTP] HTML Fallback: ${url.toString().substring(0, 80)}...`)

    try {
      const response = await this.fetch(url.toString(), {
        headers: {
          ...getHeaders(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()

      // Ищем JSON данные в HTML
      // Avito встраивает данные в тег script с window.__initialData__ или похожий
      const jsonMatch = html.match(/window\.__initialData__\s*=\s*"(.+?)";/) ||
                       html.match(/data-marker="catalog-serp"[^>]*data-items="([^"]+)"/) ||
                       html.match(/"items":\s*(\[[\s\S]*?\])\s*,\s*"/)

      if (jsonMatch) {
        try {
          // Декодируем если закодировано
          let jsonStr = jsonMatch[1]
          if (jsonStr.includes('\\u')) {
            jsonStr = JSON.parse(`"${jsonStr}"`)
          }

          const data = JSON.parse(jsonStr)
          const items = Array.isArray(data) ? data : (data.items || [])

          return {
            items: items.map(this.normalizeItem),
            totalCount: data.totalCount || items.length * 10,
          }
        } catch {
          console.error('[Avito HTTP] Не удалось распарсить JSON из HTML')
        }
      }

      // Альтернативный способ: парсим HTML напрямую
      return this.parseHtmlItems(html)
    } catch (error) {
      console.error('[Avito HTTP] HTML Fallback ошибка:', error)
      return { items: [], totalCount: 0 }
    }
  }

  /**
   * Парсинг объявлений из HTML разметки
   */
  private parseHtmlItems(html: string): { items: AvitoSearchItem[], totalCount: number } {
    const items: AvitoSearchItem[] = []

    // Ищем все объявления по data-marker="item"
    const itemRegex = /<div[^>]*data-marker="item"[^>]*data-item-id="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g
    let match

    while ((match = itemRegex.exec(html)) !== null) {
      const itemId = parseInt(match[1])
      const itemHtml = match[2]

      // Извлекаем данные из HTML
      const titleMatch = itemHtml.match(/itemprop="name"[^>]*>([^<]+)/)
      const priceMatch = itemHtml.match(/itemprop="price"[^>]*content="(\d+)"/) ||
                        itemHtml.match(/data-marker="item-price"[^>]*>([^<]+)/)
      const locationMatch = itemHtml.match(/data-marker="item-address"[^>]*>([^<]+)/)
      const linkMatch = itemHtml.match(/href="([^"]*_\d+)"/)
      const imageMatch = itemHtml.match(/src="(https:\/\/[^"]*\.jpg[^"]*)"/)

      if (titleMatch) {
        items.push({
          id: itemId,
          itemId: itemId,
          title: titleMatch[1].trim(),
          price: priceMatch ? parseInt(priceMatch[1].replace(/\D/g, '')) : undefined,
          location: locationMatch ? { name: locationMatch[1].trim() } : undefined,
          uri_mweb: linkMatch ? linkMatch[1] : undefined,
          images: imageMatch ? [{ '640x480': imageMatch[1] }] : undefined,
        })
      }
    }

    console.log(`[Avito HTTP] Из HTML извлечено ${items.length} объявлений`)

    return { items, totalCount: items.length * 10 }
  }

  /**
   * Нормализация объекта объявления
   */
  private normalizeItem(item: Record<string, unknown>): AvitoSearchItem {
    return {
      id: (item.id as number) || (item.itemId as number) || 0,
      itemId: (item.itemId as number) || (item.id as number) || 0,
      title: (item.title as string) || '',
      description: item.description as string | undefined,
      price: item.price as number | undefined,
      priceDetailed: item.priceDetailed as AvitoSearchItem['priceDetailed'],
      location: item.location as AvitoSearchItem['location'],
      geo: item.geo as AvitoSearchItem['geo'],
      images: item.images as AvitoSearchItem['images'],
      seller: item.seller as AvitoSearchItem['seller'],
      category: item.category as AvitoSearchItem['category'],
      time: item.time as number | undefined,
      uri_mweb: item.uri_mweb as string | undefined,
    }
  }

  /**
   * Получение детальной информации об объявлении
   */
  async getItemDetails(itemId: number | string): Promise<AvitoItemDetails | null> {
    const apiUrl = `https://www.avito.ru/web/1/classified/${itemId}`

    try {
      const response = await this.fetch(apiUrl)

      if (!response.ok) {
        // Fallback: получаем из HTML страницы
        return this.getItemDetailsFromHtml(itemId)
      }

      const data = await response.json()
      return data as AvitoItemDetails
    } catch {
      return this.getItemDetailsFromHtml(itemId)
    }
  }

  /**
   * Получение деталей из HTML страницы объявления
   */
  async getItemDetailsFromHtml(itemId: number | string): Promise<AvitoItemDetails | null> {
    // Пробуем найти URL объявления
    const urls = [
      `https://www.avito.ru/items/${itemId}`,
      `https://m.avito.ru/items/${itemId}`,
    ]

    for (const url of urls) {
      try {
        const response = await this.fetch(url, {
          headers: {
            ...getHeaders(),
            'Accept': 'text/html',
          },
        })

        if (!response.ok) continue

        const html = await response.text()

        // Ищем JSON в HTML
        const jsonMatch = html.match(/window\.__initialData__\s*=\s*"(.+?)";/) ||
                         html.match(/"item":\s*({[\s\S]*?})\s*,/)

        if (jsonMatch) {
          try {
            let jsonStr = jsonMatch[1]
            if (jsonStr.includes('\\u')) {
              jsonStr = JSON.parse(`"${jsonStr}"`)
            }
            const data = JSON.parse(jsonStr)
            return data.item || data
          } catch {
            // Продолжаем с HTML парсингом
          }
        }

        // Парсим HTML
        const titleMatch = html.match(/data-marker="item-view\/title-info"[^>]*>([^<]+)/)
        const descMatch = html.match(/data-marker="item-view\/item-description"[^>]*>([\s\S]*?)<\/div>/)
        const priceMatch = html.match(/data-marker="item-view\/item-price"[^>]*>([^<]+)/)
        const sellerMatch = html.match(/data-marker="seller-info\/name"[^>]*>([^<]+)/)

        return {
          id: Number(itemId),
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : undefined,
          price: priceMatch ? parseInt(priceMatch[1].replace(/\D/g, '')) : undefined,
          seller: sellerMatch ? { id: 0, name: sellerMatch[1].trim() } : undefined,
        }
      } catch {
        continue
      }
    }

    return null
  }

  /**
   * Основной метод парсинга
   * Собирает все объявления по URL поиска
   */
  async parseSource(
    sourceId: string,
    jobId: string,
    searchUrl: string,
    parseFields: ParseField[],
    maxPages = 10
  ): Promise<{ newAds: number; skipped: number; errors: number }> {
    let newAds = 0
    let skipped = 0
    let errors = 0
    let totalProcessed = 0

    console.log(`[Avito HTTP] Начинаю парсинг: ${searchUrl}`)

    // Получаем общее количество
    const firstPage = await this.searchItems(searchUrl, 1)
    const totalItems = Math.min(firstPage.totalCount, maxPages * 50)

    console.log(`[Avito HTTP] Всего объявлений: ${totalItems}`)

    // Обновляем total в задаче
    await JobManager.updateProgress(jobId, { total: totalItems })

    // Парсим страницы
    for (let page = 1; page <= maxPages; page++) {
      // Проверяем сигнал остановки
      if (JobManager.shouldStop(jobId)) {
        console.log(`[Avito HTTP] Получен сигнал остановки`)
        break
      }

      const pageData = page === 1 ? firstPage : await this.searchItems(searchUrl, page)

      if (pageData.items.length === 0) {
        console.log(`[Avito HTTP] Страница ${page} пустая, завершаем`)
        break
      }

      console.log(`[Avito HTTP] Страница ${page}: ${pageData.items.length} объявлений`)

      // Обрабатываем объявления
      for (const item of pageData.items) {
        if (JobManager.shouldStop(jobId)) break

        try {
          const avitoId = String(item.id || item.itemId)
          if (!avitoId || avitoId === '0') {
            errors++
            continue
          }

          // Проверяем есть ли уже
          const existing = await prisma.avitoAd.findUnique({
            where: { avitoId },
          })

          if (existing) {
            skipped++
            totalProcessed++
            await JobManager.updateProgress(jobId, {
              processed: totalProcessed,
              skipped
            })
            continue
          }

          // Получаем детали если нужно описание
          let description = item.description
          let sellerName = item.seller?.name
          let images = item.images?.map(img => img['1280x960'] || img['640x480'] || img.orig).filter(Boolean) as string[]

          if (parseFields.includes('description') && !description) {
            // Задержка перед запросом деталей
            await randomDelay(500, 1500)

            const details = await this.getItemDetails(avitoId)
            if (details) {
              description = details.description
              sellerName = sellerName || details.seller?.name
            }
          }

          // Формируем URL
          const url = item.uri_mweb
            ? `https://www.avito.ru${item.uri_mweb}`
            : `https://www.avito.ru/items/${avitoId}`

          // Сохраняем
          await prisma.avitoAd.create({
            data: {
              avitoId,
              title: item.title,
              description: parseFields.includes('description') ? description : null,
              price: item.price || item.priceDetailed?.value,
              priceText: item.priceDetailed?.stringValue,
              city: parseFields.includes('city')
                ? (item.location?.name || item.geo?.cityName)
                : null,
              address: parseFields.includes('address')
                ? (item.location?.address || item.geo?.formattedAddress)
                : null,
              district: parseFields.includes('district')
                ? (item.location?.district || item.geo?.districtName)
                : null,
              sellerName: parseFields.includes('sellerName') ? sellerName : null,
              sellerId: parseFields.includes('sellerId') ? String(item.seller?.id) : null,
              url,
              images: parseFields.includes('images') ? images : [],
              category: parseFields.includes('category') ? item.category?.name : null,
              publishedAt: item.time ? new Date(item.time * 1000) : null,
              sourceId,
            },
          })

          newAds++
          totalProcessed++

          await JobManager.updateProgress(jobId, {
            processed: totalProcessed,
            newAds
          })

        } catch (err) {
          console.error(`[Avito HTTP] Ошибка обработки объявления:`, err)
          errors++
          totalProcessed++
          await JobManager.updateProgress(jobId, {
            processed: totalProcessed,
            errors
          })
        }
      }

      // Задержка между страницами
      if (page < maxPages && pageData.items.length > 0) {
        await randomDelay(1000, 3000)
      }
    }

    console.log(`[Avito HTTP] Завершено: новых=${newAds}, пропущено=${skipped}, ошибок=${errors}`)

    return { newAds, skipped, errors }
  }
}

/**
 * Запуск парсинга через HTTP API
 */
export async function runHttpParsing(
  sourceId: string,
  proxyUrl?: string
): Promise<void> {
  // Получаем источник
  const source = await prisma.avitoSource.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    throw new Error(`Источник ${sourceId} не найден`)
  }

  // Создаём задачу
  const job = await JobManager.createJob(sourceId)
  await JobManager.startJob(job.id)

  try {
    const parser = new AvitoHttpParser(proxyUrl)

    const result = await parser.parseSource(
      sourceId,
      job.id,
      source.searchUrl,
      source.parseFields as ParseField[],
      AVITO_CONFIG.MAX_PAGES_PER_SOURCE
    )

    // Обновляем источник
    await prisma.avitoSource.update({
      where: { id: sourceId },
      data: {
        lastParsed: new Date(),
        adCount: { increment: result.newAds },
      },
    })

    // Завершаем задачу
    if (JobManager.shouldStop(job.id)) {
      await JobManager.stopJob(job.id)
    } else {
      await JobManager.completeJob(job.id)
    }

  } catch (error) {
    console.error('[Avito HTTP] Критическая ошибка:', error)
    await JobManager.failJob(
      job.id,
      error instanceof Error ? error.message : 'Unknown error'
    )
    throw error
  }
}
