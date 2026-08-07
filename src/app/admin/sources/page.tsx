import { ConfirmButton } from '@/components/shared/confirm-button';
import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import {
  archiveSource,
  createTextSource,
  uploadSource,
} from '@/modules/sources/actions';
import {
  deleteArchivedSource,
  updateSourceChunk,
  updateSourceMetadata,
} from '@/modules/sources/management-actions';
import { retrieveSourceChunks } from '@/modules/sources/retrieval';

function SourceMetadataFields() {
  return (
    <>
      <div className="builder-two-cols">
        <label className="label">
          Tác giả
          <input className="input" name="author" />
        </label>
        <label className="label">
          Nhà xuất bản
          <input className="input" name="publisher" />
        </label>
      </div>
      <label className="label">
        Độ tin cậy
        <select className="input" name="reliabilityLevel" defaultValue="3">
          <option value="1">1 - Tham khảo thấp</option>
          <option value="2">2</option>
          <option value="3">3 - Trung bình</option>
          <option value="4">4</option>
          <option value="5">5 - Nguồn ưu tiên</option>
        </select>
      </label>
      <label className="label">
        Ghi chú bản quyền
        <textarea className="input" name="copyrightNote" rows={2} />
      </label>
    </>
  );
}

export default async function Sources({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission('source:manage');
  const { q = '' } = await searchParams;
  const sources = await db.source.findMany({
    include: {
      chunks: { orderBy: { position: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const searchResults = q.trim()
    ? await retrieveSourceChunks(db, q, [], 30)
    : [];

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Tài liệu nguồn</h1>
      <p className="muted">
        Nguồn được coi là dữ liệu không tin cậy. AI chỉ dùng nội dung làm tài
        liệu tham khảo, không thực thi chỉ dẫn nằm trong tài liệu.
      </p>

      <form className="card builder-row" method="get">
        <label className="label" style={{ flex: 1 }}>
          Tìm trong các chunk bằng PostgreSQL full-text search
          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="Nhập cụm từ cần tìm…"
          />
        </label>
        <button className="btn secondary">Tìm</button>
      </form>
      {q.trim() && (
        <section className="card">
          <h2>Kết quả tìm kiếm</h2>
          {searchResults.map((chunk) => {
            const source = sources.find((item) => item.id === chunk.sourceId);
            return (
              <p key={chunk.id}>
                <b>{source?.title ?? 'Nguồn'}</b> · đoạn {chunk.position + 1}
                {chunk.pageNumber ? ` · trang ${chunk.pageNumber}` : ''}
                <br />
                <span className="muted">{chunk.text.slice(0, 500)}</span>
              </p>
            );
          })}
          {!searchResults.length && (
            <p className="muted">Không tìm thấy chunk phù hợp.</p>
          )}
        </section>
      )}

      <div className="builder-two-cols">
        <form className="card grid" action={uploadSource}>
          <h2>Tải tệp</h2>
          <label className="label">
            Tiêu đề
            <input className="input" name="title" required />
          </label>
          <label className="label">
            Loại
            <select className="input" name="sourceType">
              <option value="OFFICIAL_DOCUMENT">Tài liệu chính thức</option>
              <option value="OFFICIAL_PUBLICATION">Ấn phẩm chính thức</option>
              <option value="THIRD_PARTY_MATERIAL">Tài liệu bên thứ ba</option>
              <option value="ADMIN_WRITTEN">Quản trị tự viết</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <SourceMetadataFields />
          <label className="label">
            Tệp TXT, Markdown, PDF hoặc DOCX
            <input
              className="input"
              type="file"
              name="file"
              accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
            />
          </label>
          <button className="btn">Tải lên và trích xuất</button>
        </form>

        <form className="card grid" action={createTextSource}>
          <h2>Dán nội dung</h2>
          <label className="label">
            Tiêu đề
            <input className="input" name="title" required />
          </label>
          <label className="label">
            Loại
            <select className="input" name="sourceType">
              <option value="ADMIN_WRITTEN">Quản trị tự viết</option>
              <option value="WEB_REFERENCE">Tham khảo web</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <SourceMetadataFields />
          <label className="label">
            URL tham khảo (không bắt buộc)
            <input className="input" type="url" name="referenceUrl" />
          </label>
          <label className="label">
            Nội dung
            <textarea
              className="input"
              name="text"
              rows={8}
              minLength={10}
              required
            />
          </label>
          <button className="btn secondary">Lưu nguồn văn bản</button>
        </form>
      </div>

      <h2>Nguồn đã xử lý</h2>
      <div className="grid">
        {sources.map((source) => (
          <article className="card" key={source.id}>
            <div className="builder-row">
              <div>
                <span className="status">
                  {source.processingStatus}
                  {source.archivedAt ? ' · ARCHIVED' : ''}
                </span>
                <h3>{source.title}</h3>
              </div>
              <div className="builder-actions">
                {!source.archivedAt && (
                  <form action={archiveSource}>
                    <input type="hidden" name="sourceId" value={source.id} />
                    <ConfirmButton
                      className="btn danger compact"
                      message="Lưu trữ nguồn này? Citation của nội dung đã xuất bản vẫn được giữ."
                    >
                      Lưu trữ
                    </ConfirmButton>
                  </form>
                )}
                {source.archivedAt && (
                  <form action={deleteArchivedSource}>
                    <input type="hidden" name="sourceId" value={source.id} />
                    <ConfirmButton
                      className="btn danger compact"
                      message="Xóa nguồn đã lưu trữ? Thao tác bị chặn nếu nguồn đang được trích dẫn."
                    >
                      Xóa nếu không được trích dẫn
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>
            <p>
              {source.originalFilename} · {source.size.toLocaleString('vi')}{' '}
              byte · {source.chunks.length} chunk · độ tin cậy{' '}
              {source.reliabilityLevel}/5
            </p>
            <p className="muted">
              {source.author || 'Không rõ tác giả'}
              {source.publisher ? ` · ${source.publisher}` : ''}
              {source.copyrightNote ? ` · ${source.copyrightNote}` : ''}
            </p>

            <details>
              <summary>
                <b>Sửa metadata</b>
              </summary>
              <form className="grid" action={updateSourceMetadata}>
                <input type="hidden" name="sourceId" value={source.id} />
                <label className="label">
                  Tiêu đề
                  <input
                    className="input"
                    name="title"
                    defaultValue={source.title}
                    required
                  />
                </label>
                <div className="builder-two-cols">
                  <label className="label">
                    Tác giả
                    <input
                      className="input"
                      name="author"
                      defaultValue={source.author ?? ''}
                    />
                  </label>
                  <label className="label">
                    Nhà xuất bản
                    <input
                      className="input"
                      name="publisher"
                      defaultValue={source.publisher ?? ''}
                    />
                  </label>
                </div>
                <label className="label">
                  Độ tin cậy
                  <input
                    className="input"
                    type="number"
                    name="reliabilityLevel"
                    min={1}
                    max={5}
                    defaultValue={source.reliabilityLevel}
                  />
                </label>
                <label className="label">
                  Bản quyền
                  <textarea
                    className="input"
                    name="copyrightNote"
                    defaultValue={source.copyrightNote ?? ''}
                  />
                </label>
                <button className="btn secondary">Lưu metadata</button>
              </form>
            </details>

            <details>
              <summary>
                <b>Kiểm tra và sửa chunks ({source.chunks.length})</b>
              </summary>
              <div className="grid">
                {source.chunks.map((chunk) => (
                  <form
                    className="card inset-card grid"
                    action={updateSourceChunk}
                    key={chunk.id}
                  >
                    <input type="hidden" name="chunkId" value={chunk.id} />
                    <b>Đoạn #{chunk.position + 1}</b>
                    <div className="builder-two-cols">
                      <label className="label">
                        Trang
                        <input
                          className="input"
                          type="number"
                          min={1}
                          name="pageNumber"
                          defaultValue={chunk.pageNumber ?? ''}
                        />
                      </label>
                      <label className="label">
                        Section
                        <input
                          className="input"
                          name="section"
                          defaultValue={chunk.section ?? ''}
                        />
                      </label>
                    </div>
                    <label className="label">
                      Nội dung chunk
                      <textarea
                        className="input"
                        name="text"
                        rows={6}
                        defaultValue={chunk.text}
                        required
                      />
                    </label>
                    <button className="btn secondary compact">
                      Lưu correction
                    </button>
                  </form>
                ))}
              </div>
            </details>
          </article>
        ))}
        {!sources.length && <div className="card muted">Chưa có nguồn.</div>}
      </div>
    </>
  );
}
