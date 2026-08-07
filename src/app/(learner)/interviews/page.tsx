import Link from 'next/link';

import { db } from '@/lib/db';
import { requireUser } from '@/modules/auth/session';

export default async function Page() {
  await requireUser();
  const rows = await db.assessment.findMany({
    where: {
      published: true,
      questions: { some: { question: { type: 'SCENARIO' } } },
    },
    include: { questions: true },
    orderBy: { title: 'asc' },
  });
  return (
    <div className="container page">
      <h1 style={{ fontSize: '2.5rem' }}>Phỏng vấn văn bản</h1>
      <div className="card"><p>Trả lời theo cấu trúc, tự đối chiếu rubric và có thể yêu cầu AI góp ý. Phản hồi chỉ là hướng dẫn luyện tập, không phải kết quả tuyển dụng.</p></div>
      <div className="grid" style={{ marginTop: '1rem' }}>
        {rows.map((row) => <Link className="card" href={`/interviews/${row.id}`} key={row.id}><h2>{row.title}</h2><p>{row.description}</p><span className="status">{row.questions.length} câu</span></Link>)}
        {!rows.length && <div className="card muted">Chưa có bộ phỏng vấn được xuất bản.</div>}
      </div>
    </div>
  );
}
