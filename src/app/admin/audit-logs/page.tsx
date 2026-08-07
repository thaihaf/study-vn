import { requirePermission } from '@/modules/auth/session';
import { db } from '@/lib/db';
export default async function Logs() {
  await requirePermission('audit:read');
  const logs = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Nhật ký kiểm toán</h1>
      {logs.map((l) => (
        <div className="card" key={l.id}>
          <b>{l.action}</b> · {l.entityType}/{l.entityId}
          <br />
          <span className="muted">
            {l.actor.email} · {l.createdAt.toISOString()} · request{' '}
            {l.requestId ?? '—'}
          </span>
        </div>
      ))}
    </>
  );
}
