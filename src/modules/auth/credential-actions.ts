'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { signIn } from '@/auth';
import { db } from '@/lib/db';
import { assertRateLimit } from '@/lib/rate-limit';

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

export async function login(form: FormData) {
  const input = credentials.parse(Object.fromEntries(form));
  const email = input.email.toLowerCase();
  assertRateLimit('login', email, { limit: 8, windowMs: 15 * 60 * 1000 });
  await signIn('credentials', {
    email,
    password: input.password,
    redirectTo: '/dashboard',
  });
}

export async function register(form: FormData) {
  const input = credentials
    .extend({ name: z.string().min(2).max(100) })
    .parse(Object.fromEntries(form));
  const email = input.email.toLowerCase();
  assertRateLimit('register', email, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  const exists = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (exists) throw new Error('EMAIL_ALREADY_REGISTERED');

  await db.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });

  await signIn('credentials', {
    email,
    password: input.password,
    redirectTo: '/dashboard',
  });
}
