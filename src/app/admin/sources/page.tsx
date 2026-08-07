import { ConfirmButton } from '@/components/shared/confirm-button';
import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { archiveSource, createTextSource, uploadSource } from '@/modules/sources/actions';

export default async function Sources() {
  await requirePermission('source:manage');
  const sources = await db.source.findMany({ include: { chunks: true }, orderBy: { createdAt: 'desc' } });
  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Tài liệu nguồn</h1>
      <p className="muted">Nguồn được coi là dữ liệu không tin cậy. AI không được phép thực thi chỉ dẫn nằm trong tài liệu.</p>
      <div className="builder-two-cols">
        <form className="card grid" action={uploadSource}>
          <h2>Tải tệp</h2>
          <label className="label">Tiêu đề<input className="input" name="title" required /></label>
          <label className="label">Loại<select className="input" name="sourceType"><option value="OFFICIAL_DOCUMENT">Tài liệu chính thức</option><option value="OFFICIAL_PUBLICATION">Ấn phẩm chính thức</option><option value="THIRD_PARTY_MATERIAL">Tài liệu bên thứ ba</option><option value="ADMIN_WRITTEN">Quản trị tự viết</option><option value="OTHER">Khác</option></select></label>
          <label className="label">Tệp TXT, Markdown, PDF hoặc DOCX<input className="input" type="file" name="file" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required /></label>
          <button className="btn">Tải lên và trích xuất</button>
        </form>
        <form className="card grid" action={createTextSource}>
          <h2>Dán nội dung</h2>
          <label className="label">Tiêu đề<input className="input" name="title" required /></label>
          <label className="label">Loại<select className="input" name="sourceType"><option value="ADMIN_WRITTEN">Quản trị tự viết</option><option value="WEB_REFERENCE">Tham khảo web</option><option value="OTHER">Khác</option></select></label>
          <label className="label">URL tham khảo (không bắt buộc)<input className="input" type="url" name="referenceUrl" /></label>
          <label className="label">Nội dung<textarea className="input" name="text" rows={8} minLength={10} required /></label>
          <button className="btn secondary">Lưu nguồn văn bản</button>
        </form>
      </div>
      <h2>Nguồn đã xử lý</h2>
      <div className="grid">
        {sources.map((source) => (
          <article className="card" key={source.id}>
            <div className="builder-row">
              <div><span className="status">{source.processingStatus}{source.archivedAt ? ' · ARCHIVED' : ''}</span><h3>{source.title}</h3></div>
              {!source.archivedAt && <form action={archiveSource}><input type="hidden" name="sourceId" value={source.id} /><ConfirmButton className="btn danger compact" message="Lưu trữ nguồn này? Các citation cũ vẫn được giữ.">Lưu trữ</ConfirmButton></form>}
            </div>
            <p>{source.originalFilename} · {source.size.toLocaleString('vi')} byte · {source.chunks.length} chunk</p>
            <details><summary>Kiểm tra chunks</summary>{source.chunks.slice(0, 20).map((chunk) => <p key={chunk.id}><b>#{chunk.position + 1}</b> {chunk.text}</p>)}</details>
          </article>
        ))}
        {!sources.length && <div className="card muted">Chưa có nguồn.</div>}
      </div>
    </>
  );
}
