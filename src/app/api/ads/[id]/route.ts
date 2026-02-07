import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET /api/ads/[id] - Получить объявление
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ad = await prisma.ad.findUnique({
      where: { id },
      include: {
        city: true,
        category: true,
        images: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!ad) {
      return NextResponse.json({ error: 'Объявление не найдено' }, { status: 404 })
    }

    return NextResponse.json(ad)
  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке объявления' }, { status: 500 })
  }
}

// DELETE /api/ads/[id] - Удалить объявление
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем, что объявление принадлежит пользователю
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!ad) {
      return NextResponse.json({ error: 'Объявление не найдено' }, { status: 404 })
    }

    if (ad.userId !== session.user.id) {
      return NextResponse.json({ error: 'Нет прав на удаление' }, { status: 403 })
    }

    await prisma.ad.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ad:', error)
    return NextResponse.json({ error: 'Ошибка при удалении объявления' }, { status: 500 })
  }
}

// PUT /api/ads/[id] - Обновить объявление
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { id } = await params
    const { title, description, price, cityId, categoryId, images } = await request.json()

    // Проверяем, что объявление принадлежит пользователю
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!ad) {
      return NextResponse.json({ error: 'Объявление не найдено' }, { status: 404 })
    }

    if (ad.userId !== session.user.id) {
      return NextResponse.json({ error: 'Нет прав на редактирование' }, { status: 403 })
    }

    // Обновляем объявление в транзакции
    const updatedAd = await prisma.$transaction(async (tx) => {
      // Если переданы изображения, обновляем их
      if (images !== undefined) {
        // Удаляем старые изображения
        await tx.adImage.deleteMany({
          where: { adId: id }
        })

        // Создаём новые изображения
        if (images && images.length > 0) {
          await tx.adImage.createMany({
            data: images.map((url: string) => ({
              url,
              adId: id
            }))
          })
        }
      }

      // Обновляем данные объявления
      return tx.ad.update({
        where: { id },
        data: {
          title,
          description,
          price: typeof price === 'string' ? parseInt(price) : price,
          cityId,
          categoryId,
        },
        include: {
          city: true,
          category: true,
          images: true,
        },
      })
    })

    return NextResponse.json(updatedAd)
  } catch (error) {
    console.error('Error updating ad:', error)
    return NextResponse.json({ error: 'Ошибка при обновлении объявления' }, { status: 500 })
  }
}
