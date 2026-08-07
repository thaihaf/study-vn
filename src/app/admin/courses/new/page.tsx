import { createCourse } from '@/app/actions';
import { createCourseFromDocuments } from '@/modules/courses/create-from-documents';
import { requirePermission } from '@/modules/auth/session';

export default async function NewCourse() {
  await requirePermission('course:edit');
  const aiConfigured =
    process.env.AI_PROVIDER === 'fake' ||
    Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Khóa học mới</h1>
      <p className="muted">
        Tải tài liệu để AI nghiên cứu và tạo cấu trúc cùng nội dung khóa học,
        hoặc tạo một bản nháp thủ công.
      </p>

      <form className="card grid" action={createCourseFromDocuments}>
        <div>
          <span className="status">AI + TÀI LIỆU</span>
          <h2>Tạo khóa học từ tài liệu</h2>
          <p className="muted">
            Hỗ trợ TXT, Markdown, PDF và DOCX. Có thể chọn tối đa 3 tệp, tổng
            dung lượng tối đa 5 MB. Tài liệu sẽ được trích xuất, chia thành các
            đoạn và dùng làm nguồn cho AI.
          </p>
        </div>

        {!aiConfigured && (
          <div className="card warning-card">
            AI chưa được cấu hình. Cần <code>OPENAI_API_KEY</code> và{' '}
            <code>OPENAI_MODEL</code>, hoặc <code>AI_PROVIDER=fake</code> để kiểm
            thử.
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
            AI sẽ ưu tiên kiến thức có trong các tài liệu này khi tạo bài học.
          </span>
        </label>

        <label className="label">
          Tên khóa học
          <input
            className="input"
            name="title"
            required
            minLength={3}
            placeholder="Ví dụ: Ôn thi Chuyên viên CNTT Agribank"
          />
        </label>

        <label className="label">
          Mục tiêu / mô tả khóa học
          <textarea
            className="input"
            name="description"
            rows={4}
            required
            minLength={10}
            placeholder="Mô tả AI cần tập trung vào kiến thức nào và người học cần đạt được gì…"
          />
        </label>

        <div className="builder-two-cols">
          <label className="label">
            Danh mục
            <input className="input" name="category" required />
          </label>
          <label className="label">
            Trình độ
            <select className="input" name="level" defaultValue="Trung cấp">
              <option>Cơ bản</option>
              <option>Trung cấp</option>
              <option>Nâng cao</option>
            </select>
          </label>
        </div>

        <div className="builder-three-cols">
          <label className="label">
            Đối tượng học
            <input
              className="input"
              name="audience"
              placeholder="Ví dụ: Developer 2-3 năm kinh nghiệm"
            />
          </label>
          <label className="label">
            Kết quả mong muốn
            <input
              className="input"
              name="outcome"
              placeholder="Ví dụ: Đủ kiến thức làm bài và phỏng vấn"
            />
          </label>
          <label className="label">
            Quy mô khóa học
            <input
              className="input"
              name="duration"
              placeholder="Ví dụ: 8 bài, khoảng 4 giờ"
            />
          </label>
        </div>

        <p className="muted">
          Sau khi tạo, khóa học vẫn ở trạng thái bản nháp để bạn kiểm tra và sửa
          trước khi gửi duyệt hoặc xuất bản.
        </p>
        <button className="btn" disabled={!aiConfigured}>
          AI nghiên cứu tài liệu và tạo khóa học
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
