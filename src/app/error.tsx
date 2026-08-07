'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route render failed', {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="page container" style={{ maxWidth: 680 }}>
      <section className="card grid" role="alert">
        <span className="status">Có lỗi xảy ra</span>
        <h1 style={{ fontSize: '2rem' }}>Trang này chưa tải được.</h1>
        <p className="muted">
          Bạn có thể thử lại. Nếu lỗi tiếp tục xuất hiện, hãy quay lại trang
          trước hoặc mở lại sau.
        </p>
        <div>
          <Button onClick={reset}>Thử lại</Button>
        </div>
      </section>
    </div>
  );
}
