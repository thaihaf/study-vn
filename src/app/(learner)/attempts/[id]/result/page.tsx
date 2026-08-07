import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requestPracticeFeedback } from '@/modules/assessments/learner-actions';
import { requireUser } from '@/modules/auth/session';

const display = (value: unknown) =>
  Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id, userId: user.id, status: 'GRADED' },
    include: {
      assessment: true,
      snapshots: { orderBy: { position: 'asc' } },
      answers: true,
    },
  });
  if (!attempt) return notFound();
  return (
    <div className="page container" style={{ maxWidth: 900 }}>
      <h1>
        {attempt.score === null
          ? 'Kết quả luyện tập'
          : `Kết quả: ${attempt.score}%`}
      </h1>
      {attempt.score !== null && (
        <p>
          {attempt.score >= attempt.assessment.passScore
            ? 'Đạt mục tiêu'
            : 'Nên ôn lại các câu chưa đúng'}
        </p>
      )}
      <div className="grid">
        {attempt.snapshots.map((snapshot, index) => {
          const answer = attempt.answers.find(
            (item) => item.snapshotId === snapshot.id,
          );
          const subjective = ['ESSAY', 'CODE_REVIEW', 'SCENARIO'].includes(
            snapshot.type,
          );
          return (
            <article className="card" key={snapshot.id}>
              <h2 style={{ fontSize: '1.2rem' }}>
                Câu {index + 1}. {snapshot.prompt}
              </h2>
              {answer && (
                <p>
                  <b>Câu trả lời:</b> {display(answer.answerJson)}
                </p>
              )}
              {subjective ? (
                <p className="status">Đánh giá theo rubric</p>
              ) : (
                <p>{answer?.isCorrect ? '✓ Chính xác' : '✗ Cần ôn lại'}</p>
              )}
              {attempt.assessment.feedbackMode !== 'NEVER' &&
                snapshot.explanation && (
                  <p className="muted">{snapshot.explanation}</p>
                )}
              {subjective && (
                <details>
                  <summary>Rubric và đáp án tham khảo</summary>
                  <pre className="code-block">
                    <code>
                      {JSON.stringify(snapshot.rubricJson ?? {}, null, 2)}
                    </code>
                  </pre>
                  <p>{display(snapshot.correctAnswerJson)}</p>
                </details>
              )}
              {subjective && answer && !answer.feedbackJson && (
                <form action={requestPracticeFeedback}>
                  <input type="hidden" name="answerId" value={answer.id} />
                  <button className="btn secondary">Yêu cầu phản hồi AI</button>
                </form>
              )}
              {answer?.feedbackJson && (
                <div className="card">
                  <h3>Phản hồi luyện tập</h3>
                  <pre
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                  >
                    {JSON.stringify(answer.feedbackJson, null, 2)}
                  </pre>
                  <small className="muted">
                    Chỉ dùng để luyện tập, không phải kết luận chính thức.
                  </small>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
