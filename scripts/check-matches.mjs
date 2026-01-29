import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function check() {
  // 1. Статистика матчей
  const matches = await prisma.match.findMany({
    include: {
      request: {
        select: { id: true, enrichedData: true, enrichmentCategory: { select: { slug: true, name: true } } }
      },
      offer: {
        select: { id: true, enrichedData: true, enrichmentCategory: { select: { slug: true, name: true } } }
      }
    }
  });

  console.log('=== СТАТИСТИКА МАТЧЕЙ ===');
  console.log('Всего матчей:', matches.length);

  // Проверяем категории в матчах
  const catStats = {};
  const subStats = {};

  for (const m of matches) {
    // Request
    const reqCat = m.request.enrichmentCategory?.name || m.request.enrichmentCategory?.slug;
    if (reqCat) {
      catStats[reqCat] = (catStats[reqCat] || 0) + 1;
    }

    // Offer
    const offerCat = m.offer.enrichmentCategory?.name || m.offer.enrichmentCategory?.slug;
    if (offerCat) {
      catStats[offerCat] = (catStats[offerCat] || 0) + 1;
    }

    // Подкатегории
    try {
      const reqData = m.request.enrichedData ? JSON.parse(m.request.enrichedData) : null;
      const offerData = m.offer.enrichedData ? JSON.parse(m.offer.enrichedData) : null;

      if (reqData?.subcategory) {
        const key = reqData.subcategory;
        subStats[key] = (subStats[key] || 0) + 1;
      }
      if (offerData?.subcategory) {
        const key = offerData.subcategory;
        subStats[key] = (subStats[key] || 0) + 1;
      }
    } catch {}
  }

  console.log('\nКатегории в матчах (упоминания):');
  Object.entries(catStats).sort((a,b) => b[1] - a[1]).forEach(([name, count]) => {
    console.log(' ', name, ':', count);
  });

  console.log('\nПодкатегории в матчах (топ 15):');
  Object.entries(subStats).sort((a,b) => b[1] - a[1]).slice(0,15).forEach(([name, count]) => {
    console.log(' ', name, ':', count);
  });

  // 2. Сколько карточек НЕ участвуют в матчах
  const allCards = await prisma.rawMessage.count({
    where: { enrichedAt: { not: null }, enrichedData: { not: null } }
  });

  const cardsInMatches = new Set();
  matches.forEach(m => {
    cardsInMatches.add(m.requestId);
    cardsInMatches.add(m.offerId);
  });

  console.log('\n=== ПОКРЫТИЕ КАРТОЧЕК ===');
  console.log('Всего обогащённых карточек:', allCards);
  console.log('Уникальных карточек в матчах:', cardsInMatches.size);
  console.log('Карточек БЕЗ матчей:', allCards - cardsInMatches.size);

  // 3. Типы карточек
  const cards = await prisma.rawMessage.findMany({
    where: { enrichedAt: { not: null }, enrichedData: { not: null } },
    select: { enrichedData: true }
  });

  let requests = 0, offers = 0;
  for (const c of cards) {
    try {
      const data = JSON.parse(c.enrichedData);
      if (data.type === 'REQUEST') requests++;
      else if (data.type === 'OFFER') offers++;
    } catch {}
  }

  console.log('\nТипы карточек:');
  console.log('  REQUEST:', requests);
  console.log('  OFFER:', offers);
  console.log('  Потенциальных пар (REQUEST * OFFER):', requests * offers);

  // 4. Проверяем MatchEvaluation
  const evaluations = await prisma.matchEvaluation.count();
  const acceptedEvals = await prisma.matchEvaluation.count({ where: { wasAccepted: true } });
  const rejectedEvals = await prisma.matchEvaluation.count({ where: { wasAccepted: false } });

  console.log('\n=== ИСТОРИЯ ОЦЕНОК (MatchEvaluation) ===');
  console.log('Всего оценок:', evaluations);
  console.log('  Принято (score >= 40):', acceptedEvals);
  console.log('  Отклонено (score < 40):', rejectedEvals);

  // 5. Примеры матчей - качество
  console.log('\n=== ПРИМЕРЫ МАТЧЕЙ (топ 5 по score) ===');
  const topMatches = await prisma.match.findMany({
    orderBy: { score: 'desc' },
    take: 5,
    include: {
      request: { select: { enrichedData: true } },
      offer: { select: { enrichedData: true } }
    }
  });

  for (const m of topMatches) {
    try {
      const req = JSON.parse(m.request.enrichedData);
      const off = JSON.parse(m.offer.enrichedData);
      console.log(`\n[Score: ${m.score}]`);
      console.log(`  REQUEST: ${req.title} | ${req.subcategory} | ${req.city}`);
      console.log(`  OFFER:   ${off.title} | ${off.subcategory} | ${off.city}`);
      console.log(`  Причина: ${m.reason?.slice(0, 100)}...`);
    } catch {}
  }

  // 6. Пример плохого матча (низкий score)
  console.log('\n=== ПРИМЕРЫ СЛАБЫХ МАТЧЕЙ (score 40-50) ===');
  const weakMatches = await prisma.match.findMany({
    where: { score: { gte: 40, lte: 50 } },
    take: 3,
    include: {
      request: { select: { enrichedData: true } },
      offer: { select: { enrichedData: true } }
    }
  });

  for (const m of weakMatches) {
    try {
      const req = JSON.parse(m.request.enrichedData);
      const off = JSON.parse(m.offer.enrichedData);
      console.log(`\n[Score: ${m.score}]`);
      console.log(`  REQUEST: ${req.title} | ${req.subcategory}`);
      console.log(`  OFFER:   ${off.title} | ${off.subcategory}`);
    } catch {}
  }

  await prisma.$disconnect();
}

check().catch(console.error);
