import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase(),
    password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      'Cần SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD mạnh (ít nhất 12 ký tự).',
    );
  await db.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN', canPublish: true },
    create: {
      email,
      name: 'Quản trị hệ thống',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'SUPER_ADMIN',
      canPublish: true,
    },
  });
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.SEED_LEARNER_EMAIL &&
    process.env.SEED_LEARNER_PASSWORD
  ) {
    await db.user.upsert({
      where: { email: process.env.SEED_LEARNER_EMAIL },
      update: {},
      create: {
        email: process.env.SEED_LEARNER_EMAIL,
        passwordHash: await bcrypt.hash(process.env.SEED_LEARNER_PASSWORD, 12),
        role: 'LEARNER',
      },
    });
  }
}
main().finally(() => db.$disconnect());
