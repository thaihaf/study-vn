'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { publishVersion } from '@/modules/publishing/service';

export async function publishCourseVersion(form: FormData) {
  const user = await requirePermission('course:publish');
  const versionId = z.string().parse(form.get('versionId'));
  const published = await publishVersion(db, versionId, user.id);

  return {
    redirectTo: `/admin/courses/${published.courseId}/edit?published=1`,
  };
}
