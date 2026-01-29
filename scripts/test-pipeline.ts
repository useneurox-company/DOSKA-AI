/**
 * Тестовый скрипт для проверки Pipeline
 * Запуск: npx tsx scripts/test-pipeline.ts
 */

import { prisma } from "../src/lib/prisma";
import { pipelineManager } from "../src/lib/pipeline";

async function checkDatabaseState() {
  console.log("\n=== СОСТОЯНИЕ БАЗЫ ДО ТЕСТА ===\n");

  const total = await prisma.rawMessage.count();
  const notClassified = await prisma.rawMessage.count({
    where: { aiAnalyzed: false, text: { not: null } },
  });
  const requests = await prisma.rawMessage.count({
    where: { aiMessageType: "request" },
  });
  const offers = await prisma.rawMessage.count({
    where: { aiMessageType: "offer" },
  });
  const notEnriched = await prisma.rawMessage.count({
    where: { aiMessageType: { in: ["request", "offer"] }, enrichedAt: null },
  });
  const enriched = await prisma.rawMessage.count({
    where: { enrichedAt: { not: null } },
  });
  const matches = await prisma.match.count();
  const evaluations = await prisma.matchEvaluation.count();

  console.log(`Всего сообщений:      ${total}`);
  console.log(`Не классифицировано:  ${notClassified}`);
  console.log(`Requests:             ${requests}`);
  console.log(`Offers:               ${offers}`);
  console.log(`Не обогащено:         ${notEnriched}`);
  console.log(`Обогащено:            ${enriched}`);
  console.log(`Матчей:               ${matches}`);
  console.log(`Оценено пар:          ${evaluations}`);

  return { total, notClassified, requests, offers, notEnriched, enriched, matches, evaluations };
}

async function showSampleMatches() {
  console.log("\n=== ПРИМЕРЫ МАТЧЕЙ ===\n");

  const matches = await prisma.match.findMany({
    take: 5,
    orderBy: { score: "desc" },
    include: {
      request: {
        select: {
          id: true,
          text: true,
          aiMessageType: true,
          aiNomenclature: true,
          senderName: true,
        },
      },
      offer: {
        select: {
          id: true,
          text: true,
          aiMessageType: true,
          aiNomenclature: true,
          senderName: true,
        },
      },
    },
  });

  if (matches.length === 0) {
    console.log("Матчей пока нет");
    return;
  }

  for (const match of matches) {
    console.log(`\n--- Матч #${match.id.slice(0, 8)} (Score: ${match.score}%) ---`);
    console.log(`REQUEST: [${match.request.aiNomenclature || "?"}] ${match.request.text?.slice(0, 100)}...`);
    console.log(`OFFER:   [${match.offer.aiNomenclature || "?"}] ${match.offer.text?.slice(0, 100)}...`);
    console.log(`Причина: ${match.reason?.slice(0, 150) || "Не указана"}`);
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║            ТЕСТ PIPELINE - ПРОВЕРКА РАБОТЫ               ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  // 1. Проверяем состояние до теста
  const before = await checkDatabaseState();

  // 2. Получаем настройки
  const settings = await pipelineManager.getSettings();
  console.log("\n=== НАСТРОЙКИ PIPELINE ===");
  console.log(`Auto enabled:     ${settings.autoPipelineEnabled}`);
  console.log(`Classify enabled: ${settings.autoClassifyEnabled}`);
  console.log(`Enrich enabled:   ${settings.autoEnrichEnabled}`);
  console.log(`Match enabled:    ${settings.autoMatchEnabled}`);
  console.log(`Global date:      ${settings.globalParseFromDate || "Не установлена"}`);

  // 3. Запускаем pipeline если есть что обрабатывать
  if (before.notClassified > 0 || before.notEnriched > 0) {
    console.log("\n=== ЗАПУСК PIPELINE ===\n");
    console.log("Запускаем цикл pipeline...");

    try {
      const stats = await pipelineManager.runPipelineCycle();
      console.log("\n=== РЕЗУЛЬТАТ ЦИКЛА ===");
      console.log(`Спарсено:      ${stats.parsed}`);
      console.log(`Классиф.:      ${stats.classified}`);
      console.log(`Обогащено:     ${stats.enriched}`);
      console.log(`Новых матчей:  ${stats.matched}`);
    } catch (error) {
      console.error("Ошибка pipeline:", error);
    }

    // 4. Проверяем состояние после
    const after = await checkDatabaseState();

    console.log("\n=== ИЗМЕНЕНИЯ ===");
    console.log(`Классифицировано: +${before.notClassified - after.notClassified}`);
    console.log(`Обогащено:        +${after.enriched - before.enriched}`);
    console.log(`Новых матчей:     +${after.matches - before.matches}`);
  } else {
    console.log("\n⚠️  Нет данных для обработки (всё уже классифицировано и обогащено)");
  }

  // 5. Показываем примеры матчей
  await showSampleMatches();

  console.log("\n✅ Тест завершён\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
