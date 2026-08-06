import { PrismaClient } from '@prisma/client';
import { serverEnvSchema } from '../src/lib/env';

const parsed = serverEnvSchema.pick({ DATABASE_URL: true, DIRECT_URL: true }).safeParse(process.env);
if (!parsed.success) {
  console.error('Database check blocked: set valid DATABASE_URL and DIRECT_URL values. Values were not printed.');
  process.exit(2);
}

const db = new PrismaClient();
try {
  const rows = await db.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
  if (rows[0]?.ok !== 1) throw new Error('Unexpected read-only probe result');
  console.log('Database read-only connectivity check passed.');
} finally {
  await db.$disconnect();
}
