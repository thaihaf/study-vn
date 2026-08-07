'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';

const roleSchema = z.enum([
  'SUPER_ADMIN',
  'CONTENT_ADMIN',
  'REVIEWER',
  'INSTRUCTOR',
  'LEARNER',
]);

export async function updateUserRole(form: FormData) {
  const actor = await requirePermission('user:roles');
  const input = z
    .object({
      userId: z.string().min(1),
      role: roleSchema,
      canPublish: z.enum(['on']).optional(),
    })
    .parse(Object.fromEntries(form));

  const target = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
  });
  if (target.role === 'SUPER_ADMIN' && input.role !== 'SUPER_ADMIN') {
    const count = await db.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (count <= 1) throw new Error('LAST_SUPER_ADMIN');
  }

  const updated = await db.user.update({
    where: { id: input.userId },
    data: {
      role: input.role,
      canPublish:
        input.role === 'SUPER_ADMIN' ? true : Boolean(input.canPublish),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'USER_ROLE_UPDATED',
      entityType: 'User',
      entityId: updated.id,
      metadata: {
        previousRole: target.role,
        nextRole: updated.role,
        previousCanPublish: target.canPublish,
        nextCanPublish: updated.canPublish,
      },
    },
  });
  revalidatePath('/admin/users');
}
