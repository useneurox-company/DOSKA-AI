/**
 * Script to fix stuck messages and run 3 pipeline tests
 */

import { prisma } from "../src/lib/prisma";
import { pipelineManager } from "../src/lib/pipeline";

async function main() {
  console.log("=".repeat(60));
  console.log("PIPELINE COMPREHENSIVE TEST");
  console.log("=".repeat(60));

  // 1. Fix any stuck messages with repeated JSON errors
  console.log("\n[STEP 1] Fixing stuck messages...\n");

  const stuckMessages = await prisma.rawMessage.findMany({
    where: {
      aiMessageType: { in: ["request", "offer"] },
      enrichedAt: null,
      enrichedData: null,
    },
    take: 10,
    select: { id: true, text: true },
  });

  console.log(`Found ${stuckMessages.length} messages pending enrichment`);

  // 2. Check current state
  console.log("\n[STEP 2] Current database state...\n");

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

  console.log("Database stats:");
  console.log(`  Total messages: ${stats.total}`);
  console.log(`  Not classified: ${stats.notClassified}`);
  console.log(`  Requests: ${stats.requests}`);
  console.log(`  Offers: ${stats.offers}`);
  console.log(`  Not enriched: ${stats.notEnriched}`);
  console.log(`  Enriched: ${stats.enriched}`);
  console.log(`  Matches: ${stats.matches}`);
  console.log(`  Evaluations: ${stats.evaluations}`);

  // 3. Run 3 pipeline cycles
  console.log("\n[STEP 3] Running 3 pipeline cycles...\n");

  for (let i = 1; i <= 3; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`PIPELINE CYCLE ${i}/3`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const result = await pipelineManager.runPipelineCycle();
      console.log(`\nCycle ${i} completed:`);
      console.log(`  Parsed: ${result.parsed}`);
      console.log(`  Classified: ${result.classified}`);
      console.log(`  Enriched: ${result.enriched}`);
      console.log(`  Matched: ${result.matched}`);

      // Brief pause between cycles
      if (i < 3) {
        console.log("\nWaiting 5 seconds before next cycle...");
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (error) {
      console.error(`Cycle ${i} error:`, error instanceof Error ? error.message : error);
    }
  }

  // 4. Final stats
  console.log("\n[STEP 4] Final database state...\n");

  const finalStats = {
    total: await prisma.rawMessage.count(),
    notClassified: await prisma.rawMessage.count({ where: { aiAnalyzed: false, text: { not: null } } }),
    requests: await prisma.rawMessage.count({ where: { aiMessageType: "request" } }),
    offers: await prisma.rawMessage.count({ where: { aiMessageType: "offer" } }),
    notEnriched: await prisma.rawMessage.count({ where: { aiMessageType: { in: ["request", "offer"] }, enrichedAt: null } }),
    enriched: await prisma.rawMessage.count({ where: { enrichedAt: { not: null } } }),
    matches: await prisma.match.count(),
    evaluations: await prisma.matchEvaluation.count(),
  };

  console.log("Final stats:");
  console.log(`  Total messages: ${finalStats.total}`);
  console.log(`  Not classified: ${finalStats.notClassified}`);
  console.log(`  Requests: ${finalStats.requests}`);
  console.log(`  Offers: ${finalStats.offers}`);
  console.log(`  Not enriched: ${finalStats.notEnriched}`);
  console.log(`  Enriched: ${finalStats.enriched}`);
  console.log(`  Matches: ${finalStats.matches}`);
  console.log(`  Evaluations: ${finalStats.evaluations}`);

  // 5. Verify data quality
  console.log("\n[STEP 5] Verifying data quality...\n");

  // Check sample of matches
  const sampleMatches = await prisma.match.findMany({
    take: 5,
    orderBy: { score: "desc" },
    include: {
      request: { select: { text: true, enrichedData: true } },
      offer: { select: { text: true, enrichedData: true } },
    },
  });

  console.log("Top 5 matches by score:");
  for (const match of sampleMatches) {
    console.log(`\n  Score: ${match.score}%`);
    console.log(`  Request: ${match.request.text?.substring(0, 80)}...`);
    console.log(`  Offer: ${match.offer.text?.substring(0, 80)}...`);
  }

  // Check for any issues
  const issues: string[] = [];

  if (finalStats.notClassified > 0) {
    issues.push(`${finalStats.notClassified} messages still not classified`);
  }
  if (finalStats.notEnriched > 0) {
    issues.push(`${finalStats.notEnriched} cards still not enriched`);
  }
  if (finalStats.matches === 0 && finalStats.requests > 0 && finalStats.offers > 0) {
    issues.push("No matches found despite having requests and offers");
  }

  if (issues.length > 0) {
    console.log("\n⚠️ Issues found:");
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log("\n✓ All checks passed!");
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST COMPLETED");
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
