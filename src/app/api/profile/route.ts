import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET /api/profile - Получить данные профиля
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        createdAt: true,
        freeViewsUsed: true,
        hasSubscription: true,
        subscriptionEnd: true,
        ads: {
          orderBy: { createdAt: 'desc' },
          include: {
            city: true,
            category: true,
            images: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке профиля' }, { status: 500 })
  }
}

// PUT /api/profile - Обновить профиль
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { name, phone } = await request.json()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        phone: phone || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Ошибка при обновлении профиля' }, { status: 500 })
  }
}
