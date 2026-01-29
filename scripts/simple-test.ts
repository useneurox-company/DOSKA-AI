/**
 * Simple pipeline test - cleanup and run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CLEANUP AND STATUS ===\n");

  // 1. Cleanup stuck jobs
  const cleaned = await prisma.enrichmentJob.updateMany({
    where: {
      status: { in: ["running", "pending"] },
    },
    data: {
      status: "stopped",
      stoppedAt: new Date(),
    },
  });
  console.log(`Cleaned up ${cleaned.count} stuck enrichment jobs`);

  // 2. Show current stats
  const stats = {
    total: await prisma.rawMessage.count(),
    notClassified: await prisma.rawMessage.count({ where: { aiAnalyzed: false, text: { not: null } } }),
    requests: await prisma.rawMessage.count({ where: { aiMessageType: "request" } }),
    offers: await prisma.rawMessage.count({ where: { aiMessageType: "offer" } }),
    notEnriched: await prisma.rawMessage.count({ where: { aiMessageType: { in: ["request", "offer"] }, enrichedAt: null } }),
    enriched: await prisma.rawMessage.count({ where: { enrichedAt: { not: null } } }),
    matches: await prisma.match.count(),
    evaluations: await prisma.matchEvaluation.count(),
  };

  console.log("\nDatabase stats:");
  console.log(`  Total messages: ${stats.total}`);
  console.log(`  Not classified: ${stats.notClassified}`);
  console.log(`  Requests: ${stats.requests}`);
  console.log(`  Offers: ${stats.offers}`);
  console.log(`  Not enriched: ${stats.notEnriched}`);
  console.log(`  Enriched: ${stats.enriched}`);
  console.log(`  Matches: ${stats.matches}`);
  console.log(`  Evaluations: ${stats.evaluations}`);

  // 3. Show sample matches
  console.log("\n=== SAMPLE MATCHES ===\n");

  const matches = await prisma.match.findMany({
    take: 5,
    orderBy: { score: "desc" },
    include: {
      request: { select: { text: true, enrichedData: true } },
      offer: { select: { text: true, enrichedData: true } },
    },
  });

  for (const match of matches) {
    const reqData = match.request.enrichedData ? JSON.parse(match.request.enrichedData as string) : {};
    const offData = match.offer.enrichedData ? JSON.parse(match.offer.enrichedData as string) : {};

    console.log(`Score: ${match.score}%`);
    console.log(`  REQ: ${reqData.title || match.request.text?.substring(0, 60)}...`);
    console.log(`  OFF: ${offData.title || match.offer.text?.substring(0, 60)}...`);
    console.log("");
  }

  // 4. Show enriched sample
  console.log("=== SAMPLE ENRICHED CARDS ===\n");

  const cards = await prisma.rawMessage.findMany({
    where: {
      enrichedData: { not: null },
      aiMessageType: { in: ["request", "offer"] },
    },
    take: 3,
    orderBy: { enrichedAt: "desc" },
  });

  for (const card of cards) {
    try {
      const data = JSON.parse(card.enrichedData as string);
      if (!data.skipped && data.title) {
        console.log(`[${card.aiMessageType?.toUpperCase()}] ${data.title}`);
        console.log(`  Category: ${data.category}, Subcategory: ${data.subcategory}`);
        console.log(`  City: ${data.city || "N/A"}`);
        console.log("");
      }
    } catch {}
  }

  console.log("\n=== DONE ===");
  console.log("Pipeline is ready. Use POST /api/pipeline with action='runOnce' to test.");

  await prisma.$disconnect();
}

main().catch(console.error);
