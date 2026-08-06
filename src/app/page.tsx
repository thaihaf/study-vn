import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="status">Học có định hướng · Không gây áp lực</span>
          <h1>
            Biến mục tiêu thành
            <br />
            một lộ trình rõ ràng.
          </h1>
          <p className="muted">
            Học từng bài, luyện tập có phản hồi và nhìn thấy phần kiến thức cần
            củng cố — trên một không gian yên tĩnh dành cho việc học dài hạn.
          </p>
          <div className="nav-links">
            <Link className="btn" href="/explore">
              Khám phá khóa học
            </Link>
            <Link className="btn secondary" href="/register">
              Tạo tài khoản
            </Link>
          </div>
        </div>
      </section>

      <section className="container page">
        <h2>Khóa học nổi bật</h2>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}
        >
          <div className="card muted">
            Giao diện đã sẵn sàng. Khóa học sẽ xuất hiện sau khi kết nối cơ sở
            dữ liệu.
          </div>
        </div>
      </section>

      <section className="container page">
        <h2>Một nhịp học dễ duy trì</h2>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}
        >
          {[
            [
              '01',
              'Chọn lộ trình',
              'Xem mục tiêu, thời lượng và cấu trúc trước khi bắt đầu.',
            ],
            [
              '02',
              'Học theo roadmap',
              'Đi từ nền tảng đến thực hành với ghi chú riêng.',
            ],
            [
              '03',
              'Luyện và cải thiện',
              'Ôn câu sai, theo dõi chủ đề yếu, luyện bài luận và phỏng vấn.',
            ],
          ].map((item) => (
            <article className="card" key={item[0]}>
              <b className="brand">{item[0]}</b>
              <h3>{item[1]}</h3>
              <p className="muted">{item[2]}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
