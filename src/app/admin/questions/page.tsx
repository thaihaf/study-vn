import { ConfirmButton } from '@/components/shared/confirm-button';
import { ServerActionButton } from '@/components/shared/server-action-button';
import { db } from '@/lib/db';
import {
  createQuestion,
  deleteQuestion,
  updateQuestion,
} from '@/modules/assessments/management-actions';
import { requirePermission } from '@/modules/auth/session';

const types = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_TEXT',
  'ESSAY',
  'CODE_REVIEW',
  'SCENARIO',
] as const;

function choicesText(
  type: string,
  choices: Array<{ text: string; isCorrect: boolean }>,
) {
  if (type === 'TRUE_FALSE') {
    return choices.find((choice) => choice.isCorrect)?.text ?? 'Đúng';
  }
  return choices
    .map((choice) => `${choice.isCorrect ? '* ' : ''}${choice.text}`)
    .join('\n');
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; state?: string }>;
}) {
  await requirePermission('course:edit');
  const query = await searchParams;
  const rows = await db.question.findMany({
    include: {
      bank: true,
      topic: true,
      choices: { orderBy: { position: 'asc' } },
      assessments: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 300,
  });

  const focused = query.focus
    ? rows.find((question) => question.id === query.focus)
    : null;

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Ngân hàng câu hỏi</h1>
      <p className="muted">
        Dấu * ở đầu dòng đánh dấu đáp án đúng cho câu lựa chọn. Câu đã được dùng
        trong bài đánh giá không thể xóa, nhưng vẫn có thể chỉnh sửa trước khi
        tạo attempt mới; attempt cũ luôn giữ snapshot bất biến.
      </p>

      {query.state === 'created' && focused && (
        <div className="card" role="status">
          ✓ Đã tạo câu hỏi “{focused.prompt}”.
        </div>
      )}
      {query.state === 'updated' && focused && (
        <div className="card" role="status">
          ✓ Đã lưu thay đổi cho câu hỏi “{focused.prompt}”.
        </div>
      )}
      {query.state === 'deleted' && (
        <div className="card" role="status">
          ✓ Đã xóa câu hỏi.
        </div>
      )}

      <details className="card" open={rows.length === 0}>
        <summary>
          <b>+ Thêm câu hỏi</b>
        </summary>
        <form
          className="grid"
          action={createQuestion}
          style={{ marginTop: '1rem' }}
        >
          <div className="builder-three-cols">
            <label className="label">
              Ngân hàng
              <input
                className="input"
                name="bankTitle"
                defaultValue="Ngân hàng chung"
                required
              />
            </label>
            <label className="label">
              Chủ đề
              <input
                className="input"
                name="topicName"
                placeholder="Ví dụ: Cơ sở dữ liệu"
              />
            </label>
            <label className="label">
              Độ khó
              <select className="input" name="difficulty" defaultValue="2">
                <option value="1">1 - Dễ</option>
                <option value="2">2</option>
                <option value="3">3 - Trung bình</option>
                <option value="4">4</option>
                <option value="5">5 - Khó</option>
              </select>
            </label>
          </div>
          <div className="builder-two-cols">
            <label className="label">
              Loại
              <select
                className="input"
                name="type"
                defaultValue="SINGLE_CHOICE"
              >
                {types.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Trạng thái
              <select className="input" name="status">
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          </div>
          <label className="label">
            Câu hỏi
            <textarea className="input" name="prompt" rows={4} required />
          </label>
          <label className="label">
            Lựa chọn / đáp án Đúng-Sai
            <textarea
              className="input"
              name="choices"
              rows={6}
              placeholder={
                '* Đáp án đúng\nĐáp án sai\n\nVới TRUE_FALSE: nhập Đúng hoặc Sai'
              }
            />
          </label>
          <label className="label">
            Đáp án tham khảo / short text
            <textarea className="input" name="referenceAnswer" rows={4} />
          </label>
          <label className="label">
            Giải thích
            <textarea className="input" name="explanation" rows={4} />
          </label>
          <label className="label">
            Rubric (JSON hoặc văn bản)
            <textarea className="input code-input" name="rubric" rows={5} />
          </label>
          <ServerActionButton className="btn" pendingLabel="Đang tạo câu hỏi...">
            Tạo câu hỏi
          </ServerActionButton>
        </form>
      </details>

      <div className="grid" style={{ marginTop: '1rem' }}>
        {rows.map((question) => (
          <article
            className="card"
            key={question.id}
            aria-label={`Câu hỏi: ${question.prompt}`}
          >
            <div className="builder-row">
              <div>
                <span className="status">
                  {question.type} · {question.status} · độ khó{' '}
                  {question.difficulty}
                </span>
                <h3>{question.prompt}</h3>
                <p className="muted">
                  {question.bank.title} ·{' '}
                  {question.topic?.name ?? 'Chưa gắn chủ đề'} · dùng trong{' '}
                  {question.assessments.length} bài luyện
                </p>
              </div>
              {question.assessments.length === 0 && (
                <form action={deleteQuestion}>
                  <input type="hidden" name="questionId" value={question.id} />
                  <ConfirmButton
                    className="btn danger compact"
                    message="Xóa vĩnh viễn câu hỏi này?"
                  >
                    Xóa
                  </ConfirmButton>
                </form>
              )}
            </div>

            {question.choices.length > 0 && (
              <ol>
                {question.choices.map((choice) => (
                  <li key={choice.id}>
                    {choice.isCorrect ? '✓ ' : ''}
                    {choice.text}
                  </li>
                ))}
              </ol>
            )}

            <details>
              <summary>
                <b>Chỉnh sửa câu hỏi</b>
              </summary>
              <form
                className="grid"
                action={updateQuestion}
                style={{ marginTop: '1rem' }}
              >
                <input type="hidden" name="questionId" value={question.id} />
                <div className="builder-three-cols">
                  <label className="label">
                    Ngân hàng
                    <input
                      className="input"
                      name="bankTitle"
                      defaultValue={question.bank.title}
                      required
                    />
                  </label>
                  <label className="label">
                    Chủ đề
                    <input
                      className="input"
                      name="topicName"
                      defaultValue={question.topic?.name ?? ''}
                    />
                  </label>
                  <label className="label">
                    Độ khó
                    <input
                      className="input"
                      name="difficulty"
                      type="number"
                      min={1}
                      max={5}
                      defaultValue={question.difficulty}
                      required
                    />
                  </label>
                </div>
                <div className="builder-two-cols">
                  <label className="label">
                    Loại
                    <select
                      className="input"
                      name="type"
                      defaultValue={question.type}
                    >
                      {types.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    Trạng thái
                    <select
                      className="input"
                      name="status"
                      defaultValue={question.status}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </label>
                </div>
                <label className="label">
                  Câu hỏi
                  <textarea
                    className="input"
                    name="prompt"
                    rows={4}
                    defaultValue={question.prompt}
                    required
                  />
                </label>
                <label className="label">
                  Lựa chọn / đáp án Đúng-Sai
                  <textarea
                    className="input"
                    name="choices"
                    rows={6}
                    defaultValue={choicesText(question.type, question.choices)}
                  />
                </label>
                <label className="label">
                  Đáp án tham khảo
                  <textarea
                    className="input"
                    name="referenceAnswer"
                    rows={4}
                    defaultValue={question.referenceAnswer ?? ''}
                  />
                </label>
                <label className="label">
                  Giải thích
                  <textarea
                    className="input"
                    name="explanation"
                    rows={4}
                    defaultValue={question.explanation ?? ''}
                  />
                </label>
                <label className="label">
                  Rubric
                  <textarea
                    className="input code-input"
                    name="rubric"
                    rows={5}
                    defaultValue={
                      question.rubricJson
                        ? JSON.stringify(question.rubricJson, null, 2)
                        : ''
                    }
                  />
                </label>
                <ServerActionButton
                  className="btn secondary"
                  pendingLabel="Đang lưu thay đổi..."
                >
                  Lưu thay đổi
                </ServerActionButton>
              </form>
            </details>
          </article>
        ))}
        {!rows.length && <div className="card muted">Chưa có câu hỏi.</div>}
      </div>
    </>
  );
}
