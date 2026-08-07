import Link from 'next/link';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { isAdmin } from '@/modules/auth/permissions';
import { requireUser } from '@/modules/auth/session';
import { calculateProgress } from '@/modules/progress/progress';

export default async function Dashboard() {
  const user = await requireUser();
  if (isAdmin(user.role)) redirect('/admin');

  const [
    enrollments,
    progresses,
    attempts,
    weakTopics,
    reviewItems,
    bookmarks,
  ] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: true,
        version: {
          include: {
            modules: { include: { lessons: { orderBy: { position: 'asc' } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
    db.lessonProgress.findMany({
      where: { userId: user.id, completedAt: { not: null } },
    }),
    db.assessmentAttempt.findMany({
      where: { userId: user.id, status: 'GRADED' },
      include: { assessment: true },
      take: 5,
      orderBy: { submittedAt: 'desc' },
    }),
    db.topicProficiency.findMany({
      where: { userId: user.id },
      include: { topic: true },
      orderBy: { score: 'asc' },
      take: 5,
    }),
    db.reviewItem.findMany({
      where: { userId: user.id, dueAt: { lte: new Date() } },
      orderBy: { dueAt: 'asc' },
      take: 8,
    }),
    db.bookmark.findMany({
      where: { userId: user.id },
      include: {
        lesson: {
          include: {
            module: { include: { version: { include: { course: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const reviewQuestions = reviewItems.length
    ? await db.question.findMany({
        where: { id: { in: reviewItems.map((item) => item.questionId) } },
        select: { id: true, prompt: true },
      })
    : [];
  const reviewQuestionMap = new Map(
    reviewQuestions.map((question) => [question.id, question.prompt]),
  );
  const totalLessons = enrollments.reduce(
    (sum, enrollment) =>
      sum +
      enrollment.version.modules.reduce(
        (moduleSum, courseModule) => moduleSum + courseModule.lessons.length,
        0,
      ),
    0,
  );
  const completedLessons = progresses.filter((progress) =>
    enrollments.some(
      (enrollment) => enrollment.versionId === progress.versionId,
    ),
  ).length;

  return (
    <div className="page container">
      <div className="builder-page-heading">
        <div>
          <span className="status">
            Tiến độ tổng {calculateProgress(completedLessons, totalLessons)}%
          </span>
          <h1 style={{ fontSize: '2.5rem' }}>Hôm nay học gì?</h1>
        </div>
        <div className="builder-actions">
          <Link className="btn secondary" href="/practice">
            Luyện tập
          </Link>
          <Link className="btn secondary" href="/essays">
            Bài luận
          </Link>
          <Link className="btn secondary" href="/interviews">
            Phỏng vấn
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <section>
          <h2>Đang học</h2>
          <div className="grid">
            {enrollments.map((enrollment) => {
              const lessons = enrollment.version.modules.flatMap(
                (courseModule) => courseModule.lessons,
              );
              const completed = progresses.filter(
                (progress) => progress.versionId === enrollment.versionId,
              ).length;
              const next =
                lessons.find(
                  (lesson) =>
                    !progresses.some(
                      (progress) => progress.lessonId === lesson.id,
                    ),
                ) ?? lessons[0];
              return (
                <article className="card" key={enrollment.id}>
                  <h3>{enrollment.course.title}</h3>
                  <p>
                    {calculateProgress(completed, lessons.length)}% hoàn thành ·{' '}
                    {completed}/{lessons.length} bài
                  </p>
                  <progress
                    value={completed}
                    max={lessons.length || 1}
                    style={{ width: '100%' }}
                    aria-label={`Tiến độ ${enrollment.course.title}`}
                  />
                  {next && (
                    <p>
                      <Link
                        className="btn"
                        href={`/learn/${enrollment.course.slug}/${next.slug}`}
                      >
                        Tiếp tục: {next.title}
                      </Link>
                    </p>
                  )}
                </article>
              );
            })}
            {!enrollments.length && (
              <div className="card">
                Bạn chưa ghi danh.{' '}
                <Link className="brand" href="/explore">
                  Chọn một lộ trình →
                </Link>
              </div>
            )}
          </div>

          <h2>Ôn lại câu sai</h2>
          <div className="grid">
            {reviewItems.map((item) => (
              <article className="card" key={item.id}>
                <b>
                  {reviewQuestionMap.get(item.questionId) ??
                    'Câu hỏi cần ôn lại'}
                </b>
                <p className="muted">
                  Đến hạn ôn: {item.dueAt.toLocaleDateString('vi')}
                </p>
                <Link className="brand" href="/practice">
                  Chọn bài luyện liên quan →
                </Link>
              </article>
            ))}
            {!reviewItems.length && (
              <div className="card muted">Không có câu nào đến hạn ôn.</div>
            )}
          </div>
        </section>

        <aside className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h3>Mục tiêu mỗi ngày</h3>
            <p>30 phút học tập tập trung</p>
            <span className="muted">
              Tập trung vào tiến bộ ổn định, không dùng streak gây áp lực.
            </span>
          </div>
          <div className="card">
            <h3>Chủ đề cần củng cố</h3>
            {weakTopics.map((item) => (
              <p key={item.id}>
                <b>{item.topic.name}</b>
                <br />
                <span className="muted">
                  {Math.round(item.score)}% · {item.correct}/{item.total} câu
                  đúng
                </span>
              </p>
            ))}
            {!weakTopics.length && (
              <p className="muted">
                Làm thêm bài luyện để hệ thống xác định chủ đề yếu.
              </p>
            )}
          </div>
          <div className="card">
            <h3>Lần luyện gần đây</h3>
            {attempts.map((attempt) => (
              <p key={attempt.id}>
                <Link href={`/attempts/${attempt.id}/result`}>
                  {attempt.assessment.title}
                </Link>
                <br />
                <span className="muted">
                  {attempt.score === null
                    ? 'Rubric/AI feedback'
                    : `${attempt.score}%`}
                </span>
              </p>
            ))}
            {!attempts.length && <p className="muted">Chưa có lần luyện.</p>}
          </div>
          <div className="card">
            <h3>Đánh dấu gần đây</h3>
            {bookmarks.map((bookmark) => (
              <p key={bookmark.id}>
                <Link
                  href={`/learn/${bookmark.lesson.module.version.course.slug}/${bookmark.lesson.slug}`}
                >
                  {bookmark.lesson.title}
                </Link>
              </p>
            ))}
            {!bookmarks.length && <p className="muted">Chưa có bookmark.</p>}
            <Link className="brand" href="/bookmarks">
              Xem tất cả →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
