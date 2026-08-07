'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { extractTextFromUpload } from '@/modules/sources/extract';
import { chunks, uploadMetadata } from '@/modules/sources/service';

const sourceDetailsSchema = z.object({
  author: z.string().max(240).default(''),
  publisher: z.string().max(240).default(''),
  reliabilityLevel: z.coerce.number().int().min(1).max(5).default(3),
  copyrightNote: z.string().max(2000).default(''),
});

async function assertSourceRateLimit(userId: string) {
  const recent = await db.source.count({
    where: {
      uploadedById: userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= 20) throw new Error('SOURCE_UPLOAD_RATE_LIMIT');
}

export async function uploadSource(form: FormData) {
  const user = await requirePermission('source:manage');
  await assertSourceRateLimit(user.id);
  const file = z.instanceof(File).parse(form.get('file'));
  const metadata = uploadMetadata.parse({
    title: form.get('title'),
    sourceType: form.get('sourceType'),
    filename: file.name,
    mimeType: file.type || 'text/plain',
    size: file.size,
  });
  const details = sourceDetailsSchema.parse(Object.fromEntries(form));
  const storageKey = crypto.randomUUID();
  const source = await db.source.create({
    data: {
      title: metadata.title,
      author: details.author || null,
      publisher: details.publisher || null,
      reliabilityLevel: details.reliabilityLevel,
      copyrightNote: details.copyrightNote || null,
      sourceType: metadata.sourceType,
      originalFilename: metadata.filename,
      mimeType: metadata.mimeType,
      size: metadata.size,
      storageKey,
      processingStatus: 'PROCESSING',
      uploadedById: user.id,
    },
  });

  try {
    const text = (await extractTextFromUpload(file)).replace(/\0/g, '').trim();
    if (!text) throw new Error('SOURCE_HAS_NO_TEXT');
    const parts = chunks(text);
    await db.$transaction([
      db.sourceChunk.createMany({
        data: parts.map((chunkText, position) => ({
          sourceId: source.id,
          text: chunkText,
          position,
        })),
      }),
      db.source.update({
        where: { id: source.id },
        data: { processingStatus: 'READY' },
      }),
      db.auditLog.create({
        data: {
          actorId: user.id,
          action: 'SOURCE_UPLOADED',
          entityType: 'Source',
          entityId: source.id,
          metadata: { chunks: parts.length, mimeType: metadata.mimeType },
        },
      }),
    ]);
  } catch (error) {
    await db.source.update({
      where: { id: source.id },
      data: { processingStatus: 'FAILED' },
    });
    console.error(
      JSON.stringify({
        event: 'source_processing_failed',
        sourceId: source.id,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
    throw error;
  }
  revalidatePath('/admin/sources');
}

export async function createTextSource(form: FormData) {
  const user = await requirePermission('source:manage');
  await assertSourceRateLimit(user.id);
  const input = z
    .object({
      title: z.string().min(2).max(200),
      sourceType: z.enum(['ADMIN_WRITTEN', 'WEB_REFERENCE', 'OTHER']),
      text: z.string().min(10).max(1_000_000),
      referenceUrl: z.string().url().optional().or(z.literal('')),
      author: z.string().max(240).default(''),
      publisher: z.string().max(240).default(''),
      reliabilityLevel: z.coerce.number().int().min(1).max(5).default(3),
      copyrightNote: z.string().max(2000).default(''),
    })
    .parse(Object.fromEntries(form));
  const parts = chunks(input.text);
  const source = await db.source.create({
    data: {
      title: input.title,
      author: input.author || null,
      publisher: input.publisher || null,
      reliabilityLevel: input.reliabilityLevel,
      copyrightNote: input.copyrightNote || null,
      sourceType: input.sourceType,
      originalFilename: input.referenceUrl || 'admin-written.txt',
      mimeType: 'text/plain',
      size: Buffer.byteLength(input.text),
      storageKey: crypto.randomUUID(),
      processingStatus: 'READY',
      uploadedById: user.id,
      chunks: {
        create: parts.map((text, position) => ({ text, position })),
      },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'SOURCE_CREATED',
      entityType: 'Source',
      entityId: source.id,
    },
  });
  revalidatePath('/admin/sources');
}

export async function archiveSource(form: FormData) {
  const user = await requirePermission('source:manage');
  const id = z.string().parse(form.get('sourceId'));
  await db.source.update({ where: { id }, data: { archivedAt: new Date() } });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'SOURCE_ARCHIVED',
      entityType: 'Source',
      entityId: id,
    },
  });
  revalidatePath('/admin/sources');
}
