/**
 * Тест межкатегорийных пар
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { findCandidates } from '../src/lib/crm/matcher';

async function test() {
  console.log('=== ТЕСТ МЕЖКАТЕГОРИЙНЫХ ПАР ===\n');

  const candidates = await findCandidates(prisma, { limit: 50000 });
  console.log('Всего кандидатов:', candidates.length);

  // Подсчёт по категориям
  let sameCat = 0;
  let crossCat = 0;
  let noCategory = 0;

  const crossCategoryPairs: typeof candidates = [];

  for (const c of candidates) {
    if (!c.request.categoryId || !c.offer.categoryId) {
      noCategory++;
    } else if (c.request.categoryId === c.offer.categoryId) {
      sameCat++;
    } else {
      crossCat++;
      if (crossCategoryPairs.length < 5) {
        crossCategoryPairs.push(c);
      }
    }
  }

  console.log('\nРаспределение:');
  console.log('  Одна категория:', sameCat);
  console.log('  Разные категории:', crossCat);
  console.log('  Без категории:', noCategory);

  if (crossCategoryPairs.length > 0) {
    console.log('\nПримеры межкатегорийных пар:');
    for (const c of crossCategoryPairs) {
      console.log(`\n  REQUEST: ${c.request.title} (${c.request.categoryId})`);
      console.log(`  OFFER: ${c.offer.title} (${c.offer.categoryId})`);
      console.log(`  SQL Score: ${c.sqlScore}`);
    }
  }

  // Статистика по score
  const scores = candidates.map(c => c.sqlScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  console.log('\n=== СТАТИСТИКА SCORE ===');
  console.log('Min:', minScore);
  console.log('Max:', maxScore);
  console.log('Avg:', Math.round(avgScore));

  // Распределение по score
  const scoreRanges: Record<string, number> = {
    '10-19': 0,
    '20-29': 0,
    '30-39': 0,
    '40-49': 0,
    '50-59': 0,
    '60+': 0,
  };

  for (const s of scores) {
    if (s < 20) scoreRanges['10-19']++;
    else if (s < 30) scoreRanges['20-29']++;
    else if (s < 40) scoreRanges['30-39']++;
    else if (s < 50) scoreRanges['40-49']++;
    else if (s < 60) scoreRanges['50-59']++;
    else scoreRanges['60+']++;
  }

  console.log('\nРаспределение по score:');
  for (const [range, count] of Object.entries(scoreRanges)) {
    const pct = Math.round(count / candidates.length * 100);
    console.log(`  ${range}: ${count} (${pct}%)`);
  }

  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
