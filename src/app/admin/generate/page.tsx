import { LessonGenerationPanel } from '@/components/admin/lesson-generation-panel';
import { db } from '@/lib/db';
import { hasRealAIConfiguration } from '@/modules/ai/openai-structured';
import { runRateLimitedGeneration } from '@/modules/ai/rate-limited-actions';
import { requirePermission } from '@/modules/auth/session';

export default async function Generate() {
  await requirePermission('ai:generate');
  const sources = await db.source.findMany({
    where: { archivedAt: null, processingStatus: 'READY' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const configured =
    hasRealAIConfiguration() ||
    (process.env.NODE_ENV !== 'production' && process.env.AI_PROVIDER === 'fake');

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Tạo nội dung với AI</h1>
      {!configured && (
        <div className="card warning-card">
          AI thật chưa được cấu hình cho môi trường này. Hãy cấu hình Vercel AI
          Gateway hoặc OpenAI trước khi chạy generation.
        </div>
      )}
      <form className="card grid" action={runRateLimitedGeneration}>
        <label className="label">
          Yêu cầu tự do
          <textarea
            className="input"
            name="prompt"
            rows={7}
            minLength={10}
            required
            placeholder="Mô tả nội dung cần tạo, phạm vi và các yêu cầu đặc biệt…"
          />
        </label>
        <div className="builder-two-cols">
          <label className="label">
            Tên khóa học / bộ luyện
            <input className="input" name="courseTitle" />
          </label>
          <label className="label">
            Đối tượng học
            <input className="input" name="targetAudience" />
          </label>
        </div>
        <div className="builder-three-cols">
          <label className="label">
            Trình độ hiện tại
            <input className="input" name="currentLevel" />
          </label>
          <label className="label">
            Kết quả mong muốn
            <input className="input" name="outcome" />
          </label>
          <label className="label">
            Thời lượng / số bài
            <input
              className="input"
              name="duration"
              placeholder="Ví dụ: 8 bài, 4 giờ"
            />
          </label>
        </div>
        <div className="builder-three-cols">
          <label className="label">
            Chế độ
            <select className="input" name="mode" defaultValue="BLUEPRINT">
              <option value="BLUEPRINT">Outline / blueprint</option>
              <option value="FULL_COURSE">Khóa học đầy đủ</option>
              <option value="QUESTIONS">Bộ câu hỏi</option>
              <option value="ESSAY_SET">Bộ bài luận</option>
              <option value="INTERVIEW_SET">Bộ phỏng vấn</option>
            </select>
          </label>
          <label className="label">
            Hành động sau khi áp dụng
            <select
              className="input"
              name="outputAction"
              defaultValue="PREVIEW"
            >
              <option value="PREVIEW">Chỉ xem trước</option>
              <option value="SAVE_DRAFT">Lưu bản nháp</option>
              <option value="SUBMIT_REVIEW">Gửi duyệt</option>
              <option value="PUBLISH">Xuất bản khi được phép</option>
            </select>
          </label>
          <label className="label">
            Ngôn ngữ
            <select className="input" name="language" defaultValue="vi">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <label className="label">
          Giọng điệu
          <input
            className="input"
            name="tone"
            defaultValue="Rõ ràng, thực tế, dễ học"
          />
        </label>

        <fieldset className="card inset-card">
          <legend>
            <b>Tài liệu nguồn</b>
          </legend>

          <label className="label">
            Tải tài liệu mới ngay tại đây
            <input
              className="input"
              type="file"
              name="files"
              accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
            />
            <span className="muted">
              Hỗ trợ TXT, Markdown, PDF và DOCX. Tối đa 3 tệp, tổng dung lượng 5
              MB. File mới sẽ tự được trích xuất, chia đoạn, lưu thành nguồn và
              gắn vào generation job hiện tại.
            </span>
          </label>

          {sources.length > 0 && (
            <>
              <div style={{ marginTop: '1rem' }}>
                <b>Hoặc chọn thêm nguồn đã có</b>
                <p className="muted">
                  Có thể kết hợp file vừa tải với các nguồn READY trước đó.
                </p>
              </div>
              <div className="grid">
                {sources.map((source) => (
                  <label className="check-row" key={source.id}>
                    <input type="checkbox" name="sourceIds" value={source.id} />
                    {source.title}{' '}
                    <span className="muted">· {source.sourceType}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </fieldset>

        <p className="muted">
          Nội dung AI được lưu thành job trước. Admin xem output rồi chủ động áp
          dụng; không tự động ghi đè chỉnh sửa thủ công.
        </p>
        <button className="btn" disabled={!configured}>
          Chạy generation job
        </button>
      </form>
      {configured && <LessonGenerationPanel />}
    </>
  );
}
