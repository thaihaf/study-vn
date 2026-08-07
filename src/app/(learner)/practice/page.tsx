import Link from 'next/link';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';

export default async function Page() {
  const user = await requireUser();
  const [rows, dueReviews] = await Promise.all([
    db.assessment.findMany({
      where: { published: true },
      include: { questions: { include: { question: true } } },
      orderBy: { title: 'asc' },
    }),
    db.reviewItem.count({
      where: { userId: user.id, dueAt: { lte: new Date() } },
    }),
  ]);
  const objective = rows.filter((row) =>
    row.questions.some((item) =>
      ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_TEXT'].includes(
        item.question.type,
      ),
    ),
  );

  return (
    <div className="page container">
      <div className="builder-page-heading">
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Luyện tập</h1>
          <p className="muted">
            Quiz, thi thử, ôn câu sai, bài luận và phỏng vấn văn bản.
          </p>
        </div>
        <div className="builder-actions">
          <Link className="btn" href="/practice/review">
            Ôn câu sai ({dueReviews})
          </Link>
          <Link className="btn secondary" href="/essays">
            Bài luận
          </Link>
          <Link className="btn secondary" href="/interviews">
            Phỏng vấn
          </Link>
        </div>
      </div>

      <h2>Quiz và thi thử</h2>
      <div className="grid">
        {objective.map((assessment) => (
          <Link
            className="card"
            style={{ display: 'block' }}
            href={`/assessments/${assessment.id}`}
            key={assessment.id}
          >
            <span className="status">{assessment.type}</span>
            <h2>{assessment.title}</h2>
            <p>{assessment.description}</p>
            <small className="muted">
              {assessment.questions.length} câu · điểm đạt{' '}
              {assessment.passScore}%
            </small>
          </Link>
        ))}
        {!objective.length && (
          <div className="card muted">
            Chưa có quiz hoặc thi thử được xuất bản.
          </div>
        )}
      </div>
    </div>
  );
}
