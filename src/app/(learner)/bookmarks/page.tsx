import Link from 'next/link';
import { requireUser } from '@/modules/auth/session';
import { db } from '@/lib/db';
export default async function Page() {
  const u = await requireUser();
  const rows = await db.bookmark.findMany({
    where: { userId: u.id },
    include: {
      lesson: {
        include: {
          module: { include: { version: { include: { course: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div className="page container">
      <h1 style={{ fontSize: '2.5rem' }}>Đánh dấu</h1>
      {rows.map((x) => (
        <Link
          className="card"
          style={{ display: 'block' }}
          key={x.id}
          href={`/learn/${x.lesson.module.version.course.slug}/${x.lesson.slug}`}
        >
          {x.lesson.title}
        </Link>
      ))}
      {!rows.length && (
        <div className="card muted">Chưa có bài học được đánh dấu.</div>
      )}
    </div>
  );
}
