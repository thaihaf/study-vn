import Link from 'next/link';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { reviewSubmission } from '@/modules/publishing/review-actions';
import { validateVersion } from '@/modules/publishing/service';

export default async function Reviews() {
  await requirePermission('review');
  const versions = await db.courseVersion.findMany({
    where: { status: 'IN_REVIEW' },
    include: {
      course: true,
      reviews: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { submittedAt: 'asc' },
  });

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Hàng đợi duyệt</h1>
      <p className="muted">
        Nhận xét không làm thay đổi trạng thái. Phê duyệt ghi người duyệt và
        thời điểm; xuất bản là một hành động riêng. Từ chối trả phiên bản về bản
        nháp.
      </p>
      {await Promise.all(
        versions.map(async (version) => {
          const check = await validateVersion(db, version.id);
          return (
            <article className="card grid" key={version.id}>
              <div className="builder-row">
                <div>
                  <span className="status">IN_REVIEW</span>
                  <h2>
                    {version.course.title} · v{version.versionNumber}
                  </h2>
                  <p>Thay đổi: {version.changeSummary ?? 'Không có mô tả'}</p>
                </div>
                <Link
                  className="btn secondary"
                  href={`/admin/courses/${version.courseId}/preview`}
                >
                  Xem trước
                </Link>
              </div>

              <section className="card inset-card">
                <b>Validation</b>
                {check.errors.map((error) => (
                  <p className="error-text" key={error}>
                    ⛔ {error}
                  </p>
                ))}
                {check.warnings.map((warning) => (
                  <p key={warning}>⚠ {warning}</p>
                ))}
                {!check.errors.length && <p>✓ Không có lỗi chặn.</p>}
              </section>

              {version.reviews.length > 0 && (
                <section>
                  <h3>Trao đổi trước đó</h3>
                  {version.reviews.map((review) => (
                    <blockquote className="card inset-card" key={review.id}>
                      <b>{review.decision}</b> · {review.comment}
                      <footer className="muted">
                        {review.createdAt.toLocaleString('vi')}
                      </footer>
                    </blockquote>
                  ))}
                </section>
              )}

              <form className="grid" action={reviewSubmission}>
                <input type="hidden" name="versionId" value={version.id} />
                <label className="label">
                  Nhận xét
                  <textarea
                    className="input"
                    name="comment"
                    rows={4}
                    required
                  />
                </label>
                <div className="builder-actions">
                  <button
                    className="btn secondary"
                    name="decision"
                    value="COMMENT"
                  >
                    Chỉ gửi nhận xét
                  </button>
                  <button
                    className="btn"
                    name="decision"
                    value="APPROVED"
                    disabled={check.errors.length > 0}
                  >
                    Phê duyệt
                  </button>
                  <button
                    className="btn danger"
                    name="decision"
                    value="REJECTED"
                  >
                    Từ chối
                  </button>
                </div>
              </form>
            </article>
          );
        }),
      )}
      {!versions.length && (
        <div className="card muted">Không có nội dung chờ duyệt.</div>
      )}
    </>
  );
}
