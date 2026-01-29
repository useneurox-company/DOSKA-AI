import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

const FREE_VIEWS_LIMIT = 10

// GET - проверить статус просмотров пользователя
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({
      canView: false,
      isLoggedIn: false,
      viewsUsed: 0,
      viewsLeft: 0,
      hasSubscription: false,
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      freeViewsUsed: true,
      hasSubscription: true,
      subscriptionEnd: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Проверяем подписку (с учётом даты окончания)
  const hasActiveSubscription = user.hasSubscription &&
    (!user.subscriptionEnd || new Date(user.subscriptionEnd) > new Date())

  const canView = hasActiveSubscription || user.freeViewsUsed < FREE_VIEWS_LIMIT
  const viewsLeft = hasActiveSubscription ? -1 : Math.max(0, FREE_VIEWS_LIMIT - user.freeViewsUsed)

  return NextResponse.json({
    canView,
    isLoggedIn: true,
    viewsUsed: user.freeViewsUsed,
    viewsLeft,
    hasSubscription: hasActiveSubscription,
  })
}

// POST - использовать один бесплатный просмотр
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { cardId } = await request.json()

  if (!cardId) {
    return NextResponse.json({ error: 'Card ID required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      freeViewsUsed: true,
      hasSubscription: true,
      subscriptionEnd: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Проверяем подписку
  const hasActiveSubscription = user.hasSubscription &&
    (!user.subscriptionEnd || new Date(user.subscriptionEnd) > new Date())

  // Если есть подписка - не считаем просмотры
  if (hasActiveSubscription) {
    return NextResponse.json({
      canView: true,
      viewsUsed: user.freeViewsUsed,
      viewsLeft: -1, // unlimited
      hasSubscription: true,
    })
  }

  // Если лимит исчерпан
  if (user.freeViewsUsed >= FREE_VIEWS_LIMIT) {
    return NextResponse.json({
      canView: false,
      viewsUsed: user.freeViewsUsed,
      viewsLeft: 0,
      hasSubscription: false,
    })
  }

  // Увеличиваем счётчик просмотров
  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: { freeViewsUsed: { increment: 1 } },
    select: { freeViewsUsed: true },
  })

  return NextResponse.json({
    canView: true,
    viewsUsed: updatedUser.freeViewsUsed,
    viewsLeft: Math.max(0, FREE_VIEWS_LIMIT - updatedUser.freeViewsUsed),
    hasSubscription: false,
  })
}
