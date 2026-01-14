import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function requireConfirmation() {
  if (process.env.CONFIRM_CLEAN_DB !== 'true') {
    // Intentionally require an explicit opt-in since this is destructive.
    console.error(
      '❌ Refusing to wipe DB. Set CONFIRM_CLEAN_DB=true to proceed.',
    );
    process.exit(1);
  }
}

function assertSafeIdentifier(name: string) {
  // Table names from pg_tables should be safe, but we still validate to avoid
  // accidentally executing unexpected SQL.
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe table name encountered: "${name}"`);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  requireConfirmation();

  const tables = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;

  if (tables.length === 0) {
    console.log('✅ No tables found to truncate (public schema).');
    return;
  }

  for (const t of tables) assertSafeIdentifier(t.tablename);

  const qualified = tables
    .map((t) => `"public"."${t.tablename}"`)
    .join(', ');

  console.log(`🗑️  Truncating ${tables.length} tables...`);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${qualified} RESTART IDENTITY CASCADE;`,
  );
  console.log('✅ Database cleaned successfully (all records removed).');
}

main()
  .catch((error) => {
    console.error('❌ DB clean failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

