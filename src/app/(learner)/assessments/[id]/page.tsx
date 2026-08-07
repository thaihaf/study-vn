import { notFound } from 'next/navigation';

import { db } from '@/lib/db';
import { serializeForLearner } from '@/modules/assessments/grading';
import {
  startAssessment,
  submitAssessment,
} from '@/modules/assessments/learner-actions';
import { requireUser } from '@/modules/auth/session';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { attempt: attemptId } = await searchParams;
  const assessment = await db.assessment.findFirst({
    where: { id, published: true },
  });
  if (!assessment) return notFound();

  if (!attemptId) {
    const usedAttempts = await db.assessmentAttempt.count({
      where: { assessmentId: id, userId: user.id },
    });
    return (
      <div className="page container" style={{ maxWidth: 800 }}>
        <span className="status">{assessment.type}</span>
        <h1>{assessment.title}</h1>
        <p>{assessment.description}</p>
        <div className="card">
          <p>
            Điểm đạt: {assessment.passScore}% · Thời gian:{' '}
            {assessment.timeLimitMinutes ?? 'không giới hạn'} phút
          </p>
          <p>
            Lần đã làm: {usedAttempts}
            {assessment.maximumAttempts
              ? ` / ${assessment.maximumAttempts}`
              : ''}
          </p>
        </div>
        {assessment.maximumAttempts &&
        usedAttempts >= assessment.maximumAttempts ? (
          <div className="card">Bạn đã dùng hết số lần làm bài.</div>
        ) : (
          <form action={startAssessment}>
            <input type="hidden" name="assessmentId" value={id} />
            <button className="btn">Bắt đầu</button>
          </form>
        )}
      </div>
    );
  }

  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: 'IN_PROGRESS' },
    include: { snapshots: { orderBy: { position: 'asc' } } },
  });
  if (!attempt) return notFound();

  return (
    <div className="page container" style={{ maxWidth: 900 }}>
      <span className="status">
        Đang làm · bắt đầu {attempt.startedAt.toLocaleString('vi')}
      </span>
      <h1>{assessment.title}</h1>
      {assessment.timeLimitMinutes && (
        <p className="muted">
          Thời lượng khuyến nghị: {assessment.timeLimitMinutes} phút. Hệ thống
          lưu thời điểm bắt đầu và nộp bài.
        </p>
      )}
      <form className="grid" action={submitAssessment}>
        <input type="hidden" name="attemptId" value={attempt.id} />
        {attempt.snapshots.map((raw, index) => {
          const question = serializeForLearner(raw);
          const choices = question.choicesJson as Array<{
            id: string;
            text: string;
          }>;
          return (
            <fieldset className="card" key={question.id}>
              <legend>
                <b>
                  Câu {index + 1}. {question.prompt}
                </b>
              </legend>
              {choices.map((choice) => (
                <label
                  style={{ display: 'block', padding: '.5rem' }}
                  key={choice.id}
                >
                  <input
                    type={
                      question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'
                    }
                    name={`answer_${question.id}`}
                    value={choice.id}
                  />{' '}
                  {choice.text}
                </label>
              ))}
              {!choices.length && (
                <textarea
                  className="input"
                  name={`answer_${question.id}`}
                  rows={question.type === 'SHORT_TEXT' ? 3 : 10}
                  placeholder={
                    question.type === 'SHORT_TEXT'
                      ? 'Nhập câu trả lời…'
                      : 'Viết câu trả lời của bạn…'
                  }
                />
              )}
            </fieldset>
          );
        })}
        <button className="btn">Nộp bài</button>
      </form>
    </div>
  );
}
