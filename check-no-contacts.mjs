import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.rawMessage.findMany({
    where: {
      aiType: { in: ['REQUEST', 'OFFER'] },
      aiHasContacts: false
    },
    select: {
      id: true,
      senderName: true,
      senderUsername: true,
      text: true,
      aiType: true,
      aiHasContacts: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('=== Сообщения без текстовых контактов ===');
  console.log('Всего:', messages.length);
  console.log('');

  messages.forEach((m, i) => {
    const hasUsername = m.senderUsername ? 'ЕСТЬ @' + m.senderUsername : 'НЕТ USERNAME';
    console.log(`${i+1}. ${m.senderName || 'Без имени'} | ${hasUsername}`);
    console.log(`   Тип: ${m.aiType}`);
    console.log(`   Текст: ${m.text?.substring(0, 100)}...`);
    console.log('');
  });

  const withUsername = messages.filter(m => m.senderUsername).length;
  const withoutUsername = messages.filter(m => !m.senderUsername).length;
  console.log('--- ИТОГО ---');
  console.log('С username (можно связаться):', withUsername);
  console.log('Без username (нельзя связаться):', withoutUsername);
}

main().finally(() => prisma.$disconnect());
