'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { publishVersion } from '@/modules/publishing/service';

export async function publishCourseVersion(form: FormData) {
  const user = await requirePermission('course:publish');
  const versionId = z.string().parse(form.get('versionId'));
  const published = await publishVersion(db, versionId, user.id);

  revalidatePath(`/admin/courses/${published.courseId}/edit`);
  revalidatePath('/admin/courses');
  revalidatePath('/explore');
  revalidatePath('/');

  redirect(`/admin/courses/${published.courseId}/edit?published=1`);
}
