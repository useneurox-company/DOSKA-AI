/**
 * Скрипт очистки данных анализа и обогащения
 * Запуск: npx tsx scripts/clear-analysis.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearAnalysis() {
  console.log("Очистка данных анализа и обогащения...\n");

  // 1. Удаляем все задания обогащения
  const deletedJobs = await prisma.enrichmentJob.deleteMany({});
  console.log("Удалено заданий обогащения:", deletedJobs.count);

  // 2. Удаляем агрегированные заявки
  const deletedRequests = await prisma.request.deleteMany({});
  console.log("Удалено заявок:", deletedRequests.count);

  // 3. Сбрасываем поля анализа и обогащения в RawMessage
  const updated = await prisma.rawMessage.updateMany({
    data: {
      aiAnalyzed: false,
      aiMessageType: null,
      aiProductCategory: null,
      aiNomenclature: null,
      aiMaterial: null,
      aiPrice: null,
      aiPriceUnit: null,
      aiQuantity: null,
      aiCity: null,
      aiPhone: null,
      aiConfidence: null,
      aiReason: null,
      aiRawResponse: null,
      aiAnalyzedAt: null,
      aiModel: null,
      aiCategory: null,
      enrichedAt: null,
      enrichedData: null,
      enrichmentCategoryId: null,
      enrichmentJobId: null,
      requestId: null,
    },
  });
  console.log("Сброшено сообщений:", updated.count);

  console.log("\n✓ Готово! База очищена для повторного анализа.");
}

clearAnalysis()
  .catch((e) => {
    console.error("Ошибка:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
