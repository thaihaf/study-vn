import Link from 'next/link';

export const metadata = { title: 'Khám phá' };

export default function Explore() {
  return (
    <div className="container page">
      <h1 style={{ fontSize: '2.6rem' }}>Khám phá lộ trình</h1>
      <p className="muted">
        Giao diện khám phá đã sẵn sàng. Các khóa học sẽ xuất hiện sau khi cơ sở
        dữ liệu được kết nối.
      </p>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}
      >
        <div className="card muted">
          Chưa có khóa học được xuất bản trong chế độ giao diện tạm thời.
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <Link className="btn secondary" href="/">
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}
