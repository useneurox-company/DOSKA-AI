import { prisma } from '../src/lib/prisma';

async function analyze() {
  console.log('=== АНАЛИЗ КАЧЕСТВА AI ===\n');

  // 1. Статистика по заявкам
  const requests = await prisma.request.findMany({
    include: {
      rawMessages: { select: { text: true, date: true } },
    },
  });

  console.log('ЗАЯВКИ (Request)');
  console.log('Всего:', requests.length);

  const byType: Record<string, number> = {};
  requests.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
  console.log('По типам:', byType);

  // 2. Заявки с несколькими сообщениями
  const multiMsg = requests.filter(r => r.rawMessages.length > 1);
  console.log('\nС несколькими сообщениями:', multiMsg.length);

  // 3. Проблемные заявки (большой временной разрыв)
  console.log('\n--- ПРОБЛЕМНЫЕ ЗАЯВКИ (разница > 1 час) ---');
  let problemCount = 0;
  multiMsg.forEach(r => {
    const dates = r.rawMessages.map(m => new Date(m.date).getTime()).sort((a, b) => a - b);
    const gaps = dates.slice(1).map((d, i) => d - dates[i]);
    const maxGap = Math.max(...gaps);
    const gapHours = maxGap / (1000 * 60 * 60);
    if (gapHours > 1) {
      problemCount++;
      console.log(`\n#${r.id} | Gap: ${gapHours.toFixed(1)} часов | Msgs: ${r.rawMessages.length}`);
      r.rawMessages.slice(0, 3).forEach(m => {
        console.log(`  - ${new Date(m.date).toLocaleString('ru-RU')} | ${m.text?.slice(0, 60) || '[no text]'}`);
      });
    }
  });
  console.log(`\nИтого проблемных (разрыв > 1 час): ${problemCount}`);

  // 4. Вопросы, ошибочно классифицированные как заявки
  console.log('\n--- ВОПРОСЫ (ошибочно классифицированы) ---');
  let questionCount = 0;
  requests.forEach(r => {
    const firstMsg = r.rawMessages[0]?.text || '';
    if (firstMsg.trim().endsWith('?') && firstMsg.length < 150 && !firstMsg.toLowerCase().includes('куплю') && !firstMsg.toLowerCase().includes('продам')) {
      questionCount++;
      console.log(`#${r.id} | Type: ${r.type} | "${firstMsg.slice(0, 80)}"`);
    }
  });
  console.log(`\nИтого вопросов: ${questionCount}`);

  // 5. Статистика по RawMessage
  const rawStats = await prisma.rawMessage.groupBy({
    by: ['aiMessageType'],
    _count: true,
  });
  console.log('\n--- СТАТИСТИКА RawMessage по типам ---');
  rawStats.forEach(s => console.log(`${s.aiMessageType || 'null'}: ${s._count}`));

  // 6. Сообщения без заявки (request/offer но не в Request)
  const orphanedMessages = await prisma.rawMessage.count({
    where: {
      aiMessageType: { in: ['request', 'offer'] },
      requestId: null,
    },
  });
  console.log(`\nСообщения request/offer без заявки: ${orphanedMessages}`);

  await prisma.$disconnect();
}

analyze().catch(console.error);
