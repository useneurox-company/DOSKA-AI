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

    if (!ad || ad.type !== 'request') {
      return NextResponse.json({ suppliers: [] })
    }

    // Extract nomenclature keywords from items
    const items = (ad.items as Array<{ nomenclature?: string; categoryName?: string }>) || []
    const nomenclatures = items
      .map(i => i.nomenclature?.toLowerCase().trim())
      .filter(Boolean) as string[]

    // Build search: find offer-type ads with matching category or similar nomenclature
    const orConditions: Record<string, unknown>[] = [
      { categoryId: ad.categoryId },
    ]

    // Add text search for first 5 nomenclatures to avoid overly broad queries
    for (const n of nomenclatures.slice(0, 5)) {
      // Extract key words (3+ chars) for matching
      const words = n.split(/[\s,;]+/).filter(w => w.length >= 3)
      for (const word of words.slice(0, 2)) {
        orConditions.push({ title: { contains: word, mode: 'insensitive' } })
        orConditions.push({ description: { contains: word, mode: 'insensitive' } })
      }
    }

    const suppliers = await prisma.ad.findMany({
      where: {
        id: { not: id },
        type: { not: 'request' },
        isVerified: true,
        OR: orConditions,
      },
      include: {
        city: true,
        category: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Score by relevance
    const scored = suppliers.map(supplier => {
      let score = 0
      const supplierTitle = supplier.title.toLowerCase()
      const supplierDesc = (supplier.description || '').toLowerCase()
      const supplierItems = (supplier.items as Array<{ nomenclature?: string }>) || []
      const supplierNomenclatures = supplierItems
        .map(i => i.nomenclature?.toLowerCase().trim())
        .filter(Boolean) as string[]

      // Category match
      if (supplier.categoryId === ad.categoryId) score += 30

      // City match
      if (supplier.cityId === ad.cityId) score += 20

      // Nomenclature overlap
      for (const reqNom of nomenclatures) {
        const words = reqNom.split(/[\s,;]+/).filter(w => w.length >= 3)
        for (const word of words) {
          if (supplierTitle.includes(word)) score += 10
          if (supplierDesc.includes(word)) score += 5
          for (const supNom of supplierNomenclatures) {
            if (supNom.includes(word)) score += 15
          }
        }
      }

      return { supplier, matchScore: Math.min(score, 100) }
    })

    // Sort by score desc, take top 10
    scored.sort((a, b) => b.matchScore - a.matchScore)

    const result = scored.slice(0, 10).map(({ supplier, matchScore }) => ({
      id: supplier.id,
      title: supplier.title,
      description: supplier.description,
      price: supplier.price,
      city: supplier.city.name,
      category: supplier.category.name,
      contactName: supplier.contactName,
      contactPhone: supplier.contactPhone,
      contactUsername: supplier.contactUsername,
      matchScore,
      image: supplier.images?.[0]?.url || null,
      createdAt: supplier.createdAt,
    }))

    return NextResponse.json({ suppliers: result })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ suppliers: [] })
  }
}
