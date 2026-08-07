'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { extractTextFromUpload } from '@/modules/sources/extract';
import { chunks, uploadMetadata } from '@/modules/sources/service';

export async function uploadSource(form: FormData) {
  const user = await requirePermission('source:manage');
  const file = z.instanceof(File).parse(form.get('file'));
  const metadata = uploadMetadata.parse({
    title: form.get('title'),
    sourceType: form.get('sourceType'),
    filename: file.name,
    mimeType: file.type || 'text/plain',
    size: file.size,
  });
  const storageKey = crypto.randomUUID();
  const source = await db.source.create({
    data: {
      title: metadata.title,
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
    await db.source.update({ where: { id: source.id }, data: { processingStatus: 'FAILED' } });
    throw error;
  }
  revalidatePath('/admin/sources');
}

export async function createTextSource(form: FormData) {
  const user = await requirePermission('source:manage');
  const input = z.object({
    title: z.string().min(2).max(200),
    sourceType: z.enum(['ADMIN_WRITTEN', 'WEB_REFERENCE', 'OTHER']),
    text: z.string().min(10).max(1_000_000),
    referenceUrl: z.string().url().optional().or(z.literal('')),
  }).parse(Object.fromEntries(form));
  const parts = chunks(input.text);
  const source = await db.source.create({
    data: {
      title: input.title,
      sourceType: input.sourceType,
      originalFilename: input.referenceUrl || 'admin-written.txt',
      mimeType: 'text/plain',
      size: Buffer.byteLength(input.text),
      storageKey: crypto.randomUUID(),
      processingStatus: 'READY',
      uploadedById: user.id,
      chunks: { create: parts.map((text, position) => ({ text, position })) },
    },
  });
  await db.auditLog.create({ data: { actorId: user.id, action: 'SOURCE_CREATED', entityType: 'Source', entityId: source.id } });
  revalidatePath('/admin/sources');
}

export async function archiveSource(form: FormData) {
  const user = await requirePermission('source:manage');
  const id = z.string().parse(form.get('sourceId'));
  await db.source.update({ where: { id }, data: { archivedAt: new Date() } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'SOURCE_ARCHIVED', entityType: 'Source', entityId: id } });
  revalidatePath('/admin/sources');
}
