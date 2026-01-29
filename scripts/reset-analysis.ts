import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reset() {
  console.log('Resetting AI analysis data...');

  const result = await prisma.rawMessage.updateMany({
    data: {
      aiAnalyzed: false,
      aiCategory: null,
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
      aiRawResponse: null,
      aiAnalyzedAt: null
    }
  });

  console.log(`Reset ${result.count} messages`);
  await prisma.$disconnect();
  await pool.end();
}

reset().catch(console.error);
