import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { parseFile } from '@/lib/parsers'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/pdf',
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'image/jpeg',
  'image/png',
  'image/webp',
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    // Валидация размера
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 20МБ)' }, { status: 400 })
    }

    // Валидация типа
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|pdf|doc|docx|jpg|jpeg|png|webp)$/i)) {
      return NextResponse.json({ error: 'Неподдерживаемый формат файла' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await parseFile(buffer, file.name, file.type)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[UploadParse] Error:', error)
    return NextResponse.json(
      { error: 'Ошибка при обработке файла', success: false, items: [], warnings: [] },
      { status: 500 }
    )
  }
}
