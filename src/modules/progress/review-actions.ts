'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';
import { nextReview } from '@/modules/progress/review';

export async function gradeReviewItem(form: FormData) {
  const user = await requireUser();
  const input = z
    .object({
      reviewItemId: z.string().min(1),
      grade: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']),
    })
    .parse(Object.fromEntries(form));

  const item = await db.reviewItem.findFirst({
    where: { id: input.reviewItemId, userId: user.id },
  });
  if (!item) throw new Error('REVIEW_ITEM_NOT_FOUND');

  const next = nextReview(item.intervalDays, item.ease, input.grade);
  await db.reviewItem.update({
    where: { id: item.id },
    data: next,
  });
  revalidatePath('/practice/review');
  revalidatePath('/dashboard');
}
