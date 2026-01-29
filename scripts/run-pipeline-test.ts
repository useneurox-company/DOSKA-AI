/**
 * Pipeline test script - runs 3 complete pipeline cycles
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

console.log("=".repeat(60));
console.log("PIPELINE TEST - 3 CYCLES");
console.log("=".repeat(60));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getStats() {
  return {
    total: await prisma.rawMessage.count(),
    notClassified: await prisma.rawMessage.count({ where: { aiAnalyzed: false, text: { not: null } } }),
    requests: await prisma.rawMessage.count({ where: { aiMessageType: "request" } }),
    offers: await prisma.rawMessage.count({ where: { aiMessageType: "offer" } }),
    notEnriched: await prisma.rawMessage.count({ where: { aiMessageType: { in: ["request", "offer"] }, enrichedAt: null } }),
    enriched: await prisma.rawMessage.count({ where: { enrichedAt: { not: null } } }),
    matches: await prisma.match.count(),
    evaluations: await prisma.matchEvaluation.count(),
  };
}

async function printStats(label: string) {
  const stats = await getStats();
  console.log(`\n${label}:`);
  console.log(`  Total: ${stats.total}, Not classified: ${stats.notClassified}`);
  console.log(`  Requests: ${stats.requests}, Offers: ${stats.offers}`);
  console.log(`  Not enriched: ${stats.notEnriched}, Enriched: ${stats.enriched}`);
  console.log(`  Matches: ${stats.matches}, Evaluations: ${stats.evaluations}`);
}

async function main() {
  // Cleanup stuck jobs first
  console.log("\n[CLEANUP] Cleaning up stuck jobs...");
  const cleaned = await prisma.enrichmentJob.updateMany({
    where: { status: { in: ["running", "pending"] } },
    data: { status: "stopped", stoppedAt: new Date() },
  });
  console.log(`Cleaned ${cleaned.count} stuck jobs`);

  await printStats("INITIAL STATE");

  // Now import and run pipeline
  console.log("\n[LOADING] Loading pipeline manager...");

  // Dynamic import to avoid initialization issues
  const { pipelineManager } = await import("../src/lib/pipeline");

  console.log("Pipeline manager loaded");

  // Run 3 cycles
  for (let i = 1; i <= 3; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`CYCLE ${i}/3`);
    console.log(`${"=".repeat(60)}`);

    try {
      const result = await pipelineManager.runPipelineCycle();
      console.log(`\nCycle ${i} completed:`);
      console.log(`  Parsed: ${result.parsed}`);
      console.log(`  Classified: ${result.classified}`);
      console.log(`  Enriched: ${result.enriched}`);
      console.log(`  Matched: ${result.matched}`);

      if (i < 3) {
        console.log("\nWaiting 3s before next cycle...");
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (error) {
      console.error(`Cycle ${i} error:`, error instanceof Error ? error.message : error);
    }
  }

  await printStats("FINAL STATE");

  // Show sample matches
  console.log("\n[MATCHES] Top 5 matches:");
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
    console.log(`\n  Score: ${match.score}%`);
    console.log(`  REQ: ${reqData.title || match.request.text?.substring(0, 50)}...`);
    console.log(`  OFF: ${offData.title || match.offer.text?.substring(0, 50)}...`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST COMPLETED");
  console.log("=".repeat(60));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
