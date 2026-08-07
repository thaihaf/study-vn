import Link from 'next/link';
import { notFound } from 'next/navigation';

import { restore, submitReview } from '@/app/actions';
import { CourseBuilder } from '@/components/admin/course-builder';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { db } from '@/lib/db';
import { can } from '@/modules/auth/permissions';
import { requirePermission } from '@/modules/auth/session';
import { archiveCourse } from '@/modules/courses/actions';
import { getCourseBuilderState } from '@/modules/courses/builder';
import { publishCourseVersion } from '@/modules/publishing/actions';
import { validateVersion } from '@/modules/publishing/service';

export default async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const user = await requirePermission('course:read');
  const { id } = await params;
  const query = await searchParams;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          reviews: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });
  if (!course) notFound();

  const draft = await getCourseBuilderState(db, id);
  const latest = course.versions[0];
  const validation = draft
    ? await validateVersion(db, draft.versionId)
    : { errors: [], warnings: [] };
  const sourceChunks = await db.sourceChunk.findMany({
    where: { source: { archivedAt: null, processingStatus: 'READY' } },
    include: { source: true },
    orderBy: [{ sourceId: 'asc' }, { position: 'asc' }],
    take: 300,
  });

  return (
    <>
      {query.published === '1' && (
        <div className="card" role="status">
          ✓ PUBLISHED · Phiên bản đã được xuất bản cho người học.
        </div>
      )}

      <div className="builder-page-heading">
        <div>
          <span className="status">
            {draft
              ? `DRAFT · revision ${draft.revision}`
              : (latest?.status ?? 'Không có phiên bản')}
          </span>
          <h1 style={{ fontSize: '2.4rem' }}>{course.title}</h1>
          <p className="muted">
            Phiên bản đã xuất bản luôn bất biến. Mọi chỉnh sửa được thực hiện
            trên bản nháp.
          </p>
        </div>
        <div className="builder-actions">
          <Link className="btn secondary" href="/admin/courses">
            ← Khóa học
          </Link>
          <Link className="btn secondary" href={`/admin/courses/${id}/preview`}>
            Xem trước
          </Link>
        </div>
      </div>

      {course.archivedAt && (
        <div className="card warning-card">
          Khóa học đang được lưu trữ. Hãy khôi phục trước khi tiếp tục xuất bản.
        </div>
      )}

      {!draft && latest && (
        <section className="card grid">
          <h2>Không có bản nháp đang chỉnh sửa</h2>
          <p>
            Phiên bản v{latest.versionNumber} đang ở trạng thái{' '}
            <b>{latest.status}</b>. Tạo một bản nháp mới từ phiên bản này để
            chỉnh sửa mà không thay đổi lịch sử.
          </p>
          <form action={restore}>
            <input type="hidden" name="versionId" value={latest.id} />
            <button className="btn">Tạo bản nháp từ phiên bản này</button>
          </form>
        </section>
      )}

      {draft && (
        <CourseBuilder
          initialState={draft}
          sourceChunks={sourceChunks.map((chunk) => ({
            id: chunk.id,
            label: `${chunk.source.title} · đoạn ${chunk.position + 1}${
              chunk.section ? ` · ${chunk.section}` : ''
            }`,
          }))}
        />
      )}

      {draft && (
        <section className="card validation-panel">
          <h2>Kiểm tra trước xuất bản</h2>
          {validation.errors.map((error) => (
            <p className="error-text" key={error}>
              ⛔ {error}
            </p>
          ))}
          {validation.warnings.map((warning) => (
            <p key={warning}>⚠ {warning}</p>
          ))}
          {!validation.errors.length && <p>✓ Không có lỗi chặn xuất bản.</p>}

          <div className="builder-actions">
            <form action={submitReview}>
              <input type="hidden" name="versionId" value={draft.versionId} />
              <button className="btn secondary">Gửi duyệt</button>
            </form>
            {can(user.role, 'course:publish', user.canPublish) &&
              !validation.errors.length &&
              !course.archivedAt && (
                <form action={publishCourseVersion}>
                  <input
                    type="hidden"
                    name="versionId"
                    value={draft.versionId}
                  />
                  <button className="btn" type="submit">
                    Xuất bản ngay
                  </button>
                  <small className="muted">
                    Phiên bản công khai hiện tại sẽ được lưu trữ.
                  </small>
                </form>
              )}
          </div>
        </section>
      )}

      <section className="grid">
        <div className="builder-page-heading">
          <div>
            <h2>Lịch sử phiên bản</h2>
            <p className="muted">
              Khôi phục luôn tạo một bản nháp mới, không sửa lịch sử cũ.
            </p>
          </div>
        </div>
        {course.versions.map((version) => (
          <article className="card" key={version.id}>
            <div className="builder-row">
              <div>
                <b>
                  v{version.versionNumber} · {version.status}
                </b>
                <p>{version.changeSummary || 'Không có tóm tắt thay đổi.'}</p>
                <small className="muted">
                  Tạo {version.createdAt.toLocaleString('vi')} · cập nhật{' '}
                  {version.updatedAt.toLocaleString('vi')}
                </small>
              </div>
              {version.id !== draft?.versionId && (
                <form action={restore}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <button className="btn secondary">
                    Khôi phục thành bản nháp
                  </button>
                </form>
              )}
            </div>
            {version.reviews.length > 0 && (
              <details>
                <summary>Nhận xét duyệt ({version.reviews.length})</summary>
                {version.reviews.map((review) => (
                  <p key={review.id}>
                    <b>{review.decision}</b> · {review.comment}
                  </p>
                ))}
              </details>
            )}
          </article>
        ))}
      </section>

      {!course.archivedAt && (
        <section className="card danger-zone">
          <h2>Vùng nguy hiểm</h2>
          <p className="muted">
            Lưu trữ sẽ ẩn khóa học khỏi người học và đóng các phiên bản đang
            hoạt động.
          </p>
          <form action={archiveCourse}>
            <input type="hidden" name="courseId" value={course.id} />
            <ConfirmButton
              className="btn danger"
              message="Bạn chắc chắn muốn lưu trữ khóa học này?"
            >
              Lưu trữ khóa học
            </ConfirmButton>
          </form>
        </section>
      )}
    </>
  );
}
