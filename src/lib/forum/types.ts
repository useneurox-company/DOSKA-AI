// Типы для Forum Parser

// Селекторы для парсинга форума
export interface ForumSelectors {
  // Страница раздела (список тем)
  topicList?: string          // Контейнер со списком тем
  topicItem?: string          // Одна тема в списке
  topicLink?: string          // Ссылка на тему
  topicTitle?: string         // Заголовок темы
  topicAuthor?: string        // Автор темы
  topicDate?: string          // Дата создания темы
  topicReplies?: string       // Количество ответов
  topicCategory?: string      // Категория (Продам/Куплю) - для досок объявлений
  topicCity?: string          // Город - для досок объявлений
  topicDescription?: string   // Краткое описание в списке
  pagination?: string         // Пагинация

  // Страница темы (пост)
  postContent?: string        // Контент поста
  postAuthor?: string         // Автор поста
  postAuthorUrl?: string      // Ссылка на профиль автора
  postDate?: string           // Дата поста
  postImages?: string         // Изображения в посте
  replyItem?: string          // Ответ в теме (для parseReplies)
}

// Спарсенный пост
export interface ParsedForumPost {
  forumPostId: string
  title: string
  content?: string
  author?: string
  authorId?: string
  authorUrl?: string
  url: string
  images: string[]
  price?: number
  priceText?: string
  city?: string
  phone?: string
  postType?: 'sell' | 'buy' | 'other'
  postedAt?: Date
}

// Входные данные для создания источника
export interface CreateForumSourceInput {
  name: string
  baseUrl: string
  sectionUrl: string
  selectors?: ForumSelectors
  parseFields?: string[]
  proxyId?: string
  maxPages?: number
  parseReplies?: boolean
  autoParseEnabled?: boolean
  autoParseInterval?: number
}

// Входные данные для обновления источника
export interface UpdateForumSourceInput {
  name?: string
  baseUrl?: string
  sectionUrl?: string
  selectors?: ForumSelectors
  parseFields?: string[]
  isActive?: boolean
  proxyId?: string | null
  maxPages?: number
  parseReplies?: boolean
  autoParseEnabled?: boolean
  autoParseInterval?: number
}

// Прогресс задачи
export interface ForumJobProgress {
  id: string
  sourceId: string
  sourceName: string
  status: string
  total: number
  processed: number
  newPosts: number
  skipped: number
  errors: number
  proxyName?: string
  errorMsg?: string
  startedAt?: string
  percent: number
}

// Фильтр постов
export interface ForumPostsFilter {
  sourceId?: string
  postType?: string
  city?: string
  search?: string
  page?: number
  limit?: number
}

// Статистика
export interface ForumStatsResponse {
  totalPosts: number
  todayPosts: number
  totalSources: number
  activeSources: number
  runningJobs: number
}
