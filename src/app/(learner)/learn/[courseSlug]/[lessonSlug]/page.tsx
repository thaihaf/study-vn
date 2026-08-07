import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LessonBlockView } from '@/components/content/lesson-block';
import { ActionRedirectForm } from '@/components/shared/action-redirect-form';
import { ServerActionButton } from '@/components/shared/server-action-button';
import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';
import { lessonInteractionRedirect } from '@/modules/learning/actions';

export default async function Learn({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const user = await requireUser();
  const { courseSlug, lessonSlug } = await params;
  const course = await db.course.findFirst({
    where: {
      slug: courseSlug,
      visibility: 'PUBLIC',
      currentPublishedVersionId: { not: null },
    },
    include: {
      currentPublishedVersion: {
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
  if (!course?.currentPublishedVersion) return notFound();

  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: user.id,
      courseId: course.id,
      versionId: course.currentPublishedVersion.id,
    },
  });
  if (!enrollment) return notFound();

  const lessons = course.currentPublishedVersion.modules.flatMap(
    (courseModule) =>
      courseModule.lessons.map((lesson) => ({
        ...lesson,
        moduleTitle: courseModule.title,
      })),
  );
  const lesson = lessons.find((item) => item.slug === lessonSlug);
  if (!lesson) return notFound();
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const returnTo = `/learn/${course.slug}/${lesson.slug}`;

  const [progress, note, bookmark] = await Promise.all([
    db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    }),
    db.userNote.findFirst({
      where: { userId: user.id, lessonId: lesson.id, blockId: null },
      orderBy: { updatedAt: 'desc' },
    }),
    db.bookmark.findFirst({
      where: { userId: user.id, lessonId: lesson.id, blockId: null },
    }),
  ]);

  return (
    <div className="page lesson-shell container">
      <nav className="card lesson-nav" aria-label="Các bài học">
        <Link className="brand" href={`/courses/${course.slug}`}>
          {course.title}
        </Link>
        {course.currentPublishedVersion.modules.map((courseModule) => (
          <div className="lesson-module" key={courseModule.id}>
            <b>{courseModule.title}</b>
            {courseModule.lessons.map((item) => (
              <Link
                className={
                  item.id === lesson.id ? 'lesson-link active' : 'lesson-link'
                }
                aria-current={item.id === lesson.id ? 'page' : undefined}
                href={`/learn/${course.slug}/${item.slug}`}
                key={item.id}
              >
                {item.title}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <article className="lesson-content">
        <header style={{ marginBottom: '2rem' }}>
          <span className="status">
            {lesson.moduleTitle} · Bài {lessonIndex + 1}/{lessons.length}
          </span>
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              margin: '1rem 0 1.15rem',
              letterSpacing: '-0.045em',
            }}
          >
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="muted lead" style={{ margin: 0 }}>
              {lesson.description}
            </p>
          )}
        </header>

        {Array.isArray(lesson.learningObjectives) &&
          lesson.learningObjectives.length > 0 && (
            <section className="card" style={{ marginBottom: '2rem' }}>
              <b>Mục tiêu bài học</b>
              <ul style={{ marginBottom: 0 }}>
                {lesson.learningObjectives.map((objective, index) => (
                  <li key={index}>{String(objective)}</li>
                ))}
              </ul>
            </section>
          )}
        {lesson.blocks.map((block) => (
          <LessonBlockView
            key={block.id}
            type={block.type}
            contentJson={block.contentJson}
            citations={block.citations}
          />
        ))}
        <div className="lesson-footer-nav">
          {lessons[lessonIndex - 1] ? (
            <Link
              className="btn secondary"
              href={`/learn/${course.slug}/${lessons[lessonIndex - 1].slug}`}
            >
              ← Bài trước
            </Link>
          ) : (
            <span />
          )}
          <ActionRedirectForm action={lessonInteractionRedirect}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <input
              type="hidden"
              name="versionId"
              value={course.currentPublishedVersion.id}
            />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="intent" value="complete" />
            <ServerActionButton
              className={progress?.completedAt ? 'btn secondary' : 'btn'}
              pendingLabel="Đang lưu tiến độ..."
            >
              {progress?.completedAt ? '✓ Đã hoàn thành' : 'Hoàn thành bài'}
            </ServerActionButton>
          </ActionRedirectForm>
          {lessons[lessonIndex + 1] ? (
            <Link
              className="btn secondary"
              href={`/learn/${course.slug}/${lessons[lessonIndex + 1].slug}`}
            >
              Bài sau →
            </Link>
          ) : (
            <Link className="btn secondary" href="/dashboard">
              Về dashboard
            </Link>
          )}
        </div>
      </article>

      <aside className="lesson-aside grid">
        <section className="card">
          <b>Tiến độ bài</b>
          <p>{progress?.completedAt ? '✓ Đã hoàn thành' : 'Chưa hoàn thành'}</p>
          {progress && (
            <small className="muted">
              Tương tác: {progress.interactionSeconds} giây
            </small>
          )}
        </section>
        <ActionRedirectForm
          className="card grid"
          action={lessonInteractionRedirect}
        >
          <input type="hidden" name="lessonId" value={lesson.id} />
          <input
            type="hidden"
            name="versionId"
            value={course.currentPublishedVersion.id}
          />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="intent" value="note" />
          <label className="label">
            Ghi chú riêng
            <textarea
              className="input"
              name="content"
              rows={7}
              defaultValue={note?.content ?? ''}
              required
            />
          </label>
          <ServerActionButton
            className="btn secondary"
            pendingLabel="Đang lưu ghi chú..."
          >
            Lưu ghi chú
          </ServerActionButton>
        </ActionRedirectForm>
        <ActionRedirectForm action={lessonInteractionRedirect}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          <input
            type="hidden"
            name="versionId"
            value={course.currentPublishedVersion.id}
          />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="intent" value="bookmark" />
          <ServerActionButton
            className="btn secondary"
            style={{ width: '100%' }}
            pendingLabel="Đang cập nhật..."
          >
            {bookmark ? '★ Bỏ đánh dấu' : '☆ Đánh dấu'}
          </ServerActionButton>
        </ActionRedirectForm>
        <nav className="card grid" aria-label="Công cụ học tập">
          <b>Công cụ</b>
          <Link href="/notes">Ghi chú của tôi →</Link>
          <Link href="/bookmarks">Bài đã đánh dấu →</Link>
          <Link href="/practice">Luyện tập →</Link>
        </nav>
      </aside>
    </div>
  );
}
