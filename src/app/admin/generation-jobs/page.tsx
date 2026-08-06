import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';

export default async function Jobs() {
  await requirePermission('ai:generate');

  const jobs = await db.generationJob.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>AI generation jobs</h1>

      {jobs.map((job) => (
        <article className="card" key={job.id}>
          <span className="status">{job.status}</span>
          <h3>
            {job.kind} · {job.model}
          </h3>
          <p>{job.userPrompt}</p>

          {job.errorMessage && (
            <>
              <p>⛔ {job.errorMessage}</p>
              <details>
                <summary>Chi tiết kỹ thuật</summary>
                <code>{job.errorCode}</code>
              </details>
            </>
          )}

          {job.outputSnapshot && (
            <details>
              <summary>Output có thể chỉnh sửa</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(job.outputSnapshot, null, 2)}
              </pre>
            </details>
          )}

          <small>Thử lại: {job.retryCount}</small>
        </article>
      ))}

      {!jobs.length && <div className="card muted">Chưa có job.</div>}
    </>
  );
}
