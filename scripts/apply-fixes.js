/**
 * Применение исправлений к базе данных
 * Запуск: node scripts/apply-fixes.js
 */

const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';

// Сообщения-вопросы которые нужно переклассифицировать в "other"
// (из анализа - вопросы без намерения купить/продать)
const QUESTION_MESSAGES_TO_FIX = [];

async function applyFix(action, messageIds, newType = null) {
  const body = { action, messageIds };
  if (newType) body.newType = newType;

  const res = await fetch(`${API_BASE}/ai/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error: ${res.status} - ${error}`);
  }

  return res.json();
}

async function deleteEmptyRequests() {
  const res = await fetch(`${API_BASE}/ai/fix`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error: ${res.status} - ${error}`);
  }

  return res.json();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ПРИМЕНЕНИЕ ИСПРАВЛЕНИЙ                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Читаем файл с исправлениями
  if (!fs.existsSync('fixes.json')) {
    console.log('❌ Файл fixes.json не найден. Сначала запустите: node scripts/fix-errors.js');
    process.exit(1);
  }

  const fixes = JSON.parse(fs.readFileSync('fixes.json', 'utf8'));

  // 1. Исправляем ошибки агрегации
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  1. ОТВЯЗКА СООБЩЕНИЙ ОТ НЕПРАВИЛЬНЫХ ЗАЯВОК');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalUnlinked = 0;

  for (const fix of fixes.aggregationFixes) {
    if (fix.unlinkIds.length === 0) continue;

    console.log(`🔧 #${fix.requestId.slice(-8)} | ${fix.nomenclature || '-'}`);
    console.log(`   Отвязываем ${fix.unlinkIds.length} сообщений...`);

    try {
      const result = await applyFix('unlink', fix.unlinkIds);
      console.log(`   ✅ Отвязано: ${result.count}`);
      totalUnlinked += result.count;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log(`\n📊 Всего отвязано: ${totalUnlinked} сообщений`);

  // 2. Переклассифицируем вопросы
  if (QUESTION_MESSAGES_TO_FIX.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  2. ПЕРЕКЛАССИФИКАЦИЯ ВОПРОСОВ В "OTHER"');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
      const result = await applyFix('reclassify', QUESTION_MESSAGES_TO_FIX, 'other');
      console.log(`✅ Переклассифицировано: ${result.count} сообщений`);
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
    }
  }

  // 3. Удаляем пустые заявки
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  3. УДАЛЕНИЕ ПУСТЫХ ЗАЯВОК');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const result = await deleteEmptyRequests();
    console.log(`✅ Удалено пустых заявок: ${result.deleted}`);
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ГОТОВО!                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
