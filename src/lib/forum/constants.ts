import { ForumSelectors } from './types'

// Конфигурация парсера форумов
export const FORUM_CONFIG = {
  // Задержки (мс)
  PAGE_DELAY_MIN: 2000,
  PAGE_DELAY_MAX: 5000,
  TOPIC_DELAY_MIN: 1500,
  TOPIC_DELAY_MAX: 3000,

  // Таймауты
  PAGE_TIMEOUT: 30000,
  ELEMENT_WAIT_TIMEOUT: 10000,

  // Лимиты
  MAX_CONCURRENT_JOBS: 3,
  DEFAULT_MAX_PAGES: 5,

  // User-Agents для ротации
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
}

// Доступные поля для парсинга
export const FORUM_PARSE_FIELDS = [
  'title',
  'content',
  'author',
  'authorUrl',
  'date',
  'images',
  'url',
  'price',
  'city',
  'phone',
]

// Русские названия полей
export const FORUM_FIELD_LABELS: Record<string, string> = {
  title: 'Заголовок',
  content: 'Содержимое',
  author: 'Автор',
  authorUrl: 'Профиль автора',
  date: 'Дата',
  images: 'Изображения',
  url: 'Ссылка',
  price: 'Цена',
  city: 'Город',
  phone: 'Телефон',
}

// Пресеты селекторов для популярных движков форумов
export const FORUM_PRESETS: Record<string, { name: string; selectors: ForumSelectors }> = {
  phpbb: {
    name: 'phpBB',
    selectors: {
      topicList: '.topiclist',
      topicItem: '.topiclist li, .row',
      topicLink: '.topictitle',
      topicTitle: '.topictitle',
      topicAuthor: '.author a, .username',
      topicDate: '.author',
      pagination: '.pagination a',
      postContent: '.content',
      postAuthor: '.author a, .username',
      postDate: '.author',
      postImages: '.content img',
    },
  },
  vbulletin: {
    name: 'vBulletin',
    selectors: {
      topicList: '#threads',
      topicItem: '.threadbit, [id^="thread_"]',
      topicLink: '.title a',
      topicTitle: '.title a',
      topicAuthor: '.author a',
      topicDate: '.date',
      pagination: '.pagination a',
      postContent: '.postcontent, .postbody',
      postAuthor: '.username',
      postDate: '.date',
      postImages: '.postcontent img',
    },
  },
  xenforo: {
    name: 'XenForo',
    selectors: {
      topicList: '.structItemContainer',
      topicItem: '.structItem',
      topicLink: '.structItem-title a',
      topicTitle: '.structItem-title a',
      topicAuthor: '.username',
      topicDate: 'time',
      pagination: '.pageNav a',
      postContent: '.message-body .bbWrapper',
      postAuthor: '.message-name a',
      postDate: 'time',
      postImages: '.message-body img',
    },
  },
  ipboard: {
    name: 'IP.Board / Invision',
    selectors: {
      topicList: '.ipsDataList',
      topicItem: '.ipsDataItem',
      topicLink: '.ipsDataItem_title a',
      topicTitle: '.ipsDataItem_title a',
      topicAuthor: '.ipsDataItem_meta a',
      topicDate: 'time',
      pagination: '.ipsPagination a',
      postContent: '.ipsType_richText',
      postAuthor: '.cAuthorPane_info a',
      postDate: 'time',
      postImages: '.ipsType_richText img',
    },
  },
  smf: {
    name: 'SMF (Simple Machines)',
    selectors: {
      topicList: '#messageindex',
      topicItem: '.topic_table tbody tr, .windowbg, .windowbg2',
      topicLink: '.subject a',
      topicTitle: '.subject a',
      topicAuthor: '.starter a',
      topicDate: '.lastpost',
      pagination: '.pagelinks a',
      postContent: '.post, .inner',
      postAuthor: '.poster h4 a',
      postDate: '.smalltext',
      postImages: '.post img, .inner img',
    },
  },
  discourse: {
    name: 'Discourse',
    selectors: {
      topicList: '.topic-list',
      topicItem: '.topic-list-item',
      topicLink: '.title a',
      topicTitle: '.title a',
      topicAuthor: '.creator a',
      topicDate: '.relative-date',
      pagination: '.topic-list-bottom a',
      postContent: '.cooked',
      postAuthor: '.username a',
      postDate: '.relative-date',
      postImages: '.cooked img',
    },
  },
  metalsite: {
    name: 'Metalsite (доски объявлений металлопроката)',
    selectors: {
      topicList: 'ul.bulletinList, #bulletinList',
      topicItem: 'li.row.bulletin',
      topicLink: '.title a',
      topicTitle: '.title a',
      topicAuthor: '.company',
      topicDate: '.time',
      pagination: '.paginationControl a.pn',
      postContent: '.detailed, .description, li.description',
      postAuthor: '.company, small',
      postDate: '.time',
      postImages: '.detailed img',
    },
  },
  custom: {
    name: 'Свои селекторы',
    selectors: {},
  },
}

// Регулярные выражения для извлечения данных
export const FORUM_PATTERNS = {
  // Цена: "100 руб", "100р", "100 000 ₽", "$100"
  price: /(\d[\d\s]*[\d]?)\s*(руб|р\.|₽|\$|EUR|€)?/i,

  // Телефон
  phone: /(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,

  // Город (простой паттерн, можно расширить)
  city: /(?:г\.|город|г\s)[\s]*([А-Яа-яЁё\-]+)/i,

  // Тип объявления
  sellKeywords: /прода[мюёеь]|продаётся|продается|продам|реализу[юе]м|в продаже|отдам/i,
  buyKeywords: /куп[лю]|купим|покупаем|приобрет[уе]|ищ[уе]м|нуж[еа]н|требуется/i,
}
