import Link from 'next/link';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';
import { gradeReviewItem } from '@/modules/progress/review-actions';

export default async function ReviewQueue() {
  const user = await requireUser();
  const items = await db.reviewItem.findMany({
    where: { userId: user.id, dueAt: { lte: new Date() } },
    orderBy: { dueAt: 'asc' },
    take: 30,
  });
  const questions = items.length
    ? await db.question.findMany({
        where: { id: { in: items.map((item) => item.questionId) } },
        include: { choices: { orderBy: { position: 'asc' } }, topic: true },
      })
    : [];
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return (
    <div className="container page" style={{ maxWidth: 900 }}>
      <Link className="muted" href="/practice">← Luyện tập</Link>
      <h1 style={{ fontSize: '2.5rem' }}>Ôn câu sai</h1>
      <p className="muted">
        Lịch ôn dùng quy tắc cố định, dễ hiểu. Chọn mức độ nhớ sau khi tự trả lời
        để đặt lịch lần tiếp theo.
      </p>
      <div className="grid">
        {items.map((item, index) => {
          const question = questionMap.get(item.questionId);
          if (!question) return null;
          return (
            <article className="card" key={item.id}>
              <span className="status">
                Câu {index + 1} · {question.topic?.name ?? 'Tổng quát'}
              </span>
              <h2 style={{ fontSize: '1.3rem' }}>{question.prompt}</h2>
              {question.choices.length > 0 && (
                <ol>
                  {question.choices.map((choice) => (
                    <li key={choice.id}>{choice.text}</li>
                  ))}
                </ol>
              )}
              <details>
                <summary>Hiện đáp án và giải thích</summary>
                {question.choices.length > 0 && (
                  <p>
                    <b>Đáp án:</b>{' '}
                    {question.choices
                      .filter((choice) => choice.isCorrect)
                      .map((choice) => choice.text)
                      .join(', ')}
                  </p>
                )}
                {question.referenceAnswer && (
                  <p>
                    <b>Tham khảo:</b> {question.referenceAnswer}
                  </p>
                )}
                {question.explanation && <p>{question.explanation}</p>}
              </details>
              <form className="builder-actions" action={gradeReviewItem}>
                <input type="hidden" name="reviewItemId" value={item.id} />
                <button className="btn danger compact" name="grade" value="AGAIN">
                  Again · 1 ngày
                </button>
                <button className="btn secondary compact" name="grade" value="HARD">
                  Hard
                </button>
                <button className="btn secondary compact" name="grade" value="GOOD">
                  Good
                </button>
                <button className="btn compact" name="grade" value="EASY">
                  Easy
                </button>
              </form>
            </article>
          );
        })}
        {!items.length && (
          <div className="card muted">
            Không có câu nào đến hạn ôn. Làm thêm bài luyện để tạo hàng đợi ôn tập.
          </div>
        )}
      </div>
    </div>
  );
}
