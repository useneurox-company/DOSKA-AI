import puppeteer, { Browser, Page } from 'puppeteer'
import { prisma } from '@/lib/prisma'
import { ForumJobManager, stopSignals } from './jobManager'
import { FORUM_CONFIG, FORUM_PATTERNS } from './constants'
import { ParsedForumPost, ForumSelectors } from './types'

// Хелпер: случайная задержка
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, delay))
}

// Хелпер: случайный User-Agent
function getRandomUserAgent(): string {
  return FORUM_CONFIG.USER_AGENTS[Math.floor(Math.random() * FORUM_CONFIG.USER_AGENTS.length)]
}

// Класс парсера форумов
export class ForumParser {
  private browser: Browser | null = null
  private page: Page | null = null
  private jobId: string
  private sourceId: string
  private parseFields: string[]
  private selectors: ForumSelectors
  private proxyUrl?: string

  constructor(
    jobId: string,
    sourceId: string,
    parseFields: string[],
    selectors: ForumSelectors,
    proxyUrl?: string
  ) {
    this.jobId = jobId
    this.sourceId = sourceId
    this.parseFields = parseFields
    this.selectors = selectors
    this.proxyUrl = proxyUrl
  }

  // Запуск браузера
  async launchBrowser() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
    ]

    if (this.proxyUrl) {
      const proxyMatch = this.proxyUrl.match(/^(https?:\/\/)(?:([^:]+):([^@]+)@)?(.+)$/)
      if (proxyMatch) {
        args.push(`--proxy-server=${proxyMatch[1]}${proxyMatch[4]}`)
      }
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args,
    })

    this.page = await this.browser.newPage()

    // Установить User-Agent
    await this.page.setUserAgent(getRandomUserAgent())

    // Скрыть признаки автоматизации
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    // Авторизация прокси если нужна
    if (this.proxyUrl) {
      const proxyMatch = this.proxyUrl.match(/^https?:\/\/([^:]+):([^@]+)@/)
      if (proxyMatch) {
        await this.page.authenticate({
          username: proxyMatch[1],
          password: proxyMatch[2],
        })
      }
    }

    // Оптимизация: блокировать тяжёлые ресурсы
    await this.page.setRequestInterception(true)
    this.page.on('request', (request) => {
      const resourceType = request.resourceType()
      if (['font', 'media'].includes(resourceType)) {
        request.abort()
      } else {
        request.continue()
      }
    })

    console.log(`[Forum] Браузер запущен${this.proxyUrl ? ' с прокси' : ''}`)
  }

  // Закрыть браузер
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
      console.log('[Forum] Браузер закрыт')
    }
  }

  // Извлечь цену из текста
  extractPrice(text: string): { price?: number; priceText?: string } {
    const match = text.match(FORUM_PATTERNS.price)
    if (match) {
      const priceStr = match[1].replace(/\s/g, '')
      const price = parseInt(priceStr, 10)
      if (!isNaN(price) && price > 0 && price < 1000000000) {
        return { price, priceText: match[0].trim() }
      }
    }
    return {}
  }

  // Извлечь телефон из текста
  extractPhone(text: string): string | undefined {
    const matches = text.match(FORUM_PATTERNS.phone)
    return matches ? matches[0] : undefined
  }

  // Извлечь город из текста
  extractCity(text: string): string | undefined {
    const match = text.match(FORUM_PATTERNS.city)
    return match ? match[1].trim() : undefined
  }

  // Определить тип объявления
  detectPostType(text: string): 'sell' | 'buy' | 'other' {
    if (FORUM_PATTERNS.sellKeywords.test(text)) return 'sell'
    if (FORUM_PATTERNS.buyKeywords.test(text)) return 'buy'
    return 'other'
  }

  // Парсить страницу раздела (список тем)
  async parseTopicListPage(url: string): Promise<{ topics: { url: string; title: string }[]; nextPage?: string }> {
    if (!this.page) throw new Error('Browser not launched')

    console.log(`[Forum] Открываю страницу раздела: ${url}`)
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: FORUM_CONFIG.PAGE_TIMEOUT })

    // Подождать загрузки контента
    if (this.selectors.topicItem) {
      try {
        await this.page.waitForSelector(this.selectors.topicItem, {
          timeout: FORUM_CONFIG.ELEMENT_WAIT_TIMEOUT,
        })
      } catch {
        console.log('[Forum] Темы не найдены на странице')
        return { topics: [] }
      }
    }

    const result = await this.page.evaluate((selectors: ForumSelectors) => {
      const topics: { url: string; title: string }[] = []

      // Найти все темы
      const topicSelector = selectors.topicItem || 'tr, .topic, .thread'
      const items = document.querySelectorAll(topicSelector)

      items.forEach((item) => {
        // Найти ссылку
        const linkSelector = selectors.topicLink || selectors.topicTitle || 'a'
        const link = item.querySelector(linkSelector) as HTMLAnchorElement
        if (link && link.href) {
          const title = link.textContent?.trim() || ''
          if (title && link.href.includes('/')) {
            topics.push({ url: link.href, title })
          }
        }
      })

      // Найти следующую страницу
      let nextPage: string | undefined
      if (selectors.pagination) {
        const paginationLinks = document.querySelectorAll(selectors.pagination)
        paginationLinks.forEach((a) => {
          const text = a.textContent?.trim().toLowerCase()
          if (text === '>' || text === 'след' || text === 'next' || text === '»' || text?.includes('след')) {
            nextPage = (a as HTMLAnchorElement).href
          }
        })
      }

      return { topics, nextPage }
    }, this.selectors)

    console.log(`[Forum] Найдено тем: ${result.topics.length}`)
    return result
  }

  // Парсить страницу темы (пост)
  async parseTopicPage(topicUrl: string, topicTitle: string): Promise<ParsedForumPost | null> {
    if (!this.page) throw new Error('Browser not launched')

    console.log(`[Forum] Парсю тему: ${topicTitle.substring(0, 50)}...`)

    try {
      await this.page.goto(topicUrl, { waitUntil: 'domcontentloaded', timeout: FORUM_CONFIG.PAGE_TIMEOUT })

      // Извлечь ID поста из URL
      const urlMatch = topicUrl.match(/[?&](?:t|topic|thread|id)=(\d+)|\/(\d+)(?:\/|$|\?|#)/)
      const forumPostId = urlMatch ? (urlMatch[1] || urlMatch[2]) : topicUrl.split('/').filter(Boolean).pop() || ''

      const post = await this.page.evaluate((selectors: ForumSelectors, parseFields: string[]) => {
        // Контент поста
        let content = ''
        if (parseFields.includes('content') && selectors.postContent) {
          const contentEl = document.querySelector(selectors.postContent)
          content = contentEl?.textContent?.trim() || ''
        }

        // Автор
        let author = ''
        let authorUrl = ''
        if (parseFields.includes('author') && selectors.postAuthor) {
          const authorEl = document.querySelector(selectors.postAuthor) as HTMLAnchorElement
          author = authorEl?.textContent?.trim() || ''
          if (parseFields.includes('authorUrl') && authorEl?.href) {
            authorUrl = authorEl.href
          }
        }

        // Дата
        let dateStr = ''
        if (parseFields.includes('date') && selectors.postDate) {
          const dateEl = document.querySelector(selectors.postDate)
          dateStr = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || ''
        }

        // Изображения
        const images: string[] = []
        if (parseFields.includes('images') && selectors.postImages) {
          const imgEls = document.querySelectorAll(selectors.postImages)
          imgEls.forEach((img) => {
            const src = (img as HTMLImageElement).src
            if (src && !src.includes('avatar') && !src.includes('smiley') && !src.includes('emoji')) {
              images.push(src)
            }
          })
        }

        return { content, author, authorUrl, dateStr, images }
      }, this.selectors, this.parseFields)

      // Извлечь данные из контента
      const fullText = `${topicTitle} ${post.content}`
      const { price, priceText } = this.parseFields.includes('price') ? this.extractPrice(fullText) : {}
      const phone = this.parseFields.includes('phone') ? this.extractPhone(fullText) : undefined
      const city = this.parseFields.includes('city') ? this.extractCity(fullText) : undefined
      const postType = this.detectPostType(fullText)

      // Попробовать распарсить дату
      let postedAt: Date | undefined
      if (post.dateStr) {
        try {
          postedAt = new Date(post.dateStr)
          if (isNaN(postedAt.getTime())) postedAt = undefined
        } catch {
          postedAt = undefined
        }
      }

      return {
        forumPostId,
        title: topicTitle,
        content: post.content || undefined,
        author: post.author || undefined,
        authorUrl: post.authorUrl || undefined,
        url: topicUrl,
        images: post.images,
        price,
        priceText,
        phone,
        city,
        postType,
        postedAt,
      }
    } catch (error) {
      console.error(`[Forum] Ошибка парсинга темы: ${error}`)
      return null
    }
  }

  // Сохранить пост в базу
  async savePost(post: ParsedForumPost): Promise<{ isNew: boolean }> {
    const existing = await prisma.forumPost.findUnique({
      where: {
        sourceId_forumPostId: {
          sourceId: this.sourceId,
          forumPostId: post.forumPostId,
        },
      },
    })

    if (existing) {
      return { isNew: false }
    }

    await prisma.forumPost.create({
      data: {
        forumPostId: post.forumPostId,
        title: post.title,
        content: post.content,
        author: post.author,
        authorUrl: post.authorUrl,
        url: post.url,
        images: post.images,
        price: post.price,
        priceText: post.priceText,
        city: post.city,
        phone: post.phone,
        postType: post.postType,
        postedAt: post.postedAt,
        sourceId: this.sourceId,
      },
    })

    return { isNew: true }
  }
}

// Главная функция парсинга
export async function startForumParsing(sourceIds: string[]) {
  console.log(`[Forum] Запуск парсинга для ${sourceIds.length} источников`)

  const sources = await prisma.forumSource.findMany({
    where: {
      id: { in: sourceIds },
      isActive: true,
    },
  })

  if (sources.length === 0) {
    console.log('[Forum] Нет активных источников для парсинга')
    return { started: 0 }
  }

  // Запустить парсинг для каждого источника
  let started = 0
  for (const source of sources) {
    // Проверить, нет ли уже запущенной задачи для этого источника
    const existingJob = await prisma.forumJob.findFirst({
      where: {
        sourceId: source.id,
        status: 'running',
      },
    })

    if (existingJob) {
      console.log(`[Forum] Источник ${source.name} уже парсится`)
      continue
    }

    // Создать задачу
    const job = await ForumJobManager.createJob(source.id, source.proxyId)

    // Запустить парсинг в фоне
    parseSourceInBackground(job.id, source)
    started++
  }

  return { started }
}

// Фоновый парсинг одного источника
async function parseSourceInBackground(
  jobId: string,
  source: {
    id: string
    name: string
    sectionUrl: string
    selectors: unknown
    parseFields: string[]
    maxPages: number
    proxyId: string | null
  }
) {
  const selectors = (source.selectors || {}) as ForumSelectors
  const parser = new ForumParser(jobId, source.id, source.parseFields, selectors)

  try {
    await ForumJobManager.startJob(jobId)
    await parser.launchBrowser()

    let currentUrl: string | undefined = source.sectionUrl
    let pageNum = 0
    let totalTopics = 0
    let processed = 0
    let newPosts = 0
    let skipped = 0
    let errors = 0

    // Парсить страницы раздела
    while (currentUrl && pageNum < source.maxPages) {
      if (ForumJobManager.shouldStop(jobId)) {
        console.log(`[Forum] Задача ${jobId} остановлена пользователем`)
        break
      }

      pageNum++
      console.log(`[Forum] Страница ${pageNum}/${source.maxPages}`)

      const { topics, nextPage } = await parser.parseTopicListPage(currentUrl)
      totalTopics += topics.length

      await ForumJobManager.updateProgress(jobId, { total: totalTopics })

      // Парсить каждую тему
      for (const topic of topics) {
        if (ForumJobManager.shouldStop(jobId)) break

        try {
          const post = await parser.parseTopicPage(topic.url, topic.title)

          if (post) {
            const { isNew } = await parser.savePost(post)
            if (isNew) {
              newPosts++
            } else {
              skipped++
            }
          } else {
            skipped++
          }
        } catch (error) {
          console.error(`[Forum] Ошибка: ${error}`)
          errors++
        }

        processed++
        await ForumJobManager.updateProgress(jobId, {
          processed,
          newPosts,
          skipped,
          errors,
        })

        // Задержка между темами
        await randomDelay(FORUM_CONFIG.TOPIC_DELAY_MIN, FORUM_CONFIG.TOPIC_DELAY_MAX)
      }

      currentUrl = nextPage

      // Задержка между страницами
      if (currentUrl) {
        await randomDelay(FORUM_CONFIG.PAGE_DELAY_MIN, FORUM_CONFIG.PAGE_DELAY_MAX)
      }
    }

    // Завершить задачу
    if (!ForumJobManager.shouldStop(jobId)) {
      await ForumJobManager.completeJob(jobId)
    }

    // Обновить счётчик источника
    await prisma.forumSource.update({
      where: { id: source.id },
      data: {
        lastParsed: new Date(),
        postCount: { increment: newPosts },
      },
    })

    console.log(`[Forum] Парсинг завершён: ${newPosts} новых, ${skipped} пропущено, ${errors} ошибок`)
  } catch (error) {
    console.error(`[Forum] Критическая ошибка: ${error}`)
    await ForumJobManager.failJob(jobId, String(error))
  } finally {
    await parser.closeBrowser()
    stopSignals.delete(jobId)
  }
}
