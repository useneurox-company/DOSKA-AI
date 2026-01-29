const fs = require('fs');

// Загружаем данные
const requests = JSON.parse(fs.readFileSync('temp_requests.json', 'utf8')).requests || [];
const offers = JSON.parse(fs.readFileSync('temp_offers.json', 'utf8')).requests || [];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           АНАЛИЗ КАЧЕСТВА AI-КЛАССИФИКАЦИИ                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// === 1. ОШИБКИ АГРЕГАЦИИ (большой разрыв между сообщениями) ===
console.log('═══════════════════════════════════════════════════════════════');
console.log('  1. ОШИБКИ АГРЕГАЦИИ (разрыв > 1 часа между сообщениями)');
console.log('═══════════════════════════════════════════════════════════════\n');

function analyzeTimeGaps(items, type) {
  const errors = [];

  items.forEach(item => {
    if (!item.rawMessages || item.rawMessages.length < 2) return;

    // Сортируем сообщения по дате
    const sorted = [...item.rawMessages].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Проверяем разрывы между сообщениями
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i-1].date);
      const curr = new Date(sorted[i].date);
      const diffHours = (curr - prev) / (1000 * 60 * 60);

      if (diffHours > 1) { // Разрыв больше 1 часа
        errors.push({
          id: item.id,
          type,
          nomenclature: item.nomenclature,
          messageCount: item.rawMessages.length,
          gap: diffHours,
          dates: sorted.map(m => m.date.split('T')[0]).join(' → '),
          contact: item.contactUsername || item.contactName,
        });
        break; // Одну ошибку на заявку
      }
    }
  });

  return errors;
}

const requestGapErrors = analyzeTimeGaps(requests, 'request');
const offerGapErrors = analyzeTimeGaps(offers, 'offer');

console.log(`Заявок с неправильной агрегацией: ${requestGapErrors.length}`);
requestGapErrors.forEach(e => {
  console.log(`  #${e.id.slice(-8)} | ${e.nomenclature || '-'} | ${e.messageCount} сообщ. | разрыв ${Math.round(e.gap)}ч | ${e.dates}`);
});

console.log(`\nПредложений с неправильной агрегацией: ${offerGapErrors.length}`);
offerGapErrors.forEach(e => {
  console.log(`  #${e.id.slice(-8)} | ${e.nomenclature || '-'} | ${e.messageCount} сообщ. | разрыв ${Math.round(e.gap)}ч | ${e.dates}`);
});

// === 2. ВОПРОСЫ, КЛАССИФИЦИРОВАННЫЕ КАК ЗАЯВКИ ===
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  2. ВОПРОСЫ, ОШИБОЧНО КЛАССИФИЦИРОВАННЫЕ КАК ЗАЯВКИ');
console.log('═══════════════════════════════════════════════════════════════\n');

function findQuestions(items, type) {
  const questions = [];

  items.forEach(item => {
    if (!item.rawMessages) return;

    item.rawMessages.forEach(msg => {
      const text = msg.text || '';
      // Проверяем: короткий текст заканчивающийся на "?"
      if (text.length < 100 && text.includes('?') && !text.match(/куплю|нужн|ищу|требуется|продам|продаю|есть в наличии/i)) {
        questions.push({
          id: item.id,
          type,
          text: text.slice(0, 80),
          nomenclature: item.nomenclature,
        });
      }
    });
  });

  return questions;
}

const requestQuestions = findQuestions(requests, 'request');
const offerQuestions = findQuestions(offers, 'offer');

console.log(`Вопросов в заявках: ${requestQuestions.length}`);
requestQuestions.forEach(q => {
  console.log(`  #${q.id.slice(-8)} | "${q.text}"`);
});

console.log(`\nВопросов в предложениях: ${offerQuestions.length}`);
offerQuestions.forEach(q => {
  console.log(`  #${q.id.slice(-8)} | "${q.text}"`);
});

// === 3. ПУСТАЯ/ОБЩАЯ НОМЕНКЛАТУРА ===
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  3. ПУСТАЯ ИЛИ СЛИШКОМ ОБЩАЯ НОМЕНКЛАТУРА');
console.log('═══════════════════════════════════════════════════════════════\n');

const genericNomenclatures = ['Металлоконструкции', 'Металл', 'Металлопрокат', 'Прочее', null, ''];

function countGeneric(items) {
  return items.filter(i => genericNomenclatures.includes(i.nomenclature)).length;
}

const genericRequests = requests.filter(i => genericNomenclatures.includes(i.nomenclature));
const genericOffers = offers.filter(i => genericNomenclatures.includes(i.nomenclature));

console.log(`Заявок с общей номенклатурой: ${genericRequests.length} из ${requests.length}`);
console.log(`Предложений с общей номенклатурой: ${genericOffers.length} из ${offers.length}`);

console.log('\nПримеры заявок с общей номенклатурой:');
genericRequests.slice(0, 5).forEach(r => {
  const text = r.rawMessages?.[0]?.text || r.material || '';
  console.log(`  #${r.id.slice(-8)} | ${r.nomenclature || 'null'} | "${text.slice(0, 60)}..."`);
});

// === 4. СТАТИСТИКА ПО НОМЕНКЛАТУРАМ ===
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  4. ТОП НОМЕНКЛАТУР (должны быть конкретными)');
console.log('═══════════════════════════════════════════════════════════════\n');

const allNoms = {};
[...requests, ...offers].forEach(r => {
  const nom = r.nomenclature || 'null';
  allNoms[nom] = (allNoms[nom] || 0) + 1;
});

console.log('Топ-15 номенклатур:');
Object.entries(allNoms)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([nom, count]) => {
    const marker = genericNomenclatures.includes(nom) ? ' ⚠️ СЛИШКОМ ОБЩАЯ' : '';
    console.log(`  ${count}x ${nom}${marker}`);
  });

// === 5. КОРОТКИЕ СООБЩЕНИЯ (потенциально неверная классификация) ===
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  5. КОРОТКИЕ СООБЩЕНИЯ (< 30 символов)');
console.log('═══════════════════════════════════════════════════════════════\n');

function findShortMessages(items, type) {
  const short = [];
  items.forEach(item => {
    if (!item.rawMessages) return;
    item.rawMessages.forEach(msg => {
      const text = msg.text || '';
      if (text.length > 0 && text.length < 30) {
        short.push({
          id: item.id,
          type,
          text,
          nomenclature: item.nomenclature,
        });
      }
    });
  });
  return short;
}

const shortRequests = findShortMessages(requests, 'request');
const shortOffers = findShortMessages(offers, 'offer');

console.log(`Коротких сообщений в заявках: ${shortRequests.length}`);
shortRequests.slice(0, 10).forEach(s => {
  console.log(`  #${s.id.slice(-8)} | "${s.text}"`);
});

console.log(`\nКоротких сообщений в предложениях: ${shortOffers.length}`);
shortOffers.slice(0, 10).forEach(s => {
  console.log(`  #${s.id.slice(-8)} | "${s.text}"`);
});

// === ИТОГО ===
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                         ИТОГО                                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`📊 Всего заявок: ${requests.length}`);
console.log(`📊 Всего предложений: ${offers.length}`);
console.log('');
console.log(`❌ Ошибок агрегации: ${requestGapErrors.length + offerGapErrors.length}`);
console.log(`❓ Вопросов вместо заявок: ${requestQuestions.length + offerQuestions.length}`);
console.log(`⚠️  С общей номенклатурой: ${genericRequests.length + genericOffers.length}`);
console.log(`📝 Коротких сообщений: ${shortRequests.length + shortOffers.length}`);
