import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  // Проверяем объявления
  const ads = await prisma.ad.findMany({
    take: 10,
    include: {
      images: true,
      city: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log("=== ОБЪЯВЛЕНИЯ ===");
  console.log("Всего:", ads.length);

  for (const ad of ads) {
    console.log(`\n--- ${ad.title} ---`);
    console.log("Source:", ad.source);
    console.log("City:", ad.city?.name);
    console.log("Images:", ad.images.length > 0 ? ad.images.map(i => i.url) : "НЕТ ИЗОБРАЖЕНИЙ");
  }

  // Проверяем общее количество изображений
  const imageCount = await prisma.adImage.count();
  console.log("\n=== СТАТИСТИКА ===");
  console.log("Всего изображений в AdImage:", imageCount);

  await prisma.$disconnect();
  await pool.end();
}

check();
