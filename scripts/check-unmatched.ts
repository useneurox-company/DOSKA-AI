import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function check() {
  // Получаем все матчи
  const matches = await prisma.match.findMany({
    select: { requestId: true, offerId: true }
  });

  const matchedIds = new Set<string>();
  matches.forEach(m => {
    matchedIds.add(m.requestId);
    matchedIds.add(m.offerId);
  });

  // Все обогащённые карточки
  const cards = await prisma.rawMessage.findMany({
    where: { enrichedAt: { not: null }, enrichedData: { not: null } },
    select: {
      id: true,
      enrichedData: true,
      enrichmentCategory: { select: { name: true, slug: true } }
    }
  });

  // Группируем по категориям и типам - сколько без матчей
  const stats: Record<string, { requests: number, offers: number, unmatchedReq: number, unmatchedOff: number }> = {};

  for (const c of cards) {
    try {
      const data = JSON.parse(c.enrichedData!);
      const cat = c.enrichmentCategory?.name || 'Без категории';

      if (!stats[cat]) {
        stats[cat] = { requests: 0, offers: 0, unmatchedReq: 0, unmatchedOff: 0 };
      }

      if (data.type === 'REQUEST') {
        stats[cat].requests++;
        if (!matchedIds.has(c.id)) stats[cat].unmatchedReq++;
      } else if (data.type === 'OFFER') {
        stats[cat].offers++;
        if (!matchedIds.has(c.id)) stats[cat].unmatchedOff++;
      }
    } catch {}
  }

  console.log('=== КАРТОЧКИ БЕЗ МАТЧЕЙ ПО КАТЕГОРИЯМ ===\n');

  for (const [cat, s] of Object.entries(stats).sort((a,b) => (b[1].requests + b[1].offers) - (a[1].requests + a[1].offers))) {
    console.log(`${cat}:`);
    console.log(`  REQUEST: ${s.requests} всего, ${s.unmatchedReq} без матчей (${Math.round(s.unmatchedReq/s.requests*100)}%)`);
    console.log(`  OFFER:   ${s.offers} всего, ${s.unmatchedOff} без матчей (${Math.round(s.unmatchedOff/s.offers*100)}%)`);
  }

  // Примеры карточек БЕЗ матчей
  console.log('\n=== ПРИМЕРЫ REQUEST БЕЗ МАТЧЕЙ ===');
  const unmatchedRequests = cards
    .filter(c => {
      const data = JSON.parse(c.enrichedData!);
      return data.type === 'REQUEST' && !matchedIds.has(c.id);
    })
    .slice(0, 5);

  for (const c of unmatchedRequests) {
    const data = JSON.parse(c.enrichedData!);
    console.log(`\n- ${data.title}`);
    console.log(`  Подкатегория: ${data.subcategory}`);
    console.log(`  Город: ${data.city}`);
    console.log(`  Категория: ${c.enrichmentCategory?.name}`);
  }

  console.log('\n=== ПРИМЕРЫ OFFER БЕЗ МАТЧЕЙ ===');
  const unmatchedOffers = cards
    .filter(c => {
      const data = JSON.parse(c.enrichedData!);
      return data.type === 'OFFER' && !matchedIds.has(c.id);
    })
    .slice(0, 5);

  for (const c of unmatchedOffers) {
    const data = JSON.parse(c.enrichedData!);
    console.log(`\n- ${data.title}`);
    console.log(`  Подкатегория: ${data.subcategory}`);
    console.log(`  Город: ${data.city}`);
    console.log(`  Категория: ${c.enrichmentCategory?.name}`);
  }

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
