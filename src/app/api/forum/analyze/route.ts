/**
 * API для AI-анализа страниц форумов
 * POST /api/forum/analyze - анализ структуры страницы
 * POST /api/forum/analyze/parse - парсинг объявлений через AI
 */

import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { analyzeForumPage, parseForumPageWithAI } from '@/lib/forum/aiAnalyzer'

// Получить HTML страницы через Puppeteer
async function fetchPageHtml(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  })

  try {
    const page = await browser.newPage()

    // User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Скрыть webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    // Открыть страницу
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Подождать загрузки контента
    await page.waitForSelector('body', { timeout: 10000 })

    // Получить HTML
    const html = await page.content()

    return html
  } finally {
    await browser.close()
  }
}

/**
 * POST /api/forum/analyze
 * Анализирует структуру страницы форума и определяет селекторы
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, mode = 'analyze' } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL обязателен' },
        { status: 400 }
      )
    }

    console.log(`[AI Forum] Анализ страницы: ${url}, режим: ${mode}`)

    // Получаем HTML страницы
    const html = await fetchPageHtml(url)
    console.log(`[AI Forum] Получен HTML: ${html.length} символов`)

    if (mode === 'parse') {
      // Режим парсинга - извлекаем объявления напрямую
      const result = await parseForumPageWithAI(html, url)

      return NextResponse.json({
        success: true,
        mode: 'parse',
        ...result,
      })
    } else {
      // Режим анализа - определяем структуру и селекторы
      const analysis = await analyzeForumPage(html, url)

      return NextResponse.json({
        success: true,
        mode: 'analyze',
        ...analysis,
      })
    }
  } catch (error) {
    console.error('[AI Forum] Ошибка:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка анализа' },
      { status: 500 }
    )
  }
}
