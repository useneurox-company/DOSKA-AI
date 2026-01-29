import { NextResponse } from 'next/server'
import { ProxyManager } from '@/lib/avito/proxyManager'

interface Params {
  params: Promise<{ id: string }>
}

// POST - проверить соединение прокси
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params

    const proxy = await ProxyManager.getById(id)
    if (!proxy) {
      return NextResponse.json(
        { error: 'Proxy not found' },
        { status: 404 }
      )
    }

    const result = await ProxyManager.checkAndUpdateStatus(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking proxy:', error)
    return NextResponse.json(
      { error: 'Failed to check proxy' },
      { status: 500 }
    )
  }
}
