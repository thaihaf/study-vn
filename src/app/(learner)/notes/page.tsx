import { requireUser } from '@/modules/auth/session';
import { db } from '@/lib/db';
export default async function Page() {
  const u = await requireUser();
  const rows = await db.userNote.findMany({
    where: { userId: u.id },
    include: { lesson: true },
    orderBy: { updatedAt: 'desc' },
  });
  return (
    <div className="page container">
      <h1 style={{ fontSize: '2.5rem' }}>Ghi chú riêng</h1>
      {rows.map((x) => (
        <article className="card" key={x.id}>
          <b>{x.lesson.title}</b>
          <p>{x.content}</p>
          <small>{x.updatedAt.toLocaleString('vi')}</small>
        </article>
      ))}
      {!rows.length && (
        <div className="card muted">Ghi chú của bạn chỉ hiển thị tại đây.</div>
      )}
    </div>
  );
}
