import { notFound } from 'next/navigation';

import { db } from '@/lib/db';
import { startAssessment } from '@/modules/assessments/learner-actions';
import { requireUser } from '@/modules/auth/session';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const row = await db.assessment.findFirst({
    where: {
      id,
      published: true,
      questions: { some: { question: { type: 'SCENARIO' } } },
    },
    include: {
      questions: { include: { question: true }, orderBy: { position: 'asc' } },
    },
  });
  if (!row) return notFound();
  const previous = await db.assessmentAttempt.findMany({
    where: { userId: user.id, assessmentId: id, status: 'GRADED' },
    orderBy: { submittedAt: 'desc' },
    take: 5,
  });
  return (
    <div className="page container" style={{ maxWidth: 850 }}>
      <span className="status">
        Phỏng vấn văn bản · {row.questions.length} câu
      </span>
      <h1>{row.title}</h1>
      <p>{row.description}</p>
      <div className="card">
        <b>Cách luyện</b>
        <p>
          Viết câu trả lời như khi trao đổi trực tiếp. Sau khi nộp, mở rubric và
          yêu cầu phản hồi AI cho từng câu cần góp ý.
        </p>
      </div>
      <form action={startAssessment}>
        <input type="hidden" name="assessmentId" value={row.id} />
        <button className="btn">Bắt đầu phiên luyện</button>
      </form>
      {previous.length > 0 && (
        <section>
          <h2>Lần luyện gần đây</h2>
          {previous.map((attempt) => (
            <a
              className="card"
              style={{ display: 'block' }}
              href={`/attempts/${attempt.id}/result`}
              key={attempt.id}
            >
              {attempt.submittedAt?.toLocaleString('vi') ??
                attempt.startedAt.toLocaleString('vi')}{' '}
              → xem lại
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
