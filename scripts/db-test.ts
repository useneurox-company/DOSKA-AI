/**
 * Simple DB test
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

console.log("Starting...");
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
  });

  console.log("Pool created");

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Prisma client created");

  try {
    const count = await prisma.rawMessage.count();
    console.log("Total messages:", count);

    const stats = {
      requests: await prisma.rawMessage.count({ where: { aiMessageType: "request" } }),
      offers: await prisma.rawMessage.count({ where: { aiMessageType: "offer" } }),
      matches: await prisma.match.count(),
    };

    console.log("Requests:", stats.requests);
    console.log("Offers:", stats.offers);
    console.log("Matches:", stats.matches);

    // Cleanup stuck jobs
    const cleaned = await prisma.enrichmentJob.updateMany({
      where: { status: { in: ["running", "pending"] } },
      data: { status: "stopped", stoppedAt: new Date() },
    });
    console.log("Cleaned jobs:", cleaned.count);

  } finally {
    await prisma.$disconnect();
    await pool.end();
    console.log("Done");
  }
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
