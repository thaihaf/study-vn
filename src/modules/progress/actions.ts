'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';

const interactionSchema = z.object({
  lessonId: z.string().min(1),
  versionId: z.string().min(1),
  intent: z.enum(['complete', 'bookmark', 'note']),
  content: z.string().max(10000).optional(),
});

export async function lessonInteraction(form: FormData) {
  const user = await requireUser();
  const input = interactionSchema.parse(Object.fromEntries(form));
  const lesson = await db.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: { versionId: input.versionId },
    },
    include: { module: { include: { version: { include: { course: true } } } } },
  });
  if (!lesson) throw new Error('LESSON_NOT_FOUND');

  const enrolled = await db.enrollment.findFirst({
    where: { userId: user.id, versionId: input.versionId, courseId: lesson.module.version.courseId },
  });
  if (!enrolled) throw new Error('FORBIDDEN');

  if (input.intent === 'complete') {
    const existing = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: input.lessonId } },
    });
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: input.lessonId } },
      create: {
        userId: user.id,
        lessonId: input.lessonId,
        versionId: input.versionId,
        completedAt: new Date(),
        interactionSeconds: 30,
      },
      update: {
        completedAt: existing?.completedAt ? null : new Date(),
        interactionSeconds: { increment: 30 },
      },
    });
  }

  if (input.intent === 'bookmark') {
    const bookmark = await db.bookmark.findFirst({
      where: { userId: user.id, lessonId: input.lessonId, blockId: null },
    });
    if (bookmark) {
      await db.bookmark.delete({ where: { id: bookmark.id } });
    } else {
      await db.bookmark.create({
        data: { userId: user.id, lessonId: input.lessonId },
      });
    }
  }

  if (input.intent === 'note') {
    const content = input.content?.trim() ?? '';
    const existing = await db.userNote.findFirst({
      where: { userId: user.id, lessonId: input.lessonId, blockId: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (!content && existing) {
      await db.userNote.delete({ where: { id: existing.id } });
    } else if (content && existing) {
      await db.userNote.update({ where: { id: existing.id }, data: { content } });
    } else if (content) {
      await db.userNote.create({
        data: { userId: user.id, lessonId: input.lessonId, content },
      });
    }
  }

  const path = `/learn/${lesson.module.version.course.slug}/${lesson.slug}`;
  revalidatePath(path);
  revalidatePath('/dashboard');
  revalidatePath('/notes');
  revalidatePath('/bookmarks');
}
