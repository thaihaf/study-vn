'use server';

import { db } from '@/lib/db';
import { runGeneration } from '@/modules/ai/actions';
import { generateLessonDraft } from '@/modules/ai/lesson-actions';
import { requirePermission } from '@/modules/auth/session';

async function assertGenerationRateLimit(userId: string) {
  const recent = await db.generationJob.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= 30) throw new Error('AI_GENERATION_RATE_LIMIT');
}

export async function runRateLimitedGeneration(form: FormData) {
  const user = await requirePermission('ai:generate');
  await assertGenerationRateLimit(user.id);
  return runGeneration(form);
}

export async function generateRateLimitedLessonDraft(form: FormData) {
  const user = await requirePermission('ai:generate');
  await assertGenerationRateLimit(user.id);
  return generateLessonDraft(form);
}
