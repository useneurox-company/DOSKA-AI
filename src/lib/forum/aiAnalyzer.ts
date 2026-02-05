/**
 * AI-анализатор страниц форумов
 * Автоматически определяет структуру страницы и генерирует селекторы
 */

import { chatCompletion } from '@/lib/ai/openrouter'
import { ForumSelectors } from './types'

export interface AIForumAnalysis {
  // Определённые селекторы
  selectors: ForumSelectors

  // Уверенность анализа (0-1)
  confidence: number

  // Описание структуры форума
  description: string

  // Обнаруженные объявления (примеры)
  samplePosts: Array<{
    title: string
    category?: string  // Продам/Куплю
    author?: string
    city?: string
    date?: string
    url?: string
  }>

  // Рекомендации
  recommendations: string[]

  // Сырой ответ AI
  rawResponse?: string
}

export interface ParsedPost {
  title: string
  url: string
  category?: string    // Продам/Куплю
  author?: string
  city?: string
  phone?: string
  price?: number
  priceText?: string
  content?: string
  date?: string
  postType: 'sell' | 'buy' | 'other'
}

export interface AIParseResult {
  posts: ParsedPost[]
  nextPageUrl?: string
  totalFound: number
  confidence: number
}

/**
 * Анализирует HTML страницы форума и определяет CSS селекторы
 */
export async function analyzeForumPage(html: string, pageUrl: string): Promise<AIForumAnalysis> {
  // Ограничиваем размер HTML для API (обрезаем до ~50KB)
  const maxHtmlLength = 50000
  const truncatedHtml = html.length > maxHtmlLength
    ? html.substring(0, maxHtmlLength) + '\n<!-- ... HTML обрезан ... -->'
    : html

  const systemPrompt = `Ты AI-эксперт по анализу HTML-структуры веб-страниц.
Твоя задача - проанализировать HTML страницы форума/доски объявлений и определить CSS селекторы для парсинга.

## ЗАДАЧА:
1. Найди список объявлений на странице
2. Определи CSS селекторы для каждого элемента
3. Извлеки примеры объявлений для проверки

## КАКИЕ СЕЛЕКТОРЫ НУЖНЫ:
- topicList: контейнер списка объявлений (ul, div, table)
- topicItem: отдельное объявление в списке (li, tr, div.row)
- topicLink: ссылка на объявление (a)
- topicTitle: заголовок объявления
- topicCategory: категория "Продам"/"Куплю" (если есть)
- topicAuthor: автор/компания
- topicCity: город/регион (если есть в списке)
- topicDate: дата публикации
- pagination: ссылки пагинации

## ПРАВИЛА:
1. Используй ТОЧНЫЕ CSS селекторы (классы, id, атрибуты)
2. Селекторы должны быть специфичными, но не слишком длинными
3. Для topicItem используй селектор, который находит ВСЕ объявления
4. Проверь что селекторы логичны для HTML-структуры

## ПРИМЕРЫ ХОРОШИХ СЕЛЕКТОРОВ:
- topicItem: "li.row.bulletin" (не просто "li")
- topicCategory: ".cat" (для span.cat с "Продам"/"Куплю")
- topicCity: ".region" (для города)
- pagination: ".paginationControl a.pn"

ВАЖНО: Отвечай ТОЛЬКО валидным JSON без markdown.`

  const userPrompt = `Проанализируй HTML страницы форума и определи селекторы:

URL: ${pageUrl}

HTML:
\`\`\`html
${truncatedHtml}
\`\`\`

Верни JSON:
{
  "selectors": {
    "topicList": "селектор контейнера списка",
    "topicItem": "селектор одного объявления",
    "topicLink": "селектор ссылки на объявление",
    "topicTitle": "селектор заголовка",
    "topicCategory": "селектор категории Продам/Куплю или null",
    "topicAuthor": "селектор автора/компании",
    "topicCity": "селектор города или null",
    "topicDate": "селектор даты",
    "pagination": "селектор пагинации"
  },
  "confidence": 0.0-1.0,
  "description": "Краткое описание структуры форума",
  "samplePosts": [
    {
      "title": "Пример заголовка",
      "category": "Продам",
      "author": "Имя",
      "city": "Город",
      "date": "дата"
    }
  ],
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}`

  const response = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model: 'smart', maxTokens: 2000 })

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(cleanJson)

    return {
      selectors: {
        topicList: result.selectors?.topicList || undefined,
        topicItem: result.selectors?.topicItem || undefined,
        topicLink: result.selectors?.topicLink || undefined,
        topicTitle: result.selectors?.topicTitle || undefined,
        topicCategory: result.selectors?.topicCategory || undefined,
        topicAuthor: result.selectors?.topicAuthor || undefined,
        topicCity: result.selectors?.topicCity || undefined,
        topicDate: result.selectors?.topicDate || undefined,
        pagination: result.selectors?.pagination || undefined,
      },
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      description: result.description || 'Структура форума определена',
      samplePosts: result.samplePosts || [],
      recommendations: result.recommendations || [],
      rawResponse: response,
    }
  } catch (error) {
    console.error('[AI Forum] Failed to parse response:', response)
    return {
      selectors: {},
      confidence: 0,
      description: 'Не удалось проанализировать страницу',
      samplePosts: [],
      recommendations: ['Проверьте URL страницы', 'Попробуйте другую страницу'],
      rawResponse: response,
    }
  }
}

/**
 * AI парсит объявления напрямую из HTML (без CSS селекторов)
 * Полностью адаптивный подход - AI сам находит и извлекает данные
 */
export async function parseForumPageWithAI(html: string, pageUrl: string): Promise<AIParseResult> {
  // Ограничиваем размер HTML
  const maxHtmlLength = 60000
  const truncatedHtml = html.length > maxHtmlLength
    ? html.substring(0, maxHtmlLength) + '\n<!-- ... HTML обрезан ... -->'
    : html

  const systemPrompt = `Ты AI-парсер объявлений с форумов и досок объявлений.
Твоя задача - найти ВСЕ объявления на странице и извлечь данные.

## ЧТО ИСКАТЬ:
Объявления о продаже/покупке товаров (металлопрокат, стройматериалы, оборудование и т.д.)

## КАКИЕ ДАННЫЕ ИЗВЛЕЧЬ ИЗ КАЖДОГО ОБЪЯВЛЕНИЯ:
- title: заголовок объявления
- url: ссылка на объявление (полный URL или относительный путь)
- category: "Продам" или "Куплю" (если указано)
- author: имя автора/компании
- city: город (если указан)
- phone: телефон (если есть в тексте)
- price: цена числом (если есть)
- priceText: цена текстом (например "от 1500 руб/кг")
- content: краткое описание (если есть)
- date: дата публикации

## ОПРЕДЕЛЕНИЕ ТИПА (postType):
- "sell" - если это объявление о продаже (Продам, продаю, в наличии, реализуем)
- "buy" - если это объявление о покупке (Куплю, ищу, нужен, требуется)
- "other" - если не удаётся определить

## ПАГИНАЦИЯ:
Найди ссылку на СЛЕДУЮЩУЮ страницу ("Следующая", "Next", ">", "»")

ВАЖНО:
1. Извлекай ВСЕ объявления, которые видишь на странице
2. Не пропускай объявления
3. URL может быть относительным - это нормально
4. Отвечай ТОЛЬКО валидным JSON`

  const userPrompt = `Найди и извлеки ВСЕ объявления с этой страницы:

URL: ${pageUrl}

HTML:
\`\`\`html
${truncatedHtml}
\`\`\`

Верни JSON:
{
  "posts": [
    {
      "title": "Заголовок",
      "url": "/path/to/post.html",
      "category": "Продам",
      "author": "Компания",
      "city": "Город",
      "phone": "+7...",
      "price": 1500,
      "priceText": "от 1500 руб/кг",
      "content": "Описание...",
      "date": "27 января 2026",
      "postType": "sell"
    }
  ],
  "nextPageUrl": "/page/2 или null",
  "totalFound": число_найденных_объявлений,
  "confidence": 0.0-1.0
}`

  const response = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model: 'smart', maxTokens: 4000 })

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(cleanJson)

    const posts: ParsedPost[] = (result.posts || []).map((p: Record<string, unknown>) => ({
      title: String(p.title || ''),
      url: String(p.url || ''),
      category: p.category ? String(p.category) : undefined,
      author: p.author ? String(p.author) : undefined,
      city: p.city ? String(p.city) : undefined,
      phone: p.phone ? String(p.phone) : undefined,
      price: typeof p.price === 'number' ? p.price : undefined,
      priceText: p.priceText ? String(p.priceText) : undefined,
      content: p.content ? String(p.content) : undefined,
      date: p.date ? String(p.date) : undefined,
      postType: p.postType === 'sell' ? 'sell' : p.postType === 'buy' ? 'buy' : 'other',
    }))

    return {
      posts,
      nextPageUrl: result.nextPageUrl || undefined,
      totalFound: result.totalFound || posts.length,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    }
  } catch (error) {
    console.error('[AI Forum Parse] Failed to parse response:', response)
    return {
      posts: [],
      totalFound: 0,
      confidence: 0,
    }
  }
}

/**
 * AI анализирует страницу одного объявления и извлекает полные данные
 */
export async function parsePostPageWithAI(html: string, pageUrl: string): Promise<ParsedPost | null> {
  const maxHtmlLength = 40000
  const truncatedHtml = html.length > maxHtmlLength
    ? html.substring(0, maxHtmlLength) + '\n<!-- ... обрезано ... -->'
    : html

  const systemPrompt = `Ты AI-парсер страницы объявления.
Извлеки ВСЕ данные из страницы объявления.

## ДАННЫЕ ДЛЯ ИЗВЛЕЧЕНИЯ:
- title: заголовок объявления
- content: полный текст описания
- author: имя автора/компании
- city: город
- phone: телефон (формат +7...)
- price: цена числом
- priceText: цена текстом с единицами
- date: дата публикации
- postType: "sell" (продажа) / "buy" (покупка) / "other"

## ПРАВИЛА:
1. Телефон ищи в тексте, контактах, подписи
2. Цену конвертируй в число (1500 руб/кг -> price: 1500, priceText: "1500 руб/кг")
3. postType определяй по ключевым словам (продам, продаю -> sell; куплю, ищу -> buy)

ВАЖНО: Отвечай ТОЛЬКО валидным JSON`

  const userPrompt = `Извлеки данные из страницы объявления:

URL: ${pageUrl}

HTML:
\`\`\`html
${truncatedHtml}
\`\`\`

JSON:
{
  "title": "...",
  "content": "полный текст...",
  "author": "...",
  "city": "...",
  "phone": "+7...",
  "price": число,
  "priceText": "...",
  "date": "...",
  "postType": "sell|buy|other"
}`

  const response = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model: 'smart', maxTokens: 2000 })

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim()
    const p = JSON.parse(cleanJson)

    return {
      title: String(p.title || ''),
      url: pageUrl,
      content: p.content ? String(p.content) : undefined,
      author: p.author ? String(p.author) : undefined,
      city: p.city ? String(p.city) : undefined,
      phone: p.phone ? String(p.phone) : undefined,
      price: typeof p.price === 'number' ? p.price : undefined,
      priceText: p.priceText ? String(p.priceText) : undefined,
      date: p.date ? String(p.date) : undefined,
      postType: p.postType === 'sell' ? 'sell' : p.postType === 'buy' ? 'buy' : 'other',
    }
  } catch (error) {
    console.error('[AI Post Parse] Failed to parse response:', response)
    return null
  }
}
