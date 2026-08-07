'use server';

import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { getAIProvider } from '@/modules/ai/provider';
import { lessonSchema } from '@/modules/ai/schemas';
import { requirePermission } from '@/modules/auth/session';

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

export async function generateLessonDraft(form: FormData) {
  const user = await requirePermission('ai:generate');
  const lessonId = z.string().parse(form.get('lessonId'));
  const prompt = z.string().min(10).max(8000).parse(form.get('prompt'));
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, module: { version: { status: 'DRAFT' } } },
    include: { module: { include: { version: { include: { course: true } } } }, blocks: true },
  });
  if (!lesson) throw new Error('DRAFT_LESSON_NOT_FOUND');
  const sourceIds = form.getAll('sourceIds').filter((value): value is string => typeof value === 'string');
  const sourceChunks = sourceIds.length
    ? await db.sourceChunk.findMany({ where: { sourceId: { in: sourceIds }, source: { processingStatus: 'READY', archivedAt: null } }, take: 80, orderBy: { position: 'asc' } })
    : [];
  const normalized = `${prompt}\n\nKhóa học: ${lesson.module.version.course.title}\nBài học: ${lesson.title}`;
  const key = crypto.createHash('sha256').update(`${user.id}:${lessonId}:${normalized}:${sourceIds.join(',')}`).digest('hex');
  const job = await db.generationJob.upsert({
    where: { idempotencyKey: key },
    create: {
      idempotencyKey: key,
      userId: user.id,
      kind: 'LESSON',
      userPrompt: normalized,
      settingsJson: asJson({ lessonId, sourceIds }),
      provider: process.env.AI_PROVIDER ?? 'openai',
      model: process.env.OPENAI_MODEL ?? (process.env.AI_PROVIDER === 'fake' ? 'fake' : 'not-configured'),
      inputSourceIds: asJson(sourceIds),
      targetEntityId: lessonId,
      status: 'RUNNING',
      startedAt: new Date(),
    },
    update: { status: 'RUNNING', retryCount: { increment: 1 }, errorMessage: null, errorCode: null, startedAt: new Date(), endedAt: null },
  });
  try {
    const output = await getAIProvider().generateLesson({
      prompt: normalized,
      language: lesson.module.version.course.language,
      sources: sourceChunks.map((chunk) => ({ id: chunk.id, text: chunk.text })),
    });
    const parsed = lessonSchema.parse(output);
    await db.$transaction([
      db.generationJob.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', outputSnapshot: asJson(parsed), endedAt: new Date() } }),
      db.generationArtifact.create({ data: { jobId: job.id, kind: 'LESSON_PREVIEW', payload: asJson({ existingBlocks: lesson.blocks.map((block) => ({ id: block.id, type: block.type, isLocked: block.isLocked, contentJson: block.contentJson })), generated: parsed }) } }),
    ]);
  } catch (error) {
    await db.generationJob.update({ where: { id: job.id }, data: { status: 'FAILED', errorCode: error instanceof Error ? error.name : 'UNKNOWN', errorMessage: error instanceof Error ? error.message : 'Không thể tạo bài học.', endedAt: new Date() } });
  }
  redirect(`/admin/generation-jobs?job=${job.id}`);
}

export async function applyLessonGeneration(form: FormData) {
  const user = await requirePermission('course:edit');
  const jobId = z.string().parse(form.get('jobId'));
  const job = await db.generationJob.findFirstOrThrow({ where: { id: jobId, kind: 'LESSON', status: 'SUCCEEDED' } });
  if (!job.targetEntityId || job.targetEntityId.startsWith('applied:')) throw new Error('LESSON_JOB_ALREADY_APPLIED');
  const lesson = await db.lesson.findFirst({
    where: { id: job.targetEntityId, module: { version: { status: 'DRAFT' } } },
    include: { blocks: { orderBy: { position: 'asc' } }, module: { include: { version: true } } },
  });
  if (!lesson || !job.outputSnapshot) throw new Error('DRAFT_LESSON_NOT_FOUND');
  const generated = lessonSchema.parse(job.outputSnapshot);

  await db.$transaction(async (transaction) => {
    await transaction.lessonBlock.updateMany({ where: { lessonId: lesson.id }, data: { position: { increment: 10000 } } });
    const locked = lesson.blocks.filter((block) => block.isLocked);
    const unlocked = lesson.blocks.filter((block) => !block.isLocked);
    if (unlocked.length) await transaction.lessonBlock.deleteMany({ where: { id: { in: unlocked.map((block) => block.id) } } });

    let position = 0;
    for (const block of locked) {
      await transaction.lessonBlock.update({ where: { id: block.id }, data: { position } });
      position += 1;
    }
    for (const block of generated.blocks) {
      await transaction.lessonBlock.create({
        data: {
          lessonId: lesson.id,
          type: block.type,
          position,
          contentJson: asJson(block.content),
          generatedByAI: true,
          generationJobId: job.id,
          createdById: user.id,
          updatedById: user.id,
        },
      });
      position += 1;
    }
    await transaction.lesson.update({ where: { id: lesson.id }, data: { title: generated.title } });
    await transaction.courseVersion.update({ where: { id: lesson.module.versionId }, data: { revision: { increment: 1 } } });
    await transaction.generationJob.update({ where: { id: job.id }, data: { targetEntityId: `applied:${lesson.id}` } });
    await transaction.auditLog.create({ data: { actorId: user.id, action: 'AI_LESSON_APPLIED', entityType: 'Lesson', entityId: lesson.id, metadata: { jobId: job.id, preservedLockedBlocks: locked.length } } });
  });
  revalidatePath(`/admin/courses/${lesson.module.version.courseId}/edit`);
  redirect(`/admin/courses/${lesson.module.version.courseId}/edit`);
}
