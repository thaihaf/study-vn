'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import {
  persistCourseBuilder,
  type CourseBuilderInput,
} from '@/modules/courses/builder';

export async function saveCourseBuilder(input: CourseBuilderInput) {
  const user = await requirePermission('course:edit');
  const saved = await persistCourseBuilder(db, user.id, input);
  revalidatePath(`/admin/courses/${saved.courseId}/edit`);
  revalidatePath(`/admin/courses/${saved.courseId}/preview`);
  return saved;
}

export async function archiveCourse(form: FormData) {
  const user = await requirePermission('course:edit');
  const courseId = z.string().parse(form.get('courseId'));

  await db.$transaction(async (transaction) => {
    const course = await transaction.course.findUniqueOrThrow({
      where: { id: courseId },
    });
    await transaction.course.update({
      where: { id: courseId },
      data: {
        archivedAt: new Date(),
        visibility: 'PRIVATE',
        currentPublishedVersionId: null,
      },
    });
    await transaction.courseVersion.updateMany({
      where: { courseId, status: { in: ['DRAFT', 'IN_REVIEW', 'PUBLISHED'] } },
      data: { status: 'ARCHIVED' },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: 'COURSE_ARCHIVED',
        entityType: 'Course',
        entityId: course.id,
      },
    });
  });

  revalidatePath('/admin/courses');
  revalidatePath('/explore');
  redirect('/admin/courses');
}

export async function unarchiveCourse(form: FormData) {
  const user = await requirePermission('course:edit');
  const courseId = z.string().parse(form.get('courseId'));
  await db.course.update({ where: { id: courseId }, data: { archivedAt: null } });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'COURSE_UNARCHIVED',
      entityType: 'Course',
      entityId: courseId,
    },
  });
  revalidatePath('/admin/courses');
}
