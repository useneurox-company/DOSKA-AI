import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  // Только request и offer
  const classified = await prisma.rawMessage.findMany({
    where: {
      aiAnalyzed: true,
      aiMessageType: { in: ["request", "offer"] }
    },
    take: 20,
    select: {
      id: true,
      text: true,
      aiMessageType: true,
      aiProductCategory: true,
      aiConfidence: true,
      aiReason: true,
    },
  });

  console.log("Найдено классифицированных:", classified.length);
  for (const m of classified) {
    console.log("---");
    console.log("Type:", m.aiMessageType);
    console.log("Category:", m.aiProductCategory);
    console.log("Confidence:", m.aiConfidence);
    console.log("Reason:", m.aiReason?.substring(0, 100));
    console.log("Text:", m.text?.substring(0, 80));
  }

  await prisma.$disconnect();
  await pool.end();
}

check();
