'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { publishVersion } from '@/modules/publishing/service';

export async function publishCourseVersion(form: FormData) {
  const user = await requirePermission('course:publish');
  const versionId = z.string().parse(form.get('versionId'));
  const published = await publishVersion(db, versionId, user.id);

  // These pages are dynamic and read fresh PostgreSQL state on each request.
  // Redirect directly after the transaction instead of combining
  // revalidatePath() with redirect(), which can abort the Server Action RSC
  // response before the client applies the navigation.
  redirect(`/admin/courses/${published.courseId}/edit?published=1`);
}
