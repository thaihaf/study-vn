'use server';

import crypto from 'node:crypto';

import { db } from '@/lib/db';
import { runGeneration } from '@/modules/ai/actions';
import { generateLessonDraft } from '@/modules/ai/lesson-actions';
import { requirePermission } from '@/modules/auth/session';
import { extractTextFromUpload } from '@/modules/sources/extract';
import { chunks, uploadMetadata } from '@/modules/sources/service';

async function assertGenerationRateLimit(userId: string) {
  const recent = await db.generationJob.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= 30) throw new Error('AI_GENERATION_RATE_LIMIT');
}

async function ingestGenerationFiles(form: FormData, userId: string) {
  const files = form
    .getAll('files')
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) return;

  await requirePermission('source:manage');
  if (files.length > 3) throw new Error('TOO_MANY_GENERATION_SOURCES');
  if (files.reduce((sum, file) => sum + file.size, 0) > 5 * 1024 * 1024) {
    throw new Error('GENERATION_SOURCES_TOO_LARGE');
  }

  for (const file of files) {
    const metadata = uploadMetadata.parse({
      title: file.name.replace(/\.[^.]+$/, '') || file.name,
      sourceType: 'THIRD_PARTY_MATERIAL',
      filename: file.name,
      mimeType: file.type || 'text/plain',
      size: file.size,
    });
    const text = (await extractTextFromUpload(file)).replace(/\0/g, '').trim();
    if (!text) throw new Error(`SOURCE_HAS_NO_TEXT:${file.name}`);
    const parts = chunks(text);

    const source = await db.source.create({
      data: {
        title: metadata.title,
        sourceType: metadata.sourceType,
        originalFilename: metadata.filename,
        mimeType: metadata.mimeType,
        size: metadata.size,
        storageKey: crypto.randomUUID(),
        processingStatus: 'READY',
        uploadedById: userId,
        chunks: {
          create: parts.map((chunkText, position) => ({
            text: chunkText,
            position,
          })),
        },
      },
    });

    form.append('sourceIds', source.id);
  }

  form.delete('files');
}

export async function runRateLimitedGeneration(form: FormData) {
  const user = await requirePermission('ai:generate');
  await assertGenerationRateLimit(user.id);
  await ingestGenerationFiles(form, user.id);
  return runGeneration(form);
}

export async function generateRateLimitedLessonDraft(form: FormData) {
  const user = await requirePermission('ai:generate');
  await assertGenerationRateLimit(user.id);
  return generateLessonDraft(form);
}
