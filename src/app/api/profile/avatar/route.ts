import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 })
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Только изображения' }, { status: 400 })
    }

    // Проверяем размер (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Максимальный размер 5MB' }, { status: 400 })
    }

    // Создаём директорию для аватаров
    const uploadDir = path.join(process.cwd(), 'public', 'avatars')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${session.user.id}-${timestamp}.${ext}`

    // Сохраняем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const avatarUrl = `/avatars/${fileName}`

    // Обновляем пользователя в БД
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
    })

    return NextResponse.json({ url: avatarUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки аватара' }, { status: 500 })
  }
}
