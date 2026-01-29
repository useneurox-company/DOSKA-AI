import type { AvitoProxy, AvitoSource, AvitoJob, AvitoAd } from '@prisma/client'
import type { ParseField, JobStatus, ProxyStatus } from './constants'

// Re-export Prisma types and constants types
export type { AvitoProxy, AvitoSource, AvitoJob, AvitoAd }
export type { ParseField, JobStatus, ProxyStatus }

// Parsed ad data (before saving to DB)
export interface ParsedAd {
  avitoId: string
  title: string
  description?: string
  price?: number
  priceText?: string
  city?: string
  address?: string
  district?: string
  sellerName?: string
  sellerId?: string
  url: string
  images: string[]
  category?: string
  views?: number
  publishedAt?: Date
}

// Proxy input for creation
export interface CreateProxyInput {
  name: string
  url: string
  isActive?: boolean
}

// Source input for creation
export interface CreateSourceInput {
  name: string
  searchUrl: string
  parseFields?: ParseField[]
  proxyId?: string
  autoParseEnabled?: boolean
  autoParseInterval?: number
}

// Update source input
export interface UpdateSourceInput {
  name?: string
  searchUrl?: string
  parseFields?: ParseField[]
  isActive?: boolean
  proxyId?: string | null
  autoParseEnabled?: boolean
  autoParseInterval?: number
}

// Parse request
export interface ParseRequest {
  sourceIds: string[] | 'all'
}

// Stop request
export interface StopRequest {
  jobId?: string
  all?: boolean
}

// Job progress (for real-time updates)
export interface JobProgress {
  id: string
  sourceId: string
  sourceName: string
  status: JobStatus
  total: number
  processed: number
  newAds: number
  skipped: number
  errors: number
  proxyName?: string
  errorMsg?: string
  startedAt?: Date
  percent: number
}

// Ads filter
export interface AdsFilter {
  sourceId?: string
  city?: string
  priceMin?: number
  priceMax?: number
  dateFrom?: Date
  dateTo?: Date
  search?: string
  page?: number
  limit?: number
  sort?: 'parsedAt' | 'price' | 'createdAt' | 'title'
  order?: 'asc' | 'desc'
}

// Ads list response
export interface AdsListResponse {
  ads: AvitoAd[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Stats response
export interface StatsResponse {
  totalAds: number
  todayAds: number
  totalSources: number
  activeSources: number
  totalProxies: number
  activeProxies: number
  runningJobs: number
}

// Proxy check result
export interface ProxyCheckResult {
  success: boolean
  latencyMs?: number
  error?: string
}

// Auto parse settings
export interface AutoParseSettings {
  isPaused: boolean
  lastAutoParseAt?: Date
  nextAutoParseAt?: Date
  sourcesWithAutoParse: number
}

// Export formats
export type ExportFormat = 'csv' | 'json'

// Browser instance info
export interface BrowserInstance {
  id: string
  proxyId?: string
  sourceId: string
  isRunning: boolean
}
