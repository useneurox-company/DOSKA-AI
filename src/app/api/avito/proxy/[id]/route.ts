import { NextResponse } from 'next/server'
import { ProxyManager } from '@/lib/avito/proxyManager'

interface Params {
  params: Promise<{ id: string }>
}

// GET - получить прокси по ID
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const proxy = await ProxyManager.getById(id)

    if (!proxy) {
      return NextResponse.json(
        { error: 'Proxy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(proxy)
  } catch (error) {
    console.error('Error fetching proxy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proxy' },
      { status: 500 }
    )
  }
}

// PUT - обновить прокси
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    const proxy = await ProxyManager.update(id, body)
    return NextResponse.json(proxy)
  } catch (error) {
    console.error('Error updating proxy:', error)
    return NextResponse.json(
      { error: 'Failed to update proxy' },
      { status: 500 }
    )
  }
}

// DELETE - удалить прокси
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    await ProxyManager.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proxy:', error)
    return NextResponse.json(
      { error: 'Failed to delete proxy' },
      { status: 500 }
    )
  }
}
