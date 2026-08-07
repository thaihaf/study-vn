'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';

function safeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = typeof value === 'string' ? value : '';
  if (!returnTo.startsWith('/learn/')) throw new Error('INVALID_RETURN_PATH');
  return returnTo;
}

export async function enrollCourse(form: FormData) {
  const user = await requireUser();
  const courseId = z.string().parse(form.get('courseId'));
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId } });

  if (!course.currentPublishedVersionId) throw new Error('NOT_PUBLISHED');

  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: {
      userId: user.id,
      courseId,
      versionId: course.currentPublishedVersionId,
    },
    update: { versionId: course.currentPublishedVersionId },
  });

  return { redirectTo: `/courses/${course.slug}?enrolled=1` };
}

export async function lessonInteractionRedirect(form: FormData) {
  const user = await requireUser();
  const input = z
    .object({
      lessonId: z.string(),
      versionId: z.string(),
      intent: z.enum(['complete', 'bookmark', 'note']),
      content: z.string().optional(),
    })
    .parse(Object.fromEntries(form));
  const returnTo = safeReturnTo(form.get('returnTo'));

  const enrolled = await db.enrollment.findFirst({
    where: { userId: user.id, versionId: input.versionId },
  });
  if (!enrolled) throw new Error('FORBIDDEN');

  if (input.intent === 'complete') {
    await db.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: user.id, lessonId: input.lessonId },
      },
      create: {
        userId: user.id,
        lessonId: input.lessonId,
        versionId: input.versionId,
        completedAt: new Date(),
        interactionSeconds: 30,
      },
      update: {
        completedAt: new Date(),
        interactionSeconds: { increment: 30 },
      },
    });
  }

  if (input.intent === 'bookmark') {
    const existing = await db.bookmark.findFirst({
      where: {
        userId: user.id,
        lessonId: input.lessonId,
        blockId: null,
      },
      select: { id: true },
    });
    if (existing) {
      await db.bookmark.delete({ where: { id: existing.id } });
    } else {
      await db.bookmark.create({
        data: { userId: user.id, lessonId: input.lessonId },
      });
    }
  }

  if (input.intent === 'note') {
    const content = input.content?.trim();
    if (!content) throw new Error('NOTE_REQUIRED');
    const existing = await db.userNote.findFirst({
      where: { userId: user.id, lessonId: input.lessonId, blockId: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (existing) {
      await db.userNote.update({
        where: { id: existing.id },
        data: { content },
      });
    } else {
      await db.userNote.create({
        data: { userId: user.id, lessonId: input.lessonId, content },
      });
    }
  }

  return { redirectTo: returnTo };
}
