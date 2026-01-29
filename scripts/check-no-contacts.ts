import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("=== Проверка контактов ===\n");

  // Все REQUEST/OFFER сообщения
  const messages = await prisma.rawMessage.findMany({
    where: {
      aiMessageType: { in: ["request", "offer"] }
    },
    select: {
      id: true,
      senderName: true,
      senderUsername: true,
      senderPhone: true,
      text: true,
      aiMessageType: true,
      aiHasContacts: true,
    },
    orderBy: { createdAt: "desc" }
  });

  console.log(`Всего REQUEST/OFFER: ${messages.length}\n`);

  // Группируем по наличию контактов
  const noContacts: typeof messages = [];
  const hasTextContacts: typeof messages = [];
  const hasProfileContacts: typeof messages = [];

  for (const m of messages) {
    const hasUsername = !!m.senderUsername;
    const hasPhone = !!m.senderPhone;
    const hasInText = m.aiHasContacts === true;

    if (!hasUsername && !hasPhone && !hasInText) {
      noContacts.push(m);
    } else if (hasInText) {
      hasTextContacts.push(m);
    } else {
      hasProfileContacts.push(m);
    }
  }

  console.log(`С контактами в тексте: ${hasTextContacts.length}`);
  console.log(`С username/phone в профиле: ${hasProfileContacts.length}`);
  console.log(`БЕЗ контактов (реально): ${noContacts.length}\n`);

  if (noContacts.length > 0) {
    console.log("=== Сообщения БЕЗ контактов ===\n");
    for (const m of noContacts.slice(0, 10)) {
      console.log(`--- ${m.senderName || "Без имени"} ---`);
      console.log(`Тип: ${m.aiMessageType}`);
      console.log(`Username: ${m.senderUsername || "НЕТ"}`);
      console.log(`Phone: ${m.senderPhone || "НЕТ"}`);
      console.log(`aiHasContacts: ${m.aiHasContacts}`);
      console.log(`Текст: ${m.text?.substring(0, 100)}...\n`);
    }
  }

  // Проверка: есть ли сообщения с aiHasContacts=false но с username/phone?
  const falseButHasProfile = messages.filter(m =>
    m.aiHasContacts === false && (m.senderUsername || m.senderPhone)
  );

  if (falseButHasProfile.length > 0) {
    console.log(`\n=== Ранее неправильно помечены (aiHasContacts=false, но есть username/phone): ${falseButHasProfile.length} ===\n`);
    for (const m of falseButHasProfile.slice(0, 5)) {
      console.log(`- ${m.senderName}: @${m.senderUsername || "нет"}, тел: ${m.senderPhone || "нет"}`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

check();
