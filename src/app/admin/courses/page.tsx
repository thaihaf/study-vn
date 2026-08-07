import Link from 'next/link';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { unarchiveCourse } from '@/modules/courses/actions';

export default async function Courses() {
  await requirePermission('course:read');
  const courses = await db.course.findMany({
    include: {
      versions: { orderBy: { versionNumber: 'desc' } },
      _count: { select: { enrollments: true, assessments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return (
    <>
      <div className="builder-page-heading">
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Khóa học</h1>
          <p className="muted">
            Tạo, biên tập, duyệt, xuất bản, lưu trữ và khôi phục phiên bản.
          </p>
        </div>
        <div className="builder-actions">
          <Link className="btn secondary" href="/admin/generate">
            Tạo bằng AI
          </Link>
          <Link className="btn" href="/admin/courses/new">
            Tạo thủ công
          </Link>
        </div>
      </div>
      <div className="grid">
        {courses.map((course) => (
          <article className="card" key={course.id}>
            <div className="builder-row">
              <div>
                <span className="status">
                  {course.archivedAt
                    ? 'ARCHIVED'
                    : (course.versions[0]?.status ?? 'NO_VERSION')}
                </span>
                <h2 style={{ fontSize: '1.3rem' }}>{course.title}</h2>
                <p>{course.shortDescription}</p>
                <span className="muted">
                  v{course.versions[0]?.versionNumber ?? '—'} ·{' '}
                  {course._count.enrollments} ghi danh ·{' '}
                  {course._count.assessments} bài luyện
                </span>
              </div>
              <div className="builder-actions">
                {course.archivedAt && (
                  <form action={unarchiveCourse}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <button className="btn secondary">Bỏ lưu trữ</button>
                  </form>
                )}
                <Link className="btn" href={`/admin/courses/${course.id}/edit`}>
                  Mở trình biên tập
                </Link>
              </div>
            </div>
          </article>
        ))}
        {!courses.length && <div className="card muted">Chưa có khóa học.</div>}
      </div>
    </>
  );
}
