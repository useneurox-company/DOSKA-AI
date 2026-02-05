// Стандартные настройки парсера Avito
// Эти настройки оптимизированы для безопасного парсинга без банов

export const AVITO_CONFIG = {
  // Задержки между запросами (мс) - оптимизированные для скорости
  DELAY_BETWEEN_ADS: { min: 8000, max: 15000 },       // 8-15 сек между объявлениями (было 15-30)
  DELAY_BETWEEN_PAGES: { min: 3000, max: 6000 },      // 3-6 сек между страницами (было 5-10)

  // Лимиты
  MAX_ADS_PER_PAGE: 50,                               // Объявлений на странице Avito
  MAX_PAGES_PER_SOURCE: 10,                           // Максимум страниц для одного источника
  MAX_CONCURRENT_JOBS: 5,                             // Максимум параллельных задач парсинга

  // Браузер
  HEADLESS: false,                                    // Показывать браузер (false = безопаснее)

  // Viewport
  VIEWPORT: {
    width: 1920,
    height: 1080,
  },

  // Таймауты (мс)
  PAGE_LOAD_TIMEOUT: 30000,                           // Таймаут загрузки страницы
  ELEMENT_WAIT_TIMEOUT: 10000,                        // Ожидание элемента

  // User-Agents для ротации (реальные браузеры 2025)
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  ],

  // Селекторы Avito (могут меняться, обновлять при необходимости)
  SELECTORS: {
    // Страница поиска - контейнер
    AD_ITEM: '[data-marker="item"]',
    AD_LINK: 'a[itemprop="url"]',
    AD_TITLE: '[itemprop="name"]',
    AD_PRICE: '[itemprop="price"]',
    AD_LOCATION: '[data-marker="item-address"]',

    // Страница поиска - быстрый парсинг (данные из карточки)
    SEARCH_TITLE: '[data-marker="item-title"]',
    SEARCH_PRICE_META: '[data-marker="item-price"] meta[itemprop="price"]',
    SEARCH_PRICE_VALUE: '[data-marker="item-price-value"]',
    SEARCH_CITY: '.geo-root-BBVai span',
    SEARCH_IMAGE: 'img[itemprop="image"]',
    SEARCH_DESCRIPTION: '.iva-item-bottomBlock-VewGa p',
    SEARCH_SELLER_NAME: '.style-root-nFIJp p',
    SEARCH_SELLER_RATING: '[data-marker="seller-info/score"]',

    // Страница объявления (детальный режим)
    DETAIL_TITLE: '[data-marker="item-view/title-info"]',
    DETAIL_PRICE: '[data-marker="item-view/item-price"]',
    DETAIL_DESCRIPTION: '[data-marker="item-view/item-description"]',
    DETAIL_SELLER: '[data-marker="seller-info/name"]',
    DETAIL_ADDRESS: '[data-marker="item-view/item-address"]',
    DETAIL_IMAGES: '[data-marker="image-frame/image-wrapper"] img',
    DETAIL_CATEGORY: '[data-marker="item-view/item-navigation"]',
    DETAIL_DATE: '[data-marker="item-view/item-date"]',
    DETAIL_VIEWS: '[data-marker="item-view/total-views"]',

    // Пагинация
    PAGINATION: '[data-marker="pagination-button"]',
    NEXT_PAGE: '[data-marker="pagination-button/nextPage"]',
  },

  // URL шаблоны
  BASE_URL: 'https://www.avito.ru',
}

// Возможные поля для парсинга
export const PARSE_FIELDS = [
  'title',
  'description',
  'price',
  'city',
  'address',
  'district',
  'images',
  'sellerName',
  'sellerId',
  'category',
  'views',
  'publishedAt',
  'url',
] as const

export type ParseField = typeof PARSE_FIELDS[number]

// Дефолтные поля
export const DEFAULT_PARSE_FIELDS: ParseField[] = [
  'title',
  'description',
  'price',
  'city',
  'images',
  'sellerName',
  'url',
]

// Статусы задач
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS]

// Статусы прокси
export const PROXY_STATUS = {
  WORKING: 'working',
  ERROR: 'error',
  UNKNOWN: 'unknown',
} as const

export type ProxyStatus = typeof PROXY_STATUS[keyof typeof PROXY_STATUS]
