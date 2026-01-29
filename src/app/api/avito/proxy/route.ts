import { NextResponse } from 'next/server'
import { ProxyManager } from '@/lib/avito/proxyManager'
import type { CreateProxyInput } from '@/lib/avito/types'

// GET - получить список прокси
export async function GET() {
  try {
    const proxies = await ProxyManager.getAll()
    return NextResponse.json(proxies)
  } catch (error) {
    console.error('Error fetching proxies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proxies' },
      { status: 500 }
    )
  }
}

// POST - создать прокси
export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateProxyInput

    if (!body.name || !body.url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      )
    }

    const proxy = await ProxyManager.create(body)
    return NextResponse.json(proxy, { status: 201 })
  } catch (error) {
    console.error('Error creating proxy:', error)
    return NextResponse.json(
      { error: 'Failed to create proxy' },
      { status: 500 }
    )
  }
}
