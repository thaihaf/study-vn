import { createCourse } from '@/app/actions';
import { hasRealAIConfiguration } from '@/modules/ai/openai-structured';
import { requirePermission } from '@/modules/auth/session';
import { createCourseFromDocuments } from '@/modules/courses/create-from-documents';

export default async function NewCourse() {
  await requirePermission('course:edit');
  const aiConfigured =
    hasRealAIConfiguration() ||
    (process.env.NODE_ENV !== 'production' && process.env.AI_PROVIDER === 'fake');

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Khóa học mới</h1>
      <p className="muted">
        Chỉ cần tải tài liệu lên. AI sẽ tự nghiên cứu, đặt tên, viết mô tả,
        xác định danh mục, trình độ, quy mô và xây dựng toàn bộ khóa học để bạn
        review trước khi xuất bản.
      </p>

      <form className="card grid" action={createCourseFromDocuments}>
        <div>
          <span className="status">AI + TÀI LIỆU</span>
          <h2 style={{ marginTop: '1rem' }}>Tạo khóa học tự động</h2>
          <p className="muted">
            Hỗ trợ TXT, Markdown, PDF và DOCX. Có thể chọn tối đa 3 tệp, tổng
            dung lượng tối đa 5 MB. AI sẽ dùng tài liệu làm nguồn kiến thức,
            tự quyết định metadata và cấu trúc phù hợp.
          </p>
        </div>

        {!aiConfigured && (
          <div className="warning-card card">
            AI thật chưa được cấu hình cho môi trường này. Hãy cấu hình Vercel
            AI Gateway hoặc OpenAI trước khi tạo khóa học từ tài liệu.
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
            Đây là thông tin bắt buộc duy nhất. AI sẽ tự suy ra tên khóa học,
            mục tiêu, đối tượng, trình độ và số lượng module/bài học.
          </span>
        </label>

        <label className="label">
          Yêu cầu thêm <span className="muted">(không bắt buộc)</span>
          <textarea
            className="input"
            name="guidance"
            rows={3}
            maxLength={2000}
            placeholder="Ví dụ: Tôi chuẩn bị phỏng vấn trong 2 tuần, ưu tiên phần thực hành và câu hỏi tình huống. Có thể để trống."
          />
          <span className="muted">
            Chỉ dùng khi bạn muốn AI ưu tiên một mục tiêu đặc biệt. Không cần
            mô tả lại nội dung đã có trong tài liệu.
          </span>
        </label>

        <input type="hidden" name="template" value="GENERAL_LEARNING" />

        <div className="card inset-card">
          <b>Sau khi AI hoàn tất</b>
          <p className="muted" style={{ marginBottom: 0 }}>
            Khóa học được lưu dưới dạng bản nháp. Bạn sẽ được chuyển thẳng sang
            màn hình review để kiểm tra và chỉnh sửa tên, mô tả, module, bài học
            và nội dung trước khi bấm Xuất bản.
          </p>
        </div>

        <button className="btn" disabled={!aiConfigured}>
          AI nghiên cứu tài liệu và tạo bản nháp
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
            <textarea
              className="input"
              name="description"
              required
              minLength={10}
            />
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
