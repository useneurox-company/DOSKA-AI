const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching messages...');

  const messages = await prisma.rawMessage.findMany({
    where: {
      text: { not: null },
    },
    orderBy: { date: 'asc' },
    take: 500,
    select: {
      id: true,
      messageId: true,
      text: true,
      date: true,
      senderId: true,
      senderName: true,
      senderUsername: true,
      hasMedia: true,
      mediaType: true,
      sourceId: true,
    },
  });

  console.log(`Found ${messages.length} messages`);

  // Для каждого сообщения получим контекст
  const results = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const windowMinutes = 10;
    const msgDate = new Date(msg.date);
    const windowBefore = new Date(msgDate.getTime() - windowMinutes * 60 * 1000);
    const windowAfter = new Date(msgDate.getTime() + windowMinutes * 60 * 1000);

    // Получаем контекст
    const context = await prisma.rawMessage.findMany({
      where: {
        sourceId: msg.sourceId,
        id: { not: msg.id },
        date: { gte: windowBefore, lte: windowAfter },
        text: { not: null },
      },
      orderBy: { date: 'asc' },
      take: 10,
      select: {
        text: true,
        senderName: true,
        senderId: true,
        hasMedia: true,
        mediaType: true,
      },
    });

    results.push({
      id: msg.id,
      text: msg.text,
      senderName: msg.senderName,
      senderUsername: msg.senderUsername,
      hasMedia: msg.hasMedia,
      mediaType: msg.mediaType,
      date: msg.date,
      context: context.map(c => ({
        text: c.text?.substring(0, 200),
        sender: c.senderName || 'Аноним',
        isSameAuthor: c.senderId === msg.senderId,
        hasMedia: c.hasMedia,
      })),
    });

    if ((i + 1) % 50 === 0) {
      console.log(`Processed ${i + 1}/${messages.length}`);
    }
  }

  fs.writeFileSync('messages_for_analysis.json', JSON.stringify(results, null, 2));
  console.log('Saved to messages_for_analysis.json');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
