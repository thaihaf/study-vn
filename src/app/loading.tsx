import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div
      className="page container"
      role="status"
      aria-live="polite"
      aria-label="Đang tải nội dung"
    >
      <div className="grid" style={{ maxWidth: 760 }}>
        <Skeleton style={{ width: 140, height: 28 }} />
        <Skeleton style={{ width: '72%', height: 54 }} />
        <Skeleton style={{ width: '94%', height: 20 }} />
        <Skeleton style={{ width: '86%', height: 20 }} />
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}
        >
          <Skeleton style={{ minHeight: 150 }} />
          <Skeleton style={{ minHeight: 150 }} />
          <Skeleton style={{ minHeight: 150 }} />
        </div>
      </div>
    </div>
  );
}
