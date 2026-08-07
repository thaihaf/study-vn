'use server';

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(12).max(128);

function baseUrl() {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

async function deliverReset(email: string, resetUrl: string) {
  const webhook = process.env.PASSWORD_RESET_WEBHOOK_URL;
  if (webhook) {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, resetUrl }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('PASSWORD_RESET_DELIVERY_FAILED');
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.info(
      JSON.stringify({ event: 'password_reset_link', email, resetUrl }),
    );
  }
}

export async function requestPasswordReset(form: FormData) {
  const email = emailSchema.parse(form.get('email')).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) redirect('/forgot-password?sent=1');

  const recent = await db.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  if (recent >= 3) redirect('/forgot-password?sent=1');

  await db.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });
  const token = crypto.randomBytes(32).toString('hex');
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = new URL('/reset-password', baseUrl());
  resetUrl.searchParams.set('token', token);
  await deliverReset(email, resetUrl.toString());
  redirect('/forgot-password?sent=1');
}

export async function resetPassword(form: FormData) {
  const token = z.string().min(20).parse(form.get('token'));
  const password = passwordSchema.parse(form.get('password'));
  const confirmation = z.string().parse(form.get('confirmPassword'));
  if (password !== confirmation) throw new Error('PASSWORDS_DO_NOT_MATCH');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new Error('RESET_TOKEN_INVALID_OR_EXPIRED');
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.session.deleteMany({ where: { userId: record.userId } }),
    db.auditLog.create({
      data: {
        actorId: record.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: record.userId,
      },
    }),
  ]);

  redirect('/login?reset=1');
}
