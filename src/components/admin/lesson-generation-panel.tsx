import { db } from '@/lib/db';
import { generateLessonDraft } from '@/modules/ai/lesson-actions';

export async function LessonGenerationPanel() {
  const [draftVersions, sources] = await Promise.all([
    db.courseVersion.findMany({
      where: { status: 'DRAFT' },
      include: {
        course: true,
        modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    db.source.findMany({ where: { archivedAt: null, processingStatus: 'READY' }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const lessons = draftVersions.flatMap((version) =>
    version.modules.flatMap((courseModule) =>
      courseModule.lessons.map((lesson) => ({
        id: lesson.id,
        label: `${version.course.title} · ${courseModule.title} · ${lesson.title}`,
      })),
    ),
  );
  if (!lessons.length) return null;

  return (
    <details className="card">
      <summary><b>Tạo lại một bài học bằng AI</b></summary>
      <form className="grid" action={generateLessonDraft} style={{ marginTop: '1rem' }}>
        <label className="label">Bài học trong bản nháp<select className="input" name="lessonId" required defaultValue=""><option value="" disabled>Chọn bài học…</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}</select></label>
        <label className="label">Yêu cầu<textarea className="input" name="prompt" rows={5} minLength={10} required placeholder="Mô tả nội dung cần tạo lại. Các block đang khóa sẽ được giữ nguyên." /></label>
        {sources.length > 0 && <fieldset className="card inset-card"><legend><b>Nguồn tham khảo</b></legend>{sources.map((source) => <label className="check-row" key={source.id}><input type="checkbox" name="sourceIds" value={source.id} />{source.title}</label>)}</fieldset>}
        <p className="muted">Job tạo một preview riêng. Bạn xem diff/output trong AI jobs rồi mới bấm áp dụng. Block khóa không bị ghi đè.</p>
        <button className="btn secondary">Tạo preview bài học</button>
      </form>
    </details>
  );
}
