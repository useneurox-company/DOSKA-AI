/**
 * Скрипт для исправления ошибок AI в базе данных
 * Запуск: node scripts/fix-errors.js
 */

const API_BASE = 'http://localhost:3000/api';

// ID заявок с ошибками агрегации (из анализа)
const AGGREGATION_ERRORS = [
  'cmk1mvxcx000ak4unk5drnwpb', // #k5drnwpb - 9 дней
  'cmk1mfomk0005mouncg4jferq', // #cg4jferq - 23 дня
  'cmk1nawxq000zk4unrz3e12xw', // #rz3e12xw - 8 дней
  'cmk1myqz6000ik4unlddrgadu', // #lddrgadu - 19 дней
  'cmk1n35gu000pk4unvwhhlbdy', // #vwhhlbdy - 19 дней
  'cmk1nq73t001dk4unxt3mh7dm', // #xt3mh7dm - 26 дней
  'cmk1n7ca4000sk4un21i8jkv7', // #21i8jkv7 - 28 дней
  'cmk1mv8ac0009k4un9vz3mw45', // #9vz3mw45 - 56 дней
  'cmk1pcb0v002qk4unxm6dc9mt', // #xm6dc9mt - 1 час (ok, skip)
  'cmk1me9x30003moun3gwq28yo', // #3gwq28yo - 67 дней
  'cmk1p6qhz002jk4unj9fgf32x', // #j9fgf32x - 19 дней
  'cmk1pxh5q003ak4un1d4l2i0c', // #1d4l2i0c - 1 день
  'cmk1phw3q002zk4unrpwvtf9m', // #rpwvtf9m - 13 дней
  'cmk1pl42y0032k4unx1cw9x0t', // #x1cw9x0t - 12 дней
  'cmk1msh6p0001k4un740xkym5', // #740xkym5 - 89 дней
  'cmk1n23rc000nk4unynhyy35d', // #ynhyy35d - 49 дней
  'cmk1pkypj0031k4un8uz4pf1e', // #8uz4pf1e - 18 дней
  'cmk1n6oyy000rk4unswi2ptp0', // #swi2ptp0 - 60 дней
  'cmk1mfyw50006moun622j8w0x', // #622j8w0x - 55 дней
];

async function fetchRequest(id) {
  const res = await fetch(`${API_BASE}/requests/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function fixAggregationErrors() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  1. ИСПРАВЛЕНИЕ ОШИБОК АГРЕГАЦИИ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const fixes = [];

  for (const requestId of AGGREGATION_ERRORS) {
    const req = await fetchRequest(requestId);
    if (!req || !req.rawMessages || req.rawMessages.length < 2) {
      console.log(`⏭️  #${requestId.slice(-8)} - не найден или 1 сообщение`);
      continue;
    }

    // Сортируем по дате
    const sorted = [...req.rawMessages].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Находим группы сообщений (разрыв > 1 часа = новая группа)
    const groups = [];
    let currentGroup = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const gapHours = (curr - prev) / (1000 * 60 * 60);

      if (gapHours > 1) {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      } else {
        currentGroup.push(sorted[i]);
      }
    }
    groups.push(currentGroup);

    if (groups.length <= 1) {
      console.log(`✓ #${requestId.slice(-8)} - нет разрывов > 1 часа`);
      continue;
    }

    // Первая группа остаётся в заявке, остальные отвязываем
    const keepIds = groups[0].map(m => m.id);
    const unlinkIds = sorted.filter(m => !keepIds.includes(m.id)).map(m => m.id);

    console.log(`🔧 #${requestId.slice(-8)} | ${req.nomenclature || '-'}`);
    console.log(`   Групп: ${groups.length} | Оставить: ${keepIds.length} сообщ. | Отвязать: ${unlinkIds.length} сообщ.`);
    groups.forEach((g, i) => {
      const dates = g.map(m => m.date.split('T')[0]).join(', ');
      console.log(`   Группа ${i + 1}: ${g.length} сообщ. (${dates})`);
    });

    fixes.push({
      requestId,
      nomenclature: req.nomenclature,
      keepIds,
      unlinkIds,
    });
  }

  return fixes;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ИСПРАВЛЕНИЕ ОШИБОК AI В БАЗЕ                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Анализ ошибок агрегации
  const aggregationFixes = await fixAggregationErrors();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ИТОГО');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Заявок с ошибками агрегации: ${aggregationFixes.length}`);
  console.log(`Сообщений к отвязке: ${aggregationFixes.reduce((sum, f) => sum + f.unlinkIds.length, 0)}`);

  // Сохраняем для применения
  const fs = require('fs');
  fs.writeFileSync('fixes.json', JSON.stringify({
    aggregationFixes,
  }, null, 2));

  console.log('\n✅ Анализ сохранён в fixes.json');
  console.log('Для применения изменений запустите: node scripts/apply-fixes.js');
}

main().catch(console.error);
