import Link from 'next/link';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';

export default async function Admin() {
  await requireUser();
  const [courses, reviews, jobs, sources, learners, events] = await Promise.all([
    db.courseVersion.groupBy({ by: ['status'], _count: true }),
    db.courseVersion.count({ where: { status: 'IN_REVIEW' } }),
    db.generationJob.groupBy({ by: ['status'], _count: true }),
    db.source.groupBy({ by: ['processingStatus'], _count: true }),
    db.enrollment.count(),
    db.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <>
      <div className="nav-inner">
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Trung tâm quản trị</h1>
          <p className="muted">Tạo khóa học, bài học, câu hỏi và bài thi.</p>
        </div>
        <div className="nav-links">
          <Link className="btn" href="/admin/courses/new">
            Tạo khóa học
          </Link>
          <Link className="btn secondary" href="/admin/generate">
            Tạo bằng AI
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Bắt đầu tạo nội dung</h2>
        <p className="muted">
          Khi tạo khóa học thủ công, hệ thống tự tạo sẵn mô-đun và bài học đầu
          tiên để bạn mở trình biên tập ngay.
        </p>
        <div className="nav-links">
          <Link className="brand" href="/admin/courses">
            Quản lý khóa học →
          </Link>
          <Link className="brand" href="/admin/questions">
            Ngân hàng câu hỏi →
          </Link>
          <Link className="brand" href="/admin/assessments">
            Quản lý bài thi →
          </Link>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}
      >
        <div className="card">
          <b>Phiên bản</b>
          <p>
            {courses.map((item) => `${item.status}: ${item._count}`).join(' · ') ||
              '0'}
          </p>
        </div>
        <div className="card">
          <b>Chờ duyệt</b>
          <p>{reviews}</p>
        </div>
        <div className="card">
          <b>AI jobs</b>
          <p>
            {jobs.map((item) => `${item.status}: ${item._count}`).join(' · ') ||
              '0'}
          </p>
        </div>
        <div className="card">
          <b>Nguồn / Lượt ghi danh</b>
          <p>
            {sources.length} / {learners}
          </p>
        </div>
      </div>

      <h2>Hoạt động xuất bản gần đây</h2>
      {events.map((event) => (
        <div className="card" key={event.id}>
          {event.action} ·{' '}
          <span className="muted">{event.createdAt.toLocaleString('vi')}</span>
        </div>
      ))}
    </>
  );
}
