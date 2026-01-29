const fs = require('fs');

// Читаем ID заявок с несколькими сообщениями
const multiIds = JSON.parse(fs.readFileSync('multi_ids.json', 'utf8'));

async function fetchRequest(id) {
  const response = await fetch(`http://localhost:3000/api/requests/${id}`);
  return response.json();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         ДЕТАЛЬНЫЙ АНАЛИЗ ОШИБОК АГРЕГАЦИИ                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const errors = [];
  const questionErrors = [];

  for (const id of multiIds) {
    const req = await fetchRequest(id);
    if (!req.rawMessages || req.rawMessages.length < 2) continue;

    // Сортируем по дате
    const sorted = [...req.rawMessages].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Проверяем разрывы
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / (1000 * 60 * 60);
      if (gap > maxGap) maxGap = gap;
    }

    if (maxGap > 1) { // Разрыв больше 1 часа
      errors.push({
        id: req.id,
        nomenclature: req.nomenclature,
        contact: req.contactUsername || req.contactName,
        messageCount: req.rawMessages.length,
        maxGapHours: Math.round(maxGap),
        maxGapDays: Math.round(maxGap / 24),
        messages: sorted.map(m => ({
          date: m.date?.split('T')[0],
          text: (m.text || '[фото]').slice(0, 50),
        })),
      });
    }

    // Проверяем вопросы
    sorted.forEach(msg => {
      const text = msg.text || '';
      if (text.includes('?') && text.length < 100) {
        questionErrors.push({
          requestId: req.id.slice(-8),
          text: text.slice(0, 80),
          nomenclature: req.nomenclature,
        });
      }
    });
  }

  // === ОШИБКИ АГРЕГАЦИИ ===
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ОШИБКИ АГРЕГАЦИИ (разрыв > 1 часа)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Найдено: ${errors.length} заявок с неправильной агрегацией\n`);

  errors.forEach((e, i) => {
    console.log(`${i + 1}. #${e.id.slice(-8)} | ${e.nomenclature || '-'} | @${e.contact || '-'}`);
    console.log(`   Сообщений: ${e.messageCount} | Макс. разрыв: ${e.maxGapDays} дн (${e.maxGapHours}ч)`);
    e.messages.forEach(m => {
      console.log(`   - ${m.date}: "${m.text}..."`);
    });
    console.log('');
  });

  // === ВОПРОСЫ В ЗАЯВКАХ ===
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ВОПРОСЫ В ЗАЯВКАХ (потенциальные ошибки)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Найдено: ${questionErrors.length} вопросов\n`);

  questionErrors.forEach((q, i) => {
    console.log(`${i + 1}. #${q.requestId} | "${q.text}"`);
  });

  // === ИТОГО ===
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    РЕКОМЕНДАЦИИ                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('1. ОШИБКИ АГРЕГАЦИИ:');
  console.log('   - Код уже исправлен (orderBy: asc)');
  console.log('   - Нужно сбросить анализ и переанализировать');
  console.log('');
  console.log('2. ВОПРОСЫ В ЗАЯВКАХ:');
  console.log('   - Улучшить промпт AI: вопросы без ключевых слов = other');
  console.log('   - Добавить проверку: text.includes("?") && !hasKeywords = other');
  console.log('');
  console.log('3. ОБЩАЯ НОМЕНКЛАТУРА:');
  console.log('   - Использовать refiner для уточнения');
  console.log('   - "Металлоконструкции" -> конкретный тип');
}

main().catch(console.error);
