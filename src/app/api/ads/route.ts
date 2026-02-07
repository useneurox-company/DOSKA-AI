import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')
    const source = searchParams.get('source')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (cityId) {
      where.cityId = cityId
    }

    if (source) {
      if (source === 'verified') {
        where.isVerified = true
        where.type = { not: 'request' }
      } else if (source === 'telegram') {
        where.source = 'telegram'
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const ads = await prisma.ad.findMany({
      where,
      include: {
        city: true,
        category: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(ads)
  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке объявлений' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { title, description, price, cityId, categoryId, images, items, type } = await request.json()

    if (!title || price === undefined || !cityId || !categoryId) {
      return NextResponse.json(
        { error: 'Заполните обязательные поля' },
        { status: 400 }
      )
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        price: typeof price === 'string' ? parseInt(price) : price,
        cityId,
        categoryId,
        userId: session.user.id,
        source: 'user',
        isVerified: true,
        type: type || null,
        items: items || undefined,
        // Создаём записи изображений если они есть
        images: images && images.length > 0 ? {
          create: images.map((url: string) => ({ url }))
        } : undefined,
      },
      include: {
        city: true,
        category: true,
        images: true,
      },
    })

    return NextResponse.json(ad)
  } catch (error) {
    console.error('Error creating ad:', error)
    return NextResponse.json({ error: 'Ошибка при создании объявления' }, { status: 500 })
  }
}
