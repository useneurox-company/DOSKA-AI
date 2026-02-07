import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const ads = await prisma.ad.findMany({
      where: {
        source: { not: 'telegram' },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        price: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })

    return NextResponse.json(ads)
  } catch {
    return NextResponse.json([])
  }
}
