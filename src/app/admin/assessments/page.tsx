import { ConfirmButton } from '@/components/shared/confirm-button';
import { ServerActionButton } from '@/components/shared/server-action-button';
import { db } from '@/lib/db';
import {
  addQuestionToAssessment,
  createAssessment,
  moveAssessmentQuestion,
  removeQuestionFromAssessment,
  toggleAssessmentPublished,
  updateAssessment,
} from '@/modules/assessments/management-actions';
import { requirePermission } from '@/modules/auth/session';

function AssessmentFields({
  assessment,
  courses,
}: {
  assessment?: {
    title: string;
    description: string;
    type: 'QUIZ' | 'MOCK_EXAM';
    courseId: string | null;
    timeLimitMinutes: number | null;
    passScore: number;
    maximumAttempts: number | null;
    randomizeQuestions: boolean;
    randomizeChoices: boolean;
    feedbackMode: string;
  };
  courses: Array<{ id: string; title: string }>;
}) {
  return (
    <>
      <label className="label">
        Tên
        <input
          className="input"
          name="title"
          defaultValue={assessment?.title ?? ''}
          required
        />
      </label>
      <label className="label">
        Mô tả
        <textarea
          className="input"
          name="description"
          rows={3}
          defaultValue={assessment?.description ?? ''}
        />
      </label>
      <div className="builder-three-cols">
        <label className="label">
          Loại
          <select
            className="input"
            name="type"
            defaultValue={assessment?.type ?? 'QUIZ'}
          >
            <option value="QUIZ">Quiz</option>
            <option value="MOCK_EXAM">Thi thử</option>
          </select>
        </label>
        <label className="label">
          Điểm đạt
          <input
            className="input"
            name="passScore"
            type="number"
            min={0}
            max={100}
            defaultValue={assessment?.passScore ?? 70}
          />
        </label>
        <label className="label">
          Thời gian (phút)
          <input
            className="input"
            name="timeLimitMinutes"
            type="number"
            min={1}
            defaultValue={assessment?.timeLimitMinutes ?? ''}
          />
        </label>
      </div>
      <div className="builder-three-cols">
        <label className="label">
          Khóa học
          <select
            className="input"
            name="courseId"
            defaultValue={assessment?.courseId ?? ''}
          >
            <option value="">Không gắn khóa học</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Số lần tối đa
          <input
            className="input"
            name="maximumAttempts"
            type="number"
            min={1}
            defaultValue={assessment?.maximumAttempts ?? ''}
          />
        </label>
        <label className="label">
          Hiển thị phản hồi
          <select
            className="input"
            name="feedbackMode"
            defaultValue={assessment?.feedbackMode ?? 'AFTER_SUBMISSION'}
          >
            <option value="AFTER_SUBMISSION">Sau khi nộp</option>
            <option value="AFTER_PASS">Sau khi đạt</option>
            <option value="NEVER">Không hiển thị</option>
          </select>
        </label>
      </div>
      <div className="builder-actions">
        <label className="check-row">
          <input
            type="checkbox"
            name="randomizeQuestions"
            defaultChecked={assessment?.randomizeQuestions ?? false}
          />
          Trộn câu hỏi
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            name="randomizeChoices"
            defaultChecked={assessment?.randomizeChoices ?? false}
          />
          Trộn lựa chọn
        </label>
      </div>
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requirePermission('course:edit');
  const query = await searchParams;
  const [rows, questions, courses] = await Promise.all([
    db.assessment.findMany({
      include: {
        course: true,
        questions: {
          orderBy: { position: 'asc' },
          include: { question: true },
        },
        _count: { select: { attempts: true } },
      },
      orderBy: { title: 'asc' },
    }),
    db.question.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    }),
    db.course.findMany({
      where: { archivedAt: null },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Quiz và thi thử</h1>
      <p className="muted">
        Bài đã xuất bản phải được gỡ xuất bản trước khi thay đổi cấu trúc câu
        hỏi. Các lần làm cũ không bị ảnh hưởng vì mỗi attempt lưu snapshot
        riêng.
      </p>

      {query.created && rows.some((row) => row.id === query.created) && (
        <div className="card" role="status">
          ✓ Đã tạo bài đánh giá. Bạn có thể thêm câu hỏi và xuất bản ngay bên
          dưới.
        </div>
      )}

      <details className="card" open={rows.length === 0}>
        <summary>
          <b>+ Tạo bài đánh giá</b>
        </summary>
        <form
          className="grid"
          action={createAssessment}
          style={{ marginTop: '1rem' }}
        >
          <AssessmentFields courses={courses} />
          <ServerActionButton
            className="btn"
            pendingLabel="Đang tạo bài đánh giá..."
          >
            Tạo bài đánh giá
          </ServerActionButton>
        </form>
      </details>

      <div className="grid" style={{ marginTop: '1rem' }}>
        {rows.map((assessment) => {
          const assigned = new Set(
            assessment.questions.map((item) => item.questionId),
          );
          const available = questions.filter(
            (question) => !assigned.has(question.id),
          );
          return (
            <article
              className="card grid"
              key={assessment.id}
              data-assessment-id={assessment.id}
              aria-label={`Bài đánh giá: ${assessment.title}`}
            >
              <div className="builder-row">
                <div>
                  <span className="status">
                    {assessment.published ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                  <h3>{assessment.title}</h3>
                  <p>
                    {assessment.type} · {assessment.questions.length} câu · đạt{' '}
                    {assessment.passScore}%
                    {assessment.course ? ` · ${assessment.course.title}` : ''}
                  </p>
                  <small className="muted">
                    {assessment._count.attempts} lượt làm · trộn câu:{' '}
                    {assessment.randomizeQuestions ? 'có' : 'không'} · trộn đáp
                    án: {assessment.randomizeChoices ? 'có' : 'không'}
                  </small>
                </div>
                <form action={toggleAssessmentPublished}>
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  {assessment.published ? (
                    <ConfirmButton
                      className="btn secondary"
                      message="Ẩn bài đánh giá khỏi người học?"
                    >
                      Gỡ xuất bản
                    </ConfirmButton>
                  ) : (
                    <ServerActionButton
                      className="btn"
                      pendingLabel="Đang xuất bản..."
                    >
                      Xuất bản
                    </ServerActionButton>
                  )}
                </form>
              </div>

              <details>
                <summary>
                  <b>Chỉnh cài đặt bài đánh giá</b>
                </summary>
                <form
                  className="grid"
                  action={updateAssessment}
                  style={{ marginTop: '1rem' }}
                >
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <AssessmentFields assessment={assessment} courses={courses} />
                  <ServerActionButton
                    className="btn secondary"
                    pendingLabel="Đang lưu cài đặt..."
                  >
                    Lưu cài đặt
                  </ServerActionButton>
                </form>
              </details>

              {!assessment.published && available.length > 0 && (
                <form className="builder-row" action={addQuestionToAssessment}>
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <select
                    className="input"
                    name="questionId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Chọn câu hỏi để thêm…
                    </option>
                    {available.map((question) => (
                      <option value={question.id} key={question.id}>
                        {question.type} · {question.prompt.slice(0, 90)}
                      </option>
                    ))}
                  </select>
                  <ServerActionButton
                    className="btn secondary"
                    pendingLabel="Đang thêm câu..."
                  >
                    Thêm câu
                  </ServerActionButton>
                </form>
              )}

              <ol className="grid">
                {assessment.questions.map((item, index) => (
                  <li className="card inset-card" key={item.questionId}>
                    <div className="builder-row">
                      <span>
                        {index + 1}. {item.question.prompt}{' '}
                        <small className="muted">
                          ({item.question.type} · {item.points} điểm)
                        </small>
                      </span>
                      {!assessment.published && (
                        <div className="builder-actions">
                          <form action={moveAssessmentQuestion}>
                            <input
                              type="hidden"
                              name="assessmentId"
                              value={assessment.id}
                            />
                            <input
                              type="hidden"
                              name="questionId"
                              value={item.questionId}
                            />
                            <ServerActionButton
                              className="btn secondary compact"
                              name="direction"
                              value="up"
                              disabled={index === 0}
                              aria-label="Đưa câu hỏi lên"
                              pendingLabel="…"
                            >
                              ↑
                            </ServerActionButton>
                            <ServerActionButton
                              className="btn secondary compact"
                              name="direction"
                              value="down"
                              disabled={
                                index === assessment.questions.length - 1
                              }
                              aria-label="Đưa câu hỏi xuống"
                              pendingLabel="…"
                            >
                              ↓
                            </ServerActionButton>
                          </form>
                          <form action={removeQuestionFromAssessment}>
                            <input
                              type="hidden"
                              name="assessmentId"
                              value={assessment.id}
                            />
                            <input
                              type="hidden"
                              name="questionId"
                              value={item.questionId}
                            />
                            <ServerActionButton
                              className="btn danger compact"
                              pendingLabel="Đang bỏ..."
                            >
                              Bỏ
                            </ServerActionButton>
                          </form>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
        {!rows.length && (
          <div className="card muted">Chưa có bài đánh giá.</div>
        )}
      </div>
    </>
  );
}
