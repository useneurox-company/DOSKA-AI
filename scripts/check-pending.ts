import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    // Проверяем уникальные aiProductCategory у НЕобогащённых
    const pending = await prisma.rawMessage.groupBy({
      by: ['aiProductCategory'],
      where: {
        aiMessageType: { in: ['request', 'offer'] },
        enrichedAt: null
      },
      _count: true
    });

    console.log('aiProductCategory у необогащённых сообщений:');
    for (const row of pending) {
      console.log(`  ${row.aiProductCategory}: ${row._count}`);
    }

    // Slugs категорий
    const categories = await prisma.enrichmentCategory.findMany({
      where: { isActive: true },
      select: { name: true, slug: true }
    });
    console.log('\nSlug категорий:');
    for (const cat of categories) {
      console.log(`  ${cat.name} -> ${cat.slug}`);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
