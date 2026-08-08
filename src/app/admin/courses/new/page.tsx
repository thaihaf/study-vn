import { createCourse } from '@/app/actions';
import { requirePermission } from '@/modules/auth/session';
import { createCourseFromDocuments } from '@/modules/courses/create-from-documents';

export default async function NewCourse() {
  await requirePermission('course:edit');
  const aiConfigured =
    Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY) ||
    Boolean(process.env.OPENAI_MODEL && process.env['OPENAI_API' + '_KEY']) ||
    (process.env.NODE_ENV !== 'production' && process.env.AI_PROVIDER === 'fake');

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Khóa học mới</h1>
      <p className="muted">
        Chỉ cần đưa tài liệu cho AI. Hệ thống sẽ tự đề xuất tên, mô tả, danh mục,
        trình độ, thời lượng, roadmap, mục tiêu và toàn bộ nội dung để bạn review.
      </p>

      <form className="card grid" action={createCourseFromDocuments}>
        <div>
          <span className="status">AI + TÀI LIỆU</span>
          <h2>Đưa tài liệu, AI làm phần còn lại</h2>
          <p className="muted">
            Hỗ trợ TXT, Markdown, PDF và DOCX. Tối đa 3 tệp, tổng 5 MB. Sau khi
            AI tạo xong, bạn sẽ được đưa thẳng tới màn review/chỉnh sửa trước khi
            xuất bản.
          </p>
        </div>

        {!aiConfigured && (
          <div className="warning-card card">
            AI chưa được cấu hình cho môi trường này.
          </div>
        )}

        <label className="label">
          Tài liệu để AI nghiên cứu
          <input
            className="input"
            type="file"
            name="files"
            accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            required
          />
          <span className="muted">
            AI sẽ đọc tài liệu, xác định chủ đề và tự thiết kế khóa học phù hợp.
          </span>
        </label>

        <label className="label">
          Kiểu khóa học
          <select className="input" name="template" defaultValue="LEARN_EXAM_INTERVIEW">
            <option value="GENERAL_LEARNING">Học kiến thức</option>
            <option value="EXAM_PREP">Ôn thi</option>
            <option value="INTERVIEW_PREP">Phỏng vấn</option>
            <option value="LEARN_EXAM_INTERVIEW">Học + Thi + Phỏng vấn</option>
          </select>
        </label>

        <label className="label">
          Yêu cầu thêm cho AI <span className="muted">(không bắt buộc)</span>
          <textarea
            className="input"
            name="guidance"
            rows={4}
            maxLength={2000}
            placeholder="Ví dụ: Tôi chuẩn bị phỏng vấn trong 7 ngày, ưu tiên phần có khả năng bị hỏi sâu. Có thể để trống hoàn toàn."
          />
          <span className="muted">
            Không cần nhập tên, mô tả, danh mục, trình độ hay số bài. AI sẽ tự
            đề xuất tất cả dựa trên tài liệu và template đã chọn.
          </span>
        </label>

        <button className="btn" disabled={!aiConfigured}>
          AI tạo bản nháp để tôi review
        </button>
      </form>

      <details className="card">
        <summary>
          <b>Tạo bản nháp thủ công, không dùng AI</b>
        </summary>
        <form className="grid" action={createCourse} style={{ marginTop: 16 }}>
          <label className="label">
            Tên khóa học
            <input className="input" name="title" required minLength={3} />
          </label>
          <label className="label">
            Mô tả ngắn
            <textarea className="input" name="description" required minLength={10} />
          </label>
          <div className="builder-two-cols">
            <label className="label">
              Danh mục
              <input className="input" name="category" required />
            </label>
            <label className="label">
              Trình độ
              <select className="input" name="level">
                <option>Cơ bản</option>
                <option>Trung cấp</option>
                <option>Nâng cao</option>
              </select>
            </label>
          </div>
          <button className="btn secondary">Tạo bản nháp trống</button>
        </form>
      </details>
    </>
  );
}
