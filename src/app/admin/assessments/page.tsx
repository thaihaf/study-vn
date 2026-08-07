import { ConfirmButton } from '@/components/shared/confirm-button';
import { db } from '@/lib/db';
import {
  addQuestionToAssessment,
  createAssessment,
  removeQuestionFromAssessment,
  toggleAssessmentPublished,
} from '@/modules/assessments/admin-actions';
import { requirePermission } from '@/modules/auth/session';

export default async function Page() {
  await requirePermission('course:edit');
  const [rows, questions, courses] = await Promise.all([
    db.assessment.findMany({
      include: {
        course: true,
        questions: {
          orderBy: { position: 'asc' },
          include: { question: true },
        },
      },
      orderBy: { title: 'asc' },
    }),
    db.question.findMany({ where: { status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' }, take: 300 }),
    db.course.findMany({ where: { archivedAt: null }, orderBy: { title: 'asc' } }),
  ]);

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Quiz và thi thử</h1>
      <details className="card" open={rows.length === 0}>
        <summary><b>+ Tạo bài đánh giá</b></summary>
        <form className="grid" action={createAssessment} style={{ marginTop: '1rem' }}>
          <label className="label">Tên<input className="input" name="title" required /></label>
          <label className="label">Mô tả<textarea className="input" name="description" rows={3} /></label>
          <div className="builder-three-cols">
            <label className="label">Loại<select className="input" name="type"><option value="QUIZ">Quiz</option><option value="MOCK_EXAM">Thi thử</option></select></label>
            <label className="label">Điểm đạt<input className="input" name="passScore" type="number" min={0} max={100} defaultValue={70} /></label>
            <label className="label">Thời gian (phút)<input className="input" name="timeLimitMinutes" type="number" min={1} /></label>
          </div>
          <div className="builder-two-cols">
            <label className="label">Khóa học<select className="input" name="courseId" defaultValue=""><option value="">Không gắn khóa học</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label className="label">Số lần tối đa<input className="input" name="maximumAttempts" type="number" min={1} /></label>
          </div>
          <button className="btn">Tạo bài đánh giá</button>
        </form>
      </details>

      <div className="grid" style={{ marginTop: '1rem' }}>
        {rows.map((assessment) => {
          const assigned = new Set(assessment.questions.map((item) => item.questionId));
          const available = questions.filter((question) => !assigned.has(question.id));
          return (
            <article className="card grid" key={assessment.id}>
              <div className="builder-row">
                <div>
                  <span className="status">{assessment.published ? 'Đã xuất bản' : 'Bản nháp'}</span>
                  <h3>{assessment.title}</h3>
                  <p>{assessment.type} · {assessment.questions.length} câu · đạt {assessment.passScore}%{assessment.course ? ` · ${assessment.course.title}` : ''}</p>
                </div>
                <form action={toggleAssessmentPublished}>
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <ConfirmButton className={assessment.published ? 'btn secondary' : 'btn'} message={assessment.published ? 'Ẩn bài đánh giá khỏi người học?' : 'Xuất bản bài đánh giá này?'}>
                    {assessment.published ? 'Gỡ xuất bản' : 'Xuất bản'}
                  </ConfirmButton>
                </form>
              </div>

              {available.length > 0 && (
                <form className="builder-row" action={addQuestionToAssessment}>
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <select className="input" name="questionId" required defaultValue="">
                    <option value="" disabled>Chọn câu hỏi để thêm…</option>
                    {available.map((question) => <option value={question.id} key={question.id}>{question.type} · {question.prompt.slice(0, 90)}</option>)}
                  </select>
                  <button className="btn secondary">Thêm câu</button>
                </form>
              )}

              <ol className="grid">
                {assessment.questions.map((item) => (
                  <li className="card inset-card" key={item.questionId}>
                    <div className="builder-row">
                      <span>{item.position + 1}. {item.question.prompt} <small className="muted">({item.question.type})</small></span>
                      {!assessment.published && (
                        <form action={removeQuestionFromAssessment}>
                          <input type="hidden" name="assessmentId" value={assessment.id} />
                          <input type="hidden" name="questionId" value={item.questionId} />
                          <button className="btn danger compact">Bỏ</button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
        {!rows.length && <div className="card muted">Chưa có bài đánh giá.</div>}
      </div>
    </>
  );
}
