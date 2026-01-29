/**
 * Script to cleanup stuck jobs and run 3 pipeline tests
 */

import { prisma } from "../src/lib/prisma";
import { pipelineManager } from "../src/lib/pipeline";

async function main() {
  console.log("=".repeat(60));
  console.log("PIPELINE COMPREHENSIVE TEST (WITH CLEANUP)");
  console.log("=".repeat(60));

  // 1. Cleanup stuck enrichment jobs
  console.log("\n[STEP 1] Cleaning up stuck enrichment jobs...\n");

  const stuckJobs = await prisma.enrichmentJob.updateMany({
    where: {
      status: { in: ["running", "pending"] },
    },
    data: {
      status: "stopped",
      stoppedAt: new Date(),
      errorMessage: "Cleaned up by test script",
    },
  });

  console.log(`Cleaned up ${stuckJobs.count} stuck enrichment jobs`);

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

  const cycleResults: Array<{ parsed: number; classified: number; enriched: number; matched: number }> = [];

  for (let i = 1; i <= 3; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`PIPELINE CYCLE ${i}/3`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const result = await pipelineManager.runPipelineCycle();
      cycleResults.push(result);

      console.log(`\nCycle ${i} completed:`);
      console.log(`  Parsed: ${result.parsed}`);
      console.log(`  Classified: ${result.classified}`);
      console.log(`  Enriched: ${result.enriched}`);
      console.log(`  Matched: ${result.matched}`);

      // Brief pause between cycles
      if (i < 3) {
        console.log("\nWaiting 3 seconds before next cycle...");
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (error) {
      console.error(`Cycle ${i} error:`, error instanceof Error ? error.message : error);
      cycleResults.push({ parsed: 0, classified: 0, enriched: 0, matched: 0 });
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

  // 5. Summary
  console.log("\n[STEP 5] Summary...\n");

  const totalProcessed = cycleResults.reduce((acc, r) => ({
    parsed: acc.parsed + r.parsed,
    classified: acc.classified + r.classified,
    enriched: acc.enriched + r.enriched,
    matched: acc.matched + r.matched,
  }), { parsed: 0, classified: 0, enriched: 0, matched: 0 });

  console.log("Total processed across 3 cycles:");
  console.log(`  Parsed: ${totalProcessed.parsed}`);
  console.log(`  Classified: ${totalProcessed.classified}`);
  console.log(`  Enriched: ${totalProcessed.enriched}`);
  console.log(`  Matched: ${totalProcessed.matched}`);

  // 6. Verify data quality
  console.log("\n[STEP 6] Verifying data quality...\n");

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
    const requestData = match.request.enrichedData ? JSON.parse(match.request.enrichedData as string) : {};
    const offerData = match.offer.enrichedData ? JSON.parse(match.offer.enrichedData as string) : {};

    console.log(`\n  Score: ${match.score}%`);
    console.log(`  Request: ${requestData.title || match.request.text?.substring(0, 60)}...`);
    console.log(`  Offer: ${offerData.title || match.offer.text?.substring(0, 60)}...`);
    console.log(`  Request city: ${requestData.city || "N/A"}, Offer city: ${offerData.city || "N/A"}`);
  }

  // Check for any issues
  const issues: string[] = [];

  if (finalStats.notClassified > 0) {
    issues.push(`${finalStats.notClassified} messages still not classified`);
  }
  if (finalStats.notEnriched > 10) {
    issues.push(`${finalStats.notEnriched} cards still not enriched (some may have errors)`);
  }
  if (finalStats.matches === 0 && finalStats.requests > 0 && finalStats.offers > 0) {
    issues.push("No matches found despite having requests and offers");
  }

  // Check if pipeline processed anything
  if (totalProcessed.classified === 0 && stats.notClassified > 0) {
    issues.push("Classification didn't process any messages");
  }
  if (totalProcessed.enriched === 0 && stats.notEnriched > 0) {
    issues.push("Enrichment didn't process any messages");
  }

  if (issues.length > 0) {
    console.log("\n⚠️ Issues found:");
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log("\n✓ All checks passed!");
  }

  // 7. Sample enriched card
  console.log("\n[STEP 7] Sample enriched cards...\n");

  const sampleCards = await prisma.rawMessage.findMany({
    where: {
      enrichedData: { not: null },
      aiMessageType: { in: ["request", "offer"] },
    },
    take: 3,
    orderBy: { enrichedAt: "desc" },
    select: { id: true, text: true, enrichedData: true, aiMessageType: true },
  });

  for (const card of sampleCards) {
    try {
      const data = JSON.parse(card.enrichedData as string);
      if (!data.skipped) {
        console.log(`\n[${card.aiMessageType?.toUpperCase()}] ${data.title}`);
        console.log(`  Category: ${data.category}`);
        console.log(`  Subcategory: ${data.subcategory}`);
        console.log(`  City: ${data.city || "N/A"}`);
        console.log(`  Price: ${data.price?.value || "N/A"} ${data.price?.per || ""}`);
        console.log(`  Items: ${data.items?.length || 0}`);
      }
    } catch {
      // Skip parsing errors
    }
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
