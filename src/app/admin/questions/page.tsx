import { ConfirmButton } from '@/components/shared/confirm-button';
import { db } from '@/lib/db';
import { createQuestion, deleteQuestion } from '@/modules/assessments/admin-actions';
import { requirePermission } from '@/modules/auth/session';

export default async function Page() {
  await requirePermission('course:edit');
  const rows = await db.question.findMany({
    include: { bank: true, topic: true, choices: { orderBy: { position: 'asc' } }, assessments: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Ngân hàng câu hỏi</h1>
      <p className="muted">Dấu * ở đầu dòng đánh dấu đáp án đúng cho câu lựa chọn.</p>
      <details className="card" open={rows.length === 0}>
        <summary><b>+ Thêm câu hỏi</b></summary>
        <form className="grid" action={createQuestion} style={{ marginTop: '1rem' }}>
          <div className="builder-three-cols">
            <label className="label">Ngân hàng<input className="input" name="bankTitle" defaultValue="Ngân hàng chung" required /></label>
            <label className="label">Chủ đề<input className="input" name="topicName" placeholder="Ví dụ: Cơ sở dữ liệu" /></label>
            <label className="label">Độ khó<select className="input" name="difficulty" defaultValue="2"><option value="1">1 - Dễ</option><option value="2">2</option><option value="3">3 - Trung bình</option><option value="4">4</option><option value="5">5 - Khó</option></select></label>
          </div>
          <div className="builder-two-cols">
            <label className="label">Loại<select className="input" name="type" defaultValue="SINGLE_CHOICE"><option>SINGLE_CHOICE</option><option>MULTIPLE_CHOICE</option><option>TRUE_FALSE</option><option>SHORT_TEXT</option><option>ESSAY</option><option>CODE_REVIEW</option><option>SCENARIO</option></select></label>
            <label className="label">Trạng thái<select className="input" name="status"><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option></select></label>
          </div>
          <label className="label">Câu hỏi<textarea className="input" name="prompt" rows={4} required /></label>
          <label className="label">Lựa chọn / đáp án Đúng-Sai<textarea className="input" name="choices" rows={6} placeholder={'* Đáp án đúng\nĐáp án sai\n\nVới TRUE_FALSE: nhập Đúng hoặc Sai'} /></label>
          <label className="label">Đáp án tham khảo / short text<textarea className="input" name="referenceAnswer" rows={4} /></label>
          <label className="label">Giải thích<textarea className="input" name="explanation" rows={4} /></label>
          <label className="label">Rubric (JSON hoặc văn bản)<textarea className="input code-input" name="rubric" rows={5} /></label>
          <button className="btn">Tạo câu hỏi</button>
        </form>
      </details>

      <div className="grid" style={{ marginTop: '1rem' }}>
        {rows.map((question) => (
          <article className="card" key={question.id}>
            <div className="builder-row">
              <div>
                <span className="status">{question.type} · {question.status} · độ khó {question.difficulty}</span>
                <h3>{question.prompt}</h3>
                <p className="muted">{question.bank.title} · {question.topic?.name ?? 'Chưa gắn chủ đề'} · dùng trong {question.assessments.length} bài luyện</p>
              </div>
              {question.assessments.length === 0 && (
                <form action={deleteQuestion}>
                  <input type="hidden" name="questionId" value={question.id} />
                  <ConfirmButton className="btn danger compact" message="Xóa câu hỏi này?">Xóa</ConfirmButton>
                </form>
              )}
            </div>
            {question.choices.length > 0 && (
              <ol>
                {question.choices.map((choice) => <li key={choice.id}>{choice.isCorrect ? '✓ ' : ''}{choice.text}</li>)}
              </ol>
            )}
            {question.referenceAnswer && <details><summary>Đáp án tham khảo</summary><p>{question.referenceAnswer}</p></details>}
            {question.explanation && <details><summary>Giải thích</summary><p>{question.explanation}</p></details>}
          </article>
        ))}
        {!rows.length && <div className="card muted">Chưa có câu hỏi.</div>}
      </div>
    </>
  );
}
