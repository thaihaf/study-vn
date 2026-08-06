import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  publish,
  restore,
  submitReview,
  updateCourse,
} from '@/app/actions';
import { db } from '@/lib/db';
import { can } from '@/modules/auth/permissions';
import { requirePermission } from '@/modules/auth/session';
import { validateVersion } from '@/modules/publishing/service';

export default async function Editor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('course:read');
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          modules: {
            orderBy: { position: 'asc' },
            include: {
              lessons: {
                orderBy: { position: 'asc' },
                include: {
                  blocks: {
                    orderBy: { position: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const draft = course.versions.find((version) => version.status === 'DRAFT');
  const active = draft ?? course.versions[0];

  if (!active) notFound();

  const lesson = active.modules[0]?.lessons[0];
  const block = lesson?.blocks[0];
  const validation = await validateVersion(db, active.id);

  return (
    <>
      <div className="nav-inner">
        <div>
          <span className="status">
            {active.status} · v{active.versionNumber}
          </span>
          <h1 style={{ fontSize: '2rem' }}>{course.title}</h1>
        </div>
        <Link className="btn secondary" href={`/admin/courses/${id}/preview`}>
          Xem trước
        </Link>
      </div>

      {active.status === 'PUBLISHED' && !draft && (
        <div className="card">
          Phiên bản đã xuất bản là bất biến. Hãy khôi phục phiên bản này thành
          một bản nháp mới để chỉnh sửa.
          <form action={restore}>
            <input type="hidden" name="versionId" value={active.id} />
            <button className="btn">Tạo bản nháp từ phiên bản này</button>
          </form>
        </div>
      )}

      {draft && lesson && block && (
        <form className="grid" action={updateCourse}>
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="revision" value={draft.revision} />
          <input type="hidden" name="lessonId" value={lesson.id} />

          <section className="card grid">
            <h2>Metadata</h2>
            <label className="label">
              Tên
              <input className="input" name="title" defaultValue={course.title} />
            </label>
            <label className="label">
              Mô tả
              <textarea
                className="input"
                name="description"
                defaultValue={course.shortDescription}
              />
            </label>
          </section>

          <section className="card grid">
            <h2>Roadmap (kéo thả sẵn sàng qua dnd-kit)</h2>
            <label className="label">
              Tên bài
              <input
                className="input"
                name="lessonTitle"
                defaultValue={lesson.title}
              />
            </label>
            <label className="label">
              Nội dung block PARAGRAPH
              <textarea
                className="input"
                rows={10}
                name="content"
                defaultValue={(block.contentJson as { html?: string }).html}
              />
            </label>
            <label>
              <input type="checkbox" defaultChecked={block.isLocked} /> Khóa
              block, không cho AI ghi đè
            </label>
          </section>

          <button className="btn">Lưu · revision {draft.revision}</button>
        </form>
      )}

      <section className="card">
        <h2>Kiểm tra trước xuất bản</h2>
        {validation.errors.map((error) => (
          <p key={error}>⛔ {error}</p>
        ))}
        {validation.warnings.map((warning) => (
          <p key={warning}>⚠ {warning}</p>
        ))}
        {!validation.errors.length && <p>✓ Không có lỗi chặn.</p>}
      </section>

      <div className="nav-links">
        {draft && (
          <form action={submitReview}>
            <input type="hidden" name="versionId" value={draft.id} />
            <button className="btn secondary">Gửi duyệt</button>
          </form>
        )}
        {can(user.role, 'course:publish', user.canPublish) &&
          !validation.errors.length && (
            <form action={publish}>
              <input type="hidden" name="versionId" value={active.id} />
              <button className="btn">Xuất bản</button>
            </form>
          )}
      </div>

      <h2>Lịch sử phiên bản</h2>
      {course.versions.map((version) => (
        <div className="card" key={version.id}>
          v{version.versionNumber} · {version.status} ·{' '}
          {version.changeSummary ?? 'Không có ghi chú'}{' '}
          <form style={{ display: 'inline' }} action={restore}>
            <input type="hidden" name="versionId" value={version.id} />
            <button className="btn secondary">Khôi phục thành bản nháp</button>
          </form>
        </div>
      ))}
    </>
  );
}
