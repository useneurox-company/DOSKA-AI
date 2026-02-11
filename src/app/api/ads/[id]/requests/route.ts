import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ad = await prisma.ad.findUnique({
      where: { id },
      include: { city: true, category: true },
    })

    // Only show matching requests for offer/supplier cards
    if (!ad || ad.type === 'request') {
      return NextResponse.json({ requests: [] })
    }

    // Extract nomenclature keywords from this offer's items or title
    const items = (ad.items as Array<{ nomenclature?: string }>) || []
    const nomenclatures = items
      .map(i => i.nomenclature?.toLowerCase().trim())
      .filter(Boolean) as string[]

    // Also use title words as search terms
    const titleWords = ad.title.toLowerCase().split(/[\s,;]+/).filter(w => w.length >= 3)

    const orConditions: Record<string, unknown>[] = [
      { categoryId: ad.categoryId },
    ]

    // Search by nomenclature keywords
    const searchWords = [...new Set([
      ...nomenclatures.flatMap(n => n.split(/[\s,;]+/).filter(w => w.length >= 3)).slice(0, 6),
      ...titleWords.slice(0, 4),
    ])]

    for (const word of searchWords.slice(0, 8)) {
      orConditions.push({ title: { contains: word, mode: 'insensitive' } })
      orConditions.push({ description: { contains: word, mode: 'insensitive' } })
    }

    const requests = await prisma.ad.findMany({
      where: {
        id: { not: id },
        type: 'request',
        OR: orConditions,
      },
      include: {
        city: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Score by relevance
    const scored = requests.map(req => {
      let score = 0
      const reqTitle = req.title.toLowerCase()
      const reqDesc = (req.description || '').toLowerCase()
      const reqItems = (req.items as Array<{ nomenclature?: string }>) || []
      const reqNomenclatures = reqItems
        .map(i => i.nomenclature?.toLowerCase().trim())
        .filter(Boolean) as string[]

      if (req.categoryId === ad.categoryId) score += 30
      if (req.cityId === ad.cityId) score += 20

      for (const word of searchWords) {
        if (reqTitle.includes(word)) score += 10
        if (reqDesc.includes(word)) score += 5
        for (const rn of reqNomenclatures) {
          if (rn.includes(word)) score += 15
        }
      }

      return { req, matchScore: Math.min(score, 100) }
    })

    scored.sort((a, b) => b.matchScore - a.matchScore)

    const result = scored.slice(0, 10).map(({ req, matchScore }) => ({
      id: req.id,
      title: req.title,
      description: req.description,
      city: req.city.name,
      category: req.category.name,
      contactName: req.contactName,
      contactPhone: req.contactPhone,
      matchScore,
      createdAt: req.createdAt,
    }))

    return NextResponse.json({ requests: result })
  } catch (error) {
    console.error('Error fetching matching requests:', error)
    return NextResponse.json({ requests: [] })
  }
}
