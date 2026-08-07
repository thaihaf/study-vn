import { notFound } from 'next/navigation';

import { LessonBlockView } from '@/components/content/lesson-block';
import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';

export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('course:read');
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
        include: {
          modules: {
            orderBy: { position: 'asc' },
            include: {
              lessons: {
                orderBy: { position: 'asc' },
                include: {
                  blocks: {
                    orderBy: { position: 'asc' },
                    include: {
                      citations: {
                        include: { chunk: { include: { source: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course?.versions[0]) return notFound();
  const version = course.versions[0];

  return (
    <div className="preview-shell">
      <span className="status">
        Bản xem trước quản trị · {version.status} · v{version.versionNumber}
      </span>
      <h1>{course.title}</h1>
      <p className="muted lead">{course.shortDescription}</p>
      {version.modules.map((courseModule) => (
        <section className="preview-module" key={courseModule.id}>
          <h2>{courseModule.title}</h2>
          {courseModule.description && (
            <p className="muted">{courseModule.description}</p>
          )}
          {courseModule.lessons.map((lesson) => (
            <article className="preview-lesson" key={lesson.id}>
              <h3>{lesson.title}</h3>
              {lesson.description && (
                <p className="muted">{lesson.description}</p>
              )}
              {lesson.blocks.map((block) => (
                <LessonBlockView
                  key={block.id}
                  type={block.type}
                  contentJson={block.contentJson}
                  citations={block.citations}
                />
              ))}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
