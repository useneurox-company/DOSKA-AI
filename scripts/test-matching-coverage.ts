/**
 * Тест покрытия карточек матчингом
 * Проверяет что ВСЕ карточки будут участвовать в матчинге
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { findCandidates } from '../src/lib/crm/matcher';

async function testCoverage() {
  console.log('=== ТЕСТ ПОКРЫТИЯ КАРТОЧЕК ===\n');

  // 1. Получаем все обогащённые карточки
  const cards = await prisma.rawMessage.findMany({
    where: { enrichedAt: { not: null }, enrichedData: { not: null } },
    select: { id: true, enrichedData: true, enrichmentCategory: { select: { name: true } } }
  });

  let requests = 0, offers = 0;
  const requestIds = new Set<string>();
  const offerIds = new Set<string>();
  const cardsByCategory: Record<string, { requests: number, offers: number }> = {};

  for (const c of cards) {
    try {
      const data = JSON.parse(c.enrichedData!);
      const cat = c.enrichmentCategory?.name || 'Без категории';

      if (!cardsByCategory[cat]) {
        cardsByCategory[cat] = { requests: 0, offers: 0 };
      }

      if (data.type === 'REQUEST') {
        requests++;
        requestIds.add(c.id);
        cardsByCategory[cat].requests++;
      } else if (data.type === 'OFFER') {
        offers++;
        offerIds.add(c.id);
        cardsByCategory[cat].offers++;
      }
    } catch {}
  }

  console.log('Всего карточек:', cards.length);
  console.log('  REQUEST:', requests);
  console.log('  OFFER:', offers);
  console.log('  Потенциальных пар (REQUEST * OFFER):', requests * offers);

  console.log('\nПо категориям:');
  for (const [cat, stats] of Object.entries(cardsByCategory)) {
    console.log(`  ${cat}: ${stats.requests} REQUEST, ${stats.offers} OFFER`);
  }

  // 2. Существующие матчи и оценки
  const [existingMatches, existingEvaluations] = await Promise.all([
    prisma.match.findMany({ select: { requestId: true, offerId: true } }),
    prisma.matchEvaluation.findMany({ select: { requestId: true, offerId: true } })
  ]);

  const evaluatedPairs = new Set([
    ...existingMatches.map(m => `${m.requestId}:${m.offerId}`),
    ...existingEvaluations.map(e => `${e.requestId}:${e.offerId}`)
  ]);

  console.log('\n=== СУЩЕСТВУЮЩИЕ ОЦЕНКИ ===');
  console.log('Матчей в Match:', existingMatches.length);
  console.log('Оценок в MatchEvaluation:', existingEvaluations.length);
  console.log('Уникальных оцененных пар:', evaluatedPairs.size);

  // 3. Запускаем findCandidates (без AI - только SQL фильтрация)
  console.log('\n=== ТЕСТ findCandidates ===');
  console.time('findCandidates');

  const candidates = await findCandidates(prisma, {
    limit: 50000, // Большой лимит
  });

  console.timeEnd('findCandidates');
  console.log('Найдено кандидатов:', candidates.length);

  // 4. Проверяем покрытие
  const candidateRequestIds = new Set(candidates.map(c => c.request.id));
  const candidateOfferIds = new Set(candidates.map(c => c.offer.id));

  const requestsCovered = [...requestIds].filter(id => candidateRequestIds.has(id)).length;
  const offersCovered = [...offerIds].filter(id => candidateOfferIds.has(id)).length;

  console.log('\n=== ПОКРЫТИЕ КАРТОЧЕК В КАНДИДАТАХ ===');
  console.log(`REQUEST: ${requestsCovered}/${requests} (${Math.round(requestsCovered/requests*100)}%)`);
  console.log(`OFFER: ${offersCovered}/${offers} (${Math.round(offersCovered/offers*100)}%)`);

  // 5. Проверяем межкатегорийные пары
  let sameCategoryPairs = 0;
  let crossCategoryPairs = 0;

  for (const c of candidates.slice(0, 1000)) { // Выборка для скорости
    if (c.request.categoryId === c.offer.categoryId) {
      sameCategoryPairs++;
    } else {
      crossCategoryPairs++;
    }
  }

  console.log('\n=== МЕЖКАТЕГОРИЙНЫЕ ПАРЫ (выборка 1000) ===');
  console.log('Одна категория:', sameCategoryPairs);
  console.log('Разные категории:', crossCategoryPairs);

  // 6. Сколько ещё нужно оценить
  const newPairs = candidates.length;
  const evaluatedCount = evaluatedPairs.size;
  const totalPossible = requests * offers;

  console.log('\n=== ИТОГО ===');
  console.log(`Уже оценено: ${evaluatedCount} пар`);
  console.log(`Новых кандидатов: ${newPairs} пар`);
  console.log(`Всего возможных пар: ${totalPossible}`);
  console.log(`Прогресс: ${Math.round((evaluatedCount / totalPossible) * 100)}%`);

  // Сколько запусков нужно при 100 оценках за раз
  const evaluationsPerRun = 100;
  const runsNeeded = Math.ceil(newPairs / evaluationsPerRun);
  console.log(`\nПри ${evaluationsPerRun} оценках за запуск нужно ~${runsNeeded} запусков`);

  // 7. Проверяем что все категории представлены
  const categoriesInCandidates = new Set<string>();
  for (const c of candidates) {
    if (c.request.categoryId) categoriesInCandidates.add(c.request.categoryId);
    if (c.offer.categoryId) categoriesInCandidates.add(c.offer.categoryId);
  }

  const allCategories = await prisma.enrichmentCategory.findMany({ select: { id: true, name: true } });
  console.log('\n=== КАТЕГОРИИ В КАНДИДАТАХ ===');
  for (const cat of allCategories) {
    const present = categoriesInCandidates.has(cat.id) ? '✓' : '✗';
    console.log(`  ${present} ${cat.name}`);
  }

  process.exit(0);
}

testCoverage().catch(e => {
  console.error(e);
  process.exit(1);
});
