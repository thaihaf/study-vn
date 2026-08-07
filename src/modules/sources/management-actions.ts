'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';

export async function updateSourceMetadata(form: FormData) {
  const user = await requirePermission('source:manage');
  const input = z
    .object({
      sourceId: z.string().min(1),
      title: z.string().min(2).max(240),
      author: z.string().max(240).default(''),
      publisher: z.string().max(240).default(''),
      reliabilityLevel: z.coerce.number().int().min(1).max(5),
      copyrightNote: z.string().max(2000).default(''),
    })
    .parse(Object.fromEntries(form));

  await db.source.update({
    where: { id: input.sourceId },
    data: {
      title: input.title,
      author: input.author || null,
      publisher: input.publisher || null,
      reliabilityLevel: input.reliabilityLevel,
      copyrightNote: input.copyrightNote || null,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'SOURCE_METADATA_UPDATED',
      entityType: 'Source',
      entityId: input.sourceId,
    },
  });
  revalidatePath('/admin/sources');
}

export async function updateSourceChunk(form: FormData) {
  const user = await requirePermission('source:manage');
  const input = z
    .object({
      chunkId: z.string().min(1),
      text: z.string().min(1).max(20000),
      pageNumber: z.coerce.number().int().positive().optional(),
      section: z.string().max(500).default(''),
    })
    .parse(Object.fromEntries(form));
  const chunk = await db.sourceChunk.update({
    where: { id: input.chunkId },
    data: {
      text: input.text,
      pageNumber: input.pageNumber ?? null,
      section: input.section || null,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'SOURCE_CHUNK_CORRECTED',
      entityType: 'SourceChunk',
      entityId: chunk.id,
      metadata: { sourceId: chunk.sourceId, position: chunk.position },
    },
  });
  revalidatePath('/admin/sources');
}

export async function deleteArchivedSource(form: FormData) {
  const user = await requirePermission('source:manage');
  const sourceId = z.string().parse(form.get('sourceId'));
  const source = await db.source.findUniqueOrThrow({
    where: { id: sourceId },
    include: {
      chunks: {
        select: {
          id: true,
          _count: {
            select: { blockCitations: true, questionCitations: true },
          },
        },
      },
    },
  });
  if (!source.archivedAt) throw new Error('ARCHIVE_SOURCE_BEFORE_DELETE');
  if (
    source.chunks.some(
      (chunk) =>
        chunk._count.blockCitations > 0 || chunk._count.questionCitations > 0,
    )
  ) {
    throw new Error('SOURCE_IS_CITED_AND_MUST_BE_RETAINED');
  }
  await db.source.delete({ where: { id: sourceId } });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'SOURCE_DELETED',
      entityType: 'Source',
      entityId: sourceId,
      metadata: { title: source.title },
    },
  });
  revalidatePath('/admin/sources');
}
