import Link from 'next/link';
import { notFound } from 'next/navigation';

import { db } from '@/lib/db';
import { startAssessment } from '@/modules/assessments/learner-actions';
import { requireUser } from '@/modules/auth/session';

export default async function EssaySet({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = await db.assessment.findFirst({
    where: { id, published: true, questions: { some: { question: { type: 'ESSAY' } } } },
    include: { questions: { include: { question: true }, orderBy: { position: 'asc' } } },
  });
  if (!row) return notFound();
  const attempts = await db.assessmentAttempt.findMany({
    where: { userId: user.id, assessmentId: id, status: 'GRADED' },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  });
  return (
    <div className="container page" style={{ maxWidth: 850 }}>
      <Link className="muted" href="/essays">← Bài luận</Link>
      <span className="status">{row.questions.length} đề luyện</span>
      <h1>{row.title}</h1>
      <p>{row.description}</p>
      <form action={startAssessment}><input type="hidden" name="assessmentId" value={row.id} /><button className="btn">Bắt đầu viết</button></form>
      {attempts.length > 0 && <section><h2>Các lần đã luyện</h2><div className="grid">{attempts.map((attempt) => <Link className="card" href={`/attempts/${attempt.id}/result`} key={attempt.id}>{attempt.submittedAt?.toLocaleString('vi') ?? 'Đã nộp'} → xem và so sánh</Link>)}</div></section>}
    </div>
  );
}
