import Link from 'next/link';

import { buttonClassName } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="page container" style={{ maxWidth: 680 }}>
      <section className="card grid">
        <span className="status">404</span>
        <h1 style={{ fontSize: '2rem' }}>Không tìm thấy trang.</h1>
        <p className="muted">
          Nội dung có thể đã được chuyển, lưu trữ hoặc bạn chưa có đường dẫn
          đúng.
        </p>
        <div>
          <Link className={buttonClassName()} href="/">
            Về trang chủ
          </Link>
        </div>
      </section>
    </div>
  );
}
