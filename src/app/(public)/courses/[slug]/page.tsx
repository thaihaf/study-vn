import Link from 'next/link';
import { notFound } from 'next/navigation';

import { enroll } from '@/app/actions';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { calculateProgress } from '@/modules/progress/progress';

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await db.course.findFirst({
    where: { slug, visibility: 'PUBLIC', currentPublishedVersionId: { not: null }, archivedAt: null },
    include: {
      currentPublishedVersion: { include: { modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } } } },
      assessments: { where: { published: true } },
    },
  });
  if (!course?.currentPublishedVersion) return notFound();
  const session = await auth();
  const lessons = course.currentPublishedVersion.modules.flatMap((courseModule) => courseModule.lessons);
  const enrollment = session ? await db.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: course.id } } }) : null;
  const progress = enrollment && session ? await db.lessonProgress.findMany({ where: { userId: session.user.id, versionId: enrollment.versionId, completedAt: { not: null } } }) : [];
  const next = lessons.find((lesson) => !progress.some((item) => item.lessonId === lesson.id)) ?? lessons[0];
  const percent = enrollment ? calculateProgress(progress.length, lessons.length) : 0;

  return (
    <div className="container page">
      <span className="status">{course.category} · {course.level}</span>
      <h1>{course.title}</h1>
      <p className="muted lead">{course.shortDescription}</p>
      <p>{course.language.toUpperCase()} · {course.estimatedMinutes ?? '—'} phút · {lessons.length} bài · {course.assessments.length} bài luyện</p>
      {enrollment && next ? (
        <div className="card">
          <b>Tiến độ {percent}%</b>
          <progress value={progress.length} max={lessons.length || 1} style={{ width: '100%' }} />
          <p><Link className="btn" href={`/learn/${course.slug}/${next.slug}`}>{percent === 100 ? 'Học lại từ đầu' : `Tiếp tục: ${next.title}`}</Link></p>
        </div>
      ) : session ? (
        <form action={enroll}><input type="hidden" name="courseId" value={course.id} /><button className="btn">Bắt đầu học</button></form>
      ) : <Link className="btn" href="/login">Đăng nhập để học</Link>}

      <h2>Roadmap</h2>
      <div className="grid">
        {course.currentPublishedVersion.modules.map((courseModule) => (
          <section className="card" key={courseModule.id}>
            <h3>{courseModule.position + 1}. {courseModule.title}</h3>
            <p className="muted">{courseModule.description}</p>
            <ol>{courseModule.lessons.map((lesson) => <li key={lesson.id}>{lesson.title} · <span className="muted">{lesson.estimatedMinutes ?? '—'} phút</span></li>)}</ol>
          </section>
        ))}
      </div>
      {course.assessments.length > 0 && <section><h2>Bài luyện</h2><div className="grid">{course.assessments.map((assessment) => <Link className="card" href={`/assessments/${assessment.id}`} key={assessment.id}><b>{assessment.title}</b><p className="muted">{assessment.type}</p></Link>)}</div></section>}
    </div>
  );
}
