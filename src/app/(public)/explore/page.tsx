import Link from 'next/link';

import { db } from '@/lib/db';

export const metadata = { title: 'Khám phá' };

export default async function Explore() {
  const courses = await db.course.findMany({
    where: {
      visibility: 'PUBLIC',
      currentPublishedVersionId: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="page container">
      <h1 style={{ fontSize: '2.6rem' }}>Khám phá lộ trình</h1>
      <p className="muted">
        Các khóa học đã qua quy trình biên tập và xuất bản.
      </p>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}
      >
        {courses.map((course) => (
          <Link
            className="card"
            href={`/courses/${course.slug}`}
            key={course.id}
          >
            <span className="status">
              {course.category} · {course.level}
            </span>
            <h2 style={{ fontSize: '1.3rem' }}>{course.title}</h2>
            <p className="muted">{course.shortDescription}</p>
            <b>
              {course.estimatedMinutes
                ? `${course.estimatedMinutes} phút`
                : 'Học theo nhịp riêng'}{' '}
              →
            </b>
          </Link>
        ))}
        {!courses.length && (
          <div className="card muted">Chưa có khóa học được xuất bản.</div>
        )}
      </div>
    </div>
  );
}
