import Link from 'next/link';

import { applyGenerationJob } from '@/modules/ai/actions';
import { applyLessonGeneration } from '@/modules/ai/lesson-actions';
import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';

export default async function Jobs({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  await requirePermission('ai:generate');
  const { job: selectedJobId } = await searchParams;
  const jobs = await db.generationJob.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { artifacts: true },
  });

  return (
    <>
      <div className="builder-page-heading">
        <div><h1 style={{ fontSize: '2.5rem' }}>AI generation jobs</h1><p className="muted">Output luôn được lưu để xem trước trước khi áp dụng vào nội dung thật.</p></div>
        <Link className="btn" href="/admin/generate">+ Generation mới</Link>
      </div>
      <div className="grid">
        {jobs.map((job) => {
          const lessonApplied = job.kind === 'LESSON' && job.targetEntityId?.startsWith('applied:');
          return (
            <article className={job.id === selectedJobId ? 'card selected-job' : 'card'} key={job.id}>
              <div className="builder-row"><div><span className="status">{job.status}</span><h3>{job.kind} · {job.model}</h3></div><small>{job.createdAt.toLocaleString('vi')}</small></div>
              <p>{job.userPrompt}</p>
              {job.errorMessage && <><p className="error-text">⛔ {job.errorMessage}</p><details><summary>Chi tiết kỹ thuật</summary><code>{job.errorCode}</code></details></>}
              {job.outputSnapshot && <details open={job.id === selectedJobId}><summary><b>Xem output có cấu trúc</b></summary><pre className="code-block"><code>{JSON.stringify(job.outputSnapshot, null, 2)}</code></pre></details>}
              {job.kind === 'LESSON' && job.artifacts[0] && <details><summary>So sánh với nội dung trước generation</summary><pre className="code-block"><code>{JSON.stringify(job.artifacts[0].payload, null, 2)}</code></pre></details>}
              <div className="builder-row">
                <small>Thử lại: {job.retryCount}</small>
                {job.status === 'SUCCEEDED' && job.outputSnapshot && job.kind === 'LESSON' && !lessonApplied && (
                  <form action={applyLessonGeneration}><input type="hidden" name="jobId" value={job.id} /><button className="btn">Áp dụng vào bài học</button></form>
                )}
                {job.status === 'SUCCEEDED' && job.outputSnapshot && !job.targetEntityId && job.kind !== 'LESSON' && (
                  <form action={applyGenerationJob}><input type="hidden" name="jobId" value={job.id} /><button className="btn">Áp dụng output</button></form>
                )}
                {(lessonApplied || (job.kind !== 'LESSON' && job.targetEntityId)) && <span className="status">Đã áp dụng</span>}
              </div>
            </article>
          );
        })}
      </div>
      {!jobs.length && <div className="card muted">Chưa có job.</div>}
    </>
  );
}
