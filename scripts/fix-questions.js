/**
 * Поиск и исправление вопросов, ошибочно классифицированных как request/offer
 * Запуск: node scripts/fix-questions.js
 */

const API_BASE = 'http://localhost:3000/api';

// Ключевые слова которые указывают на намерение купить/продать
const INTENT_KEYWORDS = /нужн|куплю|ищу|требуется|продам|продаю|есть в наличии|отдам|приму/i;

async function fetchMessages(type, limit = 500) {
  const res = await fetch(`${API_BASE}/ai/messages?messageType=${type}&limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages || [];
}

async function reclassifyMessages(messageIds) {
  const res = await fetch(`${API_BASE}/ai/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reclassify',
      messageIds,
      newType: 'other',
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error: ${res.status} - ${error}`);
  }

  return res.json();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     ПОИСК И ИСПРАВЛЕНИЕ ВОПРОСОВ                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Получаем все request и offer сообщения
  console.log('Загружаю сообщения...');
  const requests = await fetchMessages('request');
  const offers = await fetchMessages('offer');

  console.log(`Загружено: ${requests.length} request, ${offers.length} offer\n`);

  const questionsToFix = [];

  // Проверяем каждое сообщение
  [...requests, ...offers].forEach(msg => {
    const text = msg.text || '';

    // Критерии вопроса без намерения:
    // 1. Содержит "?"
    // 2. Короткое (< 100 символов)
    // 3. НЕТ ключевых слов намерения
    if (text.includes('?') && text.length < 100 && !INTENT_KEYWORDS.test(text)) {
      questionsToFix.push({
        id: msg.id,
        type: msg.aiMessageType,
        text: text.slice(0, 70),
      });
    }
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  НАЙДЕННЫЕ ВОПРОСЫ ДЛЯ ПЕРЕКЛАССИФИКАЦИИ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (questionsToFix.length === 0) {
    console.log('✅ Вопросов для исправления не найдено!');
    return;
  }

  questionsToFix.forEach((q, i) => {
    console.log(`${i + 1}. [${q.type}] "${q.text}"`);
  });

  console.log(`\n📊 Всего: ${questionsToFix.length} вопросов\n`);

  // Применяем исправления
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ПРИМЕНЕНИЕ ИСПРАВЛЕНИЙ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const result = await reclassifyMessages(questionsToFix.map(q => q.id));
    console.log(`✅ Переклассифицировано в "other": ${result.count} сообщений`);
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ГОТОВО!                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
