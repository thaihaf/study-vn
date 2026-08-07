import Link from 'next/link';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';

export default async function Essays() {
  await requireUser();
  const rows = await db.assessment.findMany({
    where: {
      published: true,
      questions: { some: { question: { type: 'ESSAY' } } },
    },
    include: { questions: true },
    orderBy: { title: 'asc' },
  });
  return (
    <div className="page container">
      <h1 style={{ fontSize: '2.5rem' }}>Luyện bài luận</h1>
      <p className="muted">
        Viết câu trả lời, tự đối chiếu rubric, thử lại và yêu cầu phản hồi AI
        khi cần.
      </p>
      <div className="grid">
        {rows.map((row) => (
          <Link className="card" href={`/essays/${row.id}`} key={row.id}>
            <h2>{row.title}</h2>
            <p>{row.description}</p>
            <span className="status">{row.questions.length} đề</span>
          </Link>
        ))}
        {!rows.length && (
          <div className="card muted">Chưa có bộ bài luận được xuất bản.</div>
        )}
      </div>
    </div>
  );
}
