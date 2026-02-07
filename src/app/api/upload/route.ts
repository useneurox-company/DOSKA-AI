import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Файлы не выбраны' }, { status: 400 })
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Максимум 5 изображений' }, { status: 400 })
    }

    // Создаём директорию для загрузок если её нет
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const urls: string[] = []

    for (const file of files) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        continue
      }

      // Проверяем размер (макс 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Файл слишком большой (макс 10MB)' }, { status: 400 })
      }

      // Генерируем уникальное имя файла
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${timestamp}-${randomStr}.${ext}`

      // Сохраняем файл
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = path.join(uploadDir, fileName)

      await writeFile(filePath, buffer)

      // Добавляем URL
      urls.push(`/uploads/${fileName}`)
    }

    if (urls.length === 0) {
      return NextResponse.json({ error: 'Не удалось загрузить изображения' }, { status: 400 })
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки файлов' }, { status: 500 })
  }
}
