'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { validateVersion } from '@/modules/publishing/service';

export async function reviewSubmission(form: FormData) {
  const reviewer = await requirePermission('review');
  const input = z
    .object({
      versionId: z.string().min(1),
      decision: z.enum(['APPROVED', 'REJECTED', 'COMMENT']),
      comment: z.string().trim().min(1).max(4000),
    })
    .parse(Object.fromEntries(form));

  const version = await db.courseVersion.findUniqueOrThrow({
    where: { id: input.versionId },
  });
  if (version.status !== 'IN_REVIEW') throw new Error('VERSION_NOT_IN_REVIEW');

  if (input.decision === 'APPROVED') {
    const validation = await validateVersion(db, version.id);
    if (validation.errors.length) {
      throw new Error(`REVIEW_INVALID:${validation.errors.join('|')}`);
    }
  }

  await db.$transaction(async (transaction) => {
    await transaction.review.create({
      data: {
        versionId: input.versionId,
        reviewerId: reviewer.id,
        decision: input.decision,
        comment: input.comment,
      },
    });

    if (input.decision === 'APPROVED') {
      await transaction.courseVersion.update({
        where: { id: input.versionId },
        data: { reviewedById: reviewer.id, reviewedAt: new Date() },
      });
    }
    if (input.decision === 'REJECTED') {
      await transaction.courseVersion.update({
        where: { id: input.versionId },
        data: {
          status: 'DRAFT',
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
          revision: { increment: 1 },
        },
      });
    }

    await transaction.auditLog.create({
      data: {
        actorId: reviewer.id,
        action: `COURSE_REVIEW_${input.decision}`,
        entityType: 'CourseVersion',
        entityId: input.versionId,
      },
    });
  });

  revalidatePath('/admin/reviews');
  revalidatePath(`/admin/courses/${version.courseId}/edit`);
}
