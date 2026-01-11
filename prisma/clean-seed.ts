// Clean and re-seed bowling types
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const bowlingTypes = [
  { shortName: 'FAST', fullName: 'Fast' },
  { shortName: 'FAST_MEDIUM', fullName: 'Fast Medium' },
  { shortName: 'OFF_SPIN', fullName: 'Off Spin' },
  { shortName: 'LEG_SPIN', fullName: 'Leg Spin' },
  { shortName: 'CHINAMAN', fullName: 'Chinaman' },
  { shortName: 'ORTHODOX', fullName: 'Orthodox' },
];

async function main() {
  console.log('🗑️  Deleting old bowling types...');

  // Delete all existing bowling types
  const deleted = await prisma.bowlingType.deleteMany({});
  console.log(`   Deleted ${deleted.count} old bowling types`);

  console.log('🌱 Seeding new bowling types...');

  // Insert new bowling types
  for (const type of bowlingTypes) {
    await prisma.bowlingType.create({
      data: type,
    });
  }

  console.log('✅ Bowling types cleaned and seeded successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Clean seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
