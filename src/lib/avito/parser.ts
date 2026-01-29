import puppeteer, { Browser, Page } from 'puppeteer'
import { prisma } from '../prisma'
import type { AvitoSource } from '@prisma/client'
import type { ParsedAd, ParseField } from './types'
import { AVITO_CONFIG, PARSE_FIELDS } from './constants'
import { ProxyManager } from './proxyManager'
import { JobManager } from './jobManager'

// Утилита для случайной задержки
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Получить случайный User-Agent
function getRandomUserAgent(): string {
  const agents = AVITO_CONFIG.USER_AGENTS
  return agents[Math.floor(Math.random() * agents.length)]
}

// Извлечь Avito ID из URL
function extractAvitoId(url: string): string | null {
  // URL формата: https://www.avito.ru/moskva/metalloprokat/truba_profilnaya_60h40_123456789
  // Или с параметрами: ...123456789?context=...
  const match = url.match(/_(\d+)(?:\?|#|$)/)
  if (!match) {
    console.log(`[Avito] Не удалось извлечь ID из URL: ${url.substring(0, 80)}...`)
  }
  return match ? match[1] : null
}

// Основной класс парсера
export class AvitoParser {
  private browser: Browser | null = null
  private page: Page | null = null
  private proxyUrl: string | null = null
  private jobId: string
  private sourceId: string
  private parseFields: ParseField[]

  constructor(jobId: string, sourceId: string, parseFields: ParseField[], proxyUrl?: string) {
    this.jobId = jobId
    this.sourceId = sourceId
    this.parseFields = parseFields
    this.proxyUrl = proxyUrl || null
  }

  // Запустить браузер
  async launchBrowser(): Promise<void> {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${AVITO_CONFIG.VIEWPORT.width},${AVITO_CONFIG.VIEWPORT.height}`,
    ]

    // Добавить прокси если указан
    if (this.proxyUrl) {
      const proxyArg = this.getProxyArg(this.proxyUrl)
      if (proxyArg) {
        args.push(proxyArg)
      }
    }

    this.browser = await puppeteer.launch({
      headless: AVITO_CONFIG.HEADLESS,
      args,
      defaultViewport: AVITO_CONFIG.VIEWPORT,
    })

    this.page = await this.browser.newPage()

    // Установить User-Agent
    await this.page.setUserAgent(getRandomUserAgent())

    // Установить таймаут навигации
    this.page.setDefaultNavigationTimeout(AVITO_CONFIG.PAGE_LOAD_TIMEOUT)

    // Аутентификация прокси если нужно
    if (this.proxyUrl) {
      const proxyAuth = this.extractProxyAuth(this.proxyUrl)
      if (proxyAuth) {
        await this.page.authenticate(proxyAuth)
      }
    }

    // Блокировать ненужные ресурсы для ускорения
    await this.page.setRequestInterception(true)
    this.page.on('request', (request) => {
      const resourceType = request.resourceType()
      // Блокируем только тяжёлые ресурсы, но оставляем изображения для полноты
      if (['font', 'media'].includes(resourceType)) {
        request.abort()
      } else {
        request.continue()
      }
    })
  }

  // Извлечь данные аутентификации из URL прокси
  private extractProxyAuth(proxyUrl: string): { username: string; password: string } | null {
    try {
      const url = new URL(proxyUrl)
      if (url.username && url.password) {
        return {
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
        }
      }
    } catch {
      // Невалидный URL
    }
    return null
  }

  // Получить аргумент прокси для Puppeteer
  private getProxyArg(proxyUrl: string): string | null {
    try {
      const url = new URL(proxyUrl)
      // Формат: --proxy-server=host:port
      return `--proxy-server=${url.hostname}:${url.port}`
    } catch {
      return null
    }
  }

  // Закрыть браузер
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  // Парсить страницу поиска и получить ссылки на объявления
  async parseSearchPage(searchUrl: string, pageNum: number = 1): Promise<string[]> {
    if (!this.page) throw new Error('Browser not launched')

    // Добавить номер страницы к URL
    const url = new URL(searchUrl)
    if (pageNum > 1) {
      url.searchParams.set('p', String(pageNum))
    }

    console.log(`[Avito] Открываю страницу поиска: ${url.toString()}`)

    await this.page.goto(url.toString(), { waitUntil: 'networkidle2' })

    // Подождать загрузки объявлений
    try {
      await this.page.waitForSelector(AVITO_CONFIG.SELECTORS.AD_ITEM, {
        timeout: AVITO_CONFIG.ELEMENT_WAIT_TIMEOUT,
      })
    } catch {
      console.log('[Avito] Объявления не найдены на странице')
      return []
    }

    // Собрать ссылки на объявления
    const links = await this.page.evaluate((selectors) => {
      const items = document.querySelectorAll(selectors.AD_ITEM)
      const urls: string[] = []

      items.forEach((item) => {
        const link = item.querySelector(selectors.AD_LINK) as HTMLAnchorElement
        if (link && link.href) {
          urls.push(link.href)
        }
      })

      return urls
    }, AVITO_CONFIG.SELECTORS)

    console.log(`[Avito] Найдено ${links.length} объявлений на странице ${pageNum}`)

    return links
  }

  // Проверить есть ли следующая страница
  async hasNextPage(): Promise<boolean> {
    if (!this.page) return false

    try {
      const nextButton = await this.page.$(AVITO_CONFIG.SELECTORS.NEXT_PAGE)
      return nextButton !== null
    } catch {
      return false
    }
  }

  // Парсить страницу объявления
  async parseAdPage(adUrl: string): Promise<ParsedAd | null> {
    if (!this.page) throw new Error('Browser not launched')

    const avitoId = extractAvitoId(adUrl)
    if (!avitoId) {
      console.log(`[Avito] Не удалось извлечь ID из URL: ${adUrl}`)
      return null
    }

    console.log(`[Avito] Парсинг объявления: ${avitoId}`)

    try {
      await this.page.goto(adUrl, { waitUntil: 'networkidle2' })

      // Подождать загрузки заголовка
      await this.page.waitForSelector(AVITO_CONFIG.SELECTORS.DETAIL_TITLE, {
        timeout: AVITO_CONFIG.ELEMENT_WAIT_TIMEOUT,
      })
    } catch (error) {
      console.log(`[Avito] Ошибка загрузки страницы: ${adUrl}`)
      return null
    }

    // Извлечь данные
    const data = await this.page.evaluate((selectors, fields) => {
      const result: Record<string, unknown> = {}

      // Заголовок (обязательно)
      const titleEl = document.querySelector(selectors.DETAIL_TITLE)
      result.title = titleEl?.textContent?.trim() || ''

      // Описание
      if (fields.includes('description')) {
        const descEl = document.querySelector(selectors.DETAIL_DESCRIPTION)
        result.description = descEl?.textContent?.trim() || undefined
      }

      // Цена
      if (fields.includes('price')) {
        const priceEl = document.querySelector(selectors.DETAIL_PRICE)
        const priceText = priceEl?.textContent?.trim() || ''
        result.priceText = priceText

        // Извлечь числовое значение
        const priceMatch = priceText.replace(/\s/g, '').match(/(\d+)/)
        result.price = priceMatch ? parseInt(priceMatch[1], 10) : undefined
      }

      // Город/адрес
      if (fields.includes('city') || fields.includes('address')) {
        const addressEl = document.querySelector(selectors.DETAIL_ADDRESS)
        const addressText = addressEl?.textContent?.trim() || ''

        if (fields.includes('city')) {
          // Город обычно первый элемент
          const parts = addressText.split(',')
          result.city = parts[0]?.trim() || undefined
        }

        if (fields.includes('address')) {
          result.address = addressText || undefined
        }
      }

      // Район
      if (fields.includes('district')) {
        const addressEl = document.querySelector(selectors.DETAIL_ADDRESS)
        const addressText = addressEl?.textContent?.trim() || ''
        const parts = addressText.split(',')
        result.district = parts.length > 1 ? parts[1]?.trim() : undefined
      }

      // Имя продавца
      if (fields.includes('sellerName')) {
        const sellerEl = document.querySelector(selectors.DETAIL_SELLER)
        result.sellerName = sellerEl?.textContent?.trim() || undefined
      }

      // Изображения
      if (fields.includes('images')) {
        const imageEls = document.querySelectorAll(selectors.DETAIL_IMAGES)
        const images: string[] = []
        imageEls.forEach((img) => {
          const src = (img as HTMLImageElement).src
          if (src && !src.includes('data:')) {
            // Получить полноразмерное изображение
            const fullSrc = src.replace(/\/\d+x\d+\//, '/1440x1080/')
            images.push(fullSrc)
          }
        })
        result.images = images
      }

      // Категория
      if (fields.includes('category')) {
        const categoryEl = document.querySelector(selectors.DETAIL_CATEGORY)
        result.category = categoryEl?.textContent?.trim() || undefined
      }

      // Просмотры
      if (fields.includes('views')) {
        const viewsEl = document.querySelector(selectors.DETAIL_VIEWS)
        const viewsText = viewsEl?.textContent?.trim() || ''
        const viewsMatch = viewsText.match(/(\d+)/)
        result.views = viewsMatch ? parseInt(viewsMatch[1], 10) : undefined
      }

      // Дата публикации
      if (fields.includes('publishedAt')) {
        const dateEl = document.querySelector(selectors.DETAIL_DATE)
        result.publishedAtText = dateEl?.textContent?.trim() || undefined
      }

      return result
    }, AVITO_CONFIG.SELECTORS, this.parseFields)

    // Собрать результат
    const parsedAd: ParsedAd = {
      avitoId,
      title: data.title as string || 'Без названия',
      url: adUrl,
      images: (data.images as string[]) || [],
    }

    // Добавить опциональные поля
    if (data.description) parsedAd.description = data.description as string
    if (data.price) parsedAd.price = data.price as number
    if (data.priceText) parsedAd.priceText = data.priceText as string
    if (data.city) parsedAd.city = data.city as string
    if (data.address) parsedAd.address = data.address as string
    if (data.district) parsedAd.district = data.district as string
    if (data.sellerName) parsedAd.sellerName = data.sellerName as string
    if (data.category) parsedAd.category = data.category as string
    if (data.views) parsedAd.views = data.views as number

    // Парсинг даты публикации (сложная логика из-за формата Avito)
    if (data.publishedAtText) {
      const publishedAt = this.parseAvitoDate(data.publishedAtText as string)
      if (publishedAt) parsedAd.publishedAt = publishedAt
    }

    return parsedAd
  }

  // Парсить дату Avito (сегодня, вчера, N дней назад, и т.д.)
  private parseAvitoDate(dateText: string): Date | undefined {
    const now = new Date()
    const text = dateText.toLowerCase()

    if (text.includes('сегодня') || text.includes('только что')) {
      return now
    }

    if (text.includes('вчера')) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    }

    // N дней назад
    const daysMatch = text.match(/(\d+)\s*(дн|день|дня)/)
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10)
      const date = new Date(now)
      date.setDate(date.getDate() - days)
      return date
    }

    // N недель назад
    const weeksMatch = text.match(/(\d+)\s*(недел)/)
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1], 10)
      const date = new Date(now)
      date.setDate(date.getDate() - weeks * 7)
      return date
    }

    // Конкретная дата (например "15 января")
    const months: Record<string, number> = {
      январ: 0, феврал: 1, март: 2, апрел: 3, мая: 4, май: 4, июн: 5,
      июл: 6, август: 7, сентябр: 8, октябр: 9, ноябр: 10, декабр: 11,
    }

    for (const [monthName, monthIndex] of Object.entries(months)) {
      if (text.includes(monthName)) {
        const dayMatch = text.match(/(\d{1,2})/)
        if (dayMatch) {
          const day = parseInt(dayMatch[1], 10)
          const date = new Date(now.getFullYear(), monthIndex, day)
          // Если дата в будущем, значит это прошлый год
          if (date > now) {
            date.setFullYear(date.getFullYear() - 1)
          }
          return date
        }
      }
    }

    return undefined
  }

  // Сохранить объявление в БД
  async saveAd(ad: ParsedAd): Promise<{ isNew: boolean }> {
    // Проверить существует ли уже
    const existing = await prisma.avitoAd.findUnique({
      where: { avitoId: ad.avitoId },
    })

    if (existing) {
      // Обновить существующее
      await prisma.avitoAd.update({
        where: { avitoId: ad.avitoId },
        data: {
          title: ad.title,
          description: ad.description,
          price: ad.price,
          priceText: ad.priceText,
          city: ad.city,
          address: ad.address,
          district: ad.district,
          sellerName: ad.sellerName,
          sellerId: ad.sellerId,
          url: ad.url,
          images: ad.images,
          category: ad.category,
          views: ad.views,
          publishedAt: ad.publishedAt,
          updatedAt: new Date(),
        },
      })
      return { isNew: false }
    }

    // Создать новое
    await prisma.avitoAd.create({
      data: {
        avitoId: ad.avitoId,
        title: ad.title,
        description: ad.description,
        price: ad.price,
        priceText: ad.priceText,
        city: ad.city,
        address: ad.address,
        district: ad.district,
        sellerName: ad.sellerName,
        sellerId: ad.sellerId,
        url: ad.url,
        images: ad.images,
        category: ad.category,
        views: ad.views,
        publishedAt: ad.publishedAt,
        sourceId: this.sourceId,
      },
    })

    return { isNew: true }
  }

  // Основной метод парсинга источника
  async parseSource(source: AvitoSource): Promise<void> {
    console.log(`[Avito] Начинаю парсинг источника: ${source.name}`)

    try {
      await this.launchBrowser()
      await JobManager.startJob(this.jobId)

      let totalAds = 0
      let processedAds = 0
      let newAds = 0
      let skippedAds = 0
      let errorCount = 0

      // Собрать все ссылки со всех страниц
      const allAdLinks: string[] = []
      let currentPage = 1

      while (currentPage <= AVITO_CONFIG.MAX_PAGES_PER_SOURCE) {
        // Проверить сигнал остановки
        if (JobManager.shouldStop(this.jobId)) {
          console.log(`[Avito] Получен сигнал остановки для задачи ${this.jobId}`)
          break
        }

        const links = await this.parseSearchPage(source.searchUrl, currentPage)

        if (links.length === 0) {
          break
        }

        allAdLinks.push(...links)

        // Проверить есть ли следующая страница
        const hasNext = await this.hasNextPage()
        if (!hasNext) {
          break
        }

        currentPage++

        // Задержка между страницами поиска
        await randomDelay(
          AVITO_CONFIG.DELAY_BETWEEN_PAGES.min,
          AVITO_CONFIG.DELAY_BETWEEN_PAGES.max
        )
      }

      totalAds = allAdLinks.length
      await JobManager.updateProgress(this.jobId, { total: totalAds })

      console.log(`[Avito] Всего найдено ${totalAds} объявлений`)

      // Парсить каждое объявление
      for (const adUrl of allAdLinks) {
        // Проверить сигнал остановки
        if (JobManager.shouldStop(this.jobId)) {
          console.log(`[Avito] Получен сигнал остановки для задачи ${this.jobId}`)
          break
        }

        try {
          const ad = await this.parseAdPage(adUrl)

          if (ad) {
            const { isNew } = await this.saveAd(ad)

            if (isNew) {
              newAds++
            } else {
              skippedAds++
            }
          } else {
            skippedAds++
          }
        } catch (error) {
          console.error(`[Avito] Ошибка парсинга ${adUrl}:`, error)
          errorCount++
        }

        processedAds++

        // Обновить прогресс
        await JobManager.updateProgress(this.jobId, {
          processed: processedAds,
          newAds,
          skipped: skippedAds,
          errors: errorCount,
        })

        // Задержка между объявлениями
        if (processedAds < totalAds) {
          await randomDelay(
            AVITO_CONFIG.DELAY_BETWEEN_ADS.min,
            AVITO_CONFIG.DELAY_BETWEEN_ADS.max
          )
        }
      }

      // Проверить был ли это стоп или завершение
      if (JobManager.shouldStop(this.jobId)) {
        console.log(`[Avito] Задача ${this.jobId} остановлена`)
      } else {
        await JobManager.completeJob(this.jobId)
        console.log(`[Avito] Задача ${this.jobId} завершена успешно`)
      }

      // Обновить статистику источника
      const adCount = await prisma.avitoAd.count({
        where: { sourceId: this.sourceId },
      })

      await prisma.avitoSource.update({
        where: { id: this.sourceId },
        data: {
          lastParsed: new Date(),
          adCount,
        },
      })

    } catch (error) {
      console.error(`[Avito] Критическая ошибка:`, error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      await JobManager.failJob(this.jobId, errorMsg)
    } finally {
      await this.closeBrowser()
    }
  }
}

// Запустить парсинг источника (вызывается из API)
export async function startParsing(
  sourceId: string,
  proxyId?: string
): Promise<{ jobId: string }> {
  // Получить источник
  const source = await prisma.avitoSource.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    throw new Error(`Источник не найден: ${sourceId}`)
  }

  if (!source.isActive) {
    throw new Error(`Источник неактивен: ${source.name}`)
  }

  // Получить прокси если указан
  let proxyUrl: string | undefined

  if (proxyId) {
    const proxy = await prisma.avitoProxy.findUnique({
      where: { id: proxyId },
    })
    if (proxy && proxy.isActive) {
      proxyUrl = proxy.url
    }
  } else if (source.proxyId) {
    // Использовать прокси из настроек источника
    const proxy = await prisma.avitoProxy.findUnique({
      where: { id: source.proxyId },
    })
    if (proxy && proxy.isActive) {
      proxyUrl = proxy.url
    }
  }

  // Создать задачу
  const job = await JobManager.createJob(sourceId, proxyId || source.proxyId || undefined)

  // Запустить парсинг асинхронно
  const parseFields = (source.parseFields || []) as ParseField[]
  const parser = new AvitoParser(job.id, sourceId, parseFields, proxyUrl)

  // Не ждём завершения - парсинг идёт в фоне
  parser.parseSource(source).catch((error) => {
    console.error(`[Avito] Ошибка парсинга источника ${sourceId}:`, error)
  })

  return { jobId: job.id }
}

// Запустить парсинг нескольких источников параллельно
export async function startParallelParsing(
  sourceIds: string[]
): Promise<{ jobs: Array<{ sourceId: string; jobId: string }> }> {
  // Получить источники
  const sources = await prisma.avitoSource.findMany({
    where: {
      id: { in: sourceIds },
      isActive: true,
    },
  })

  if (sources.length === 0) {
    throw new Error('Нет активных источников для парсинга')
  }

  // Распределить источники по прокси
  const distribution = await ProxyManager.distributeSourcesByProxy(sourceIds)

  const jobs: Array<{ sourceId: string; jobId: string }> = []

  // Запустить парсинг для каждого источника с распределёнными прокси
  for (const [proxyId, srcIds] of distribution) {
    for (const sourceId of srcIds) {
      try {
        const result = await startParsing(sourceId, proxyId || undefined)
        jobs.push({
          sourceId,
          jobId: result.jobId,
        })
      } catch (error) {
        const source = sources.find(s => s.id === sourceId)
        console.error(`[Avito] Не удалось запустить парсинг для ${source?.name || sourceId}:`, error)
      }

      // Небольшая задержка между запусками чтобы не перегружать систему
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return { jobs }
}

// Остановить задачу
export async function stopParsing(jobId: string): Promise<void> {
  await JobManager.stopJob(jobId)
}

// Остановить все задачи
export async function stopAllParsing(): Promise<number> {
  return JobManager.stopAllJobs()
}
