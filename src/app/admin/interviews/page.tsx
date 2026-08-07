import Link from 'next/link';

import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';

export default async function Page() {
  await requirePermission('course:edit');
  const [essayQuestions, interviewQuestions, practiceSets] = await Promise.all([
    db.question.count({ where: { type: 'ESSAY' } }),
    db.question.count({ where: { type: 'SCENARIO' } }),
    db.assessment.findMany({
      where: { questions: { some: { question: { type: { in: ['ESSAY', 'SCENARIO'] } } } } },
      include: { questions: { include: { question: true } } },
      orderBy: { title: 'asc' },
    }),
  ]);
  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Bài luận & phỏng vấn</h1>
      <div className="builder-three-cols">
        <div className="card"><b>Đề tự luận</b><p>{essayQuestions}</p></div>
        <div className="card"><b>Câu phỏng vấn/tình huống</b><p>{interviewQuestions}</p></div>
        <div className="card"><b>Bộ luyện</b><p>{practiceSets.length}</p></div>
      </div>
      <div className="card">
        <h2>Tạo nội dung</h2>
        <p>Có thể tạo thủ công từ ngân hàng câu hỏi hoặc sinh bộ có rubric bằng AI. Phản hồi AI luôn được gắn nhãn là hướng dẫn luyện tập.</p>
        <div className="builder-actions"><Link className="btn" href="/admin/generate">Tạo bộ bằng AI</Link><Link className="btn secondary" href="/admin/questions">Tạo câu thủ công</Link><Link className="btn secondary" href="/admin/assessments">Ghép thành bộ luyện</Link></div>
      </div>
      <h2>Các bộ hiện có</h2>
      <div className="grid">
        {practiceSets.map((set) => {
          const types = [...new Set(set.questions.map((item) => item.question.type))];
          return <article className="card" key={set.id}><span className="status">{set.published ? 'Đã xuất bản' : 'Bản nháp'}</span><h3>{set.title}</h3><p>{set.questions.length} câu · {types.join(', ')}</p></article>;
        })}
        {!practiceSets.length && <div className="card muted">Chưa có bộ luyện.</div>}
      </div>
    </>
  );
}
