import Link from 'next/link';

import { db } from '@/lib/db';
import { t } from '@/lib/i18n';

export default async function Home() {
  const courses = await db.course.findMany({
    where: {
      visibility: 'PUBLIC',
      currentPublishedVersionId: { not: null },
    },
    take: 3,
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <>
      <section className="hero home-hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="status">Học có định hướng · Không gây áp lực</span>
            <h1>
              Biến mục tiêu thành một{' '}
              <span className="hero-accent">lộ trình rõ ràng.</span>
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
                {t('register')}
              </Link>
            </div>
            <div className="hero-proof" aria-label="Điểm nổi bật">
              <div className="hero-proof-item">
                <strong>Roadmap rõ ràng</strong>
                <span>Biết bài tiếp theo cần học</span>
              </div>
              <div className="hero-proof-item">
                <strong>Luyện tập có phản hồi</strong>
                <span>Nhìn ra phần kiến thức yếu</span>
              </div>
              <div className="hero-proof-item">
                <strong>Tiến độ liền mạch</strong>
                <span>Quay lại đúng nơi đang học</span>
              </div>
            </div>
          </div>

          <aside
            className="hero-roadmap card"
            aria-label="Minh họa lộ trình học"
          >
            <div className="roadmap-heading">
              <div>
                <small>Lộ trình hôm nay</small>
                <strong>Phát triển phần mềm</strong>
              </div>
              <span className="status">68%</span>
            </div>
            <div className="roadmap-progress" aria-hidden="true">
              <span />
            </div>
            <div className="roadmap-list">
              <div className="roadmap-row">
                <span className="roadmap-dot">✓</span>
                <div>
                  <strong>Nền tảng cốt lõi</strong>
                  <div className="muted">Hoàn thành · 6 bài</div>
                </div>
              </div>
              <div className="roadmap-row active">
                <span className="roadmap-dot">2</span>
                <div>
                  <strong>Thiết kế và dữ liệu</strong>
                  <div className="muted">Đang học · bài 4/7</div>
                </div>
              </div>
              <div className="roadmap-row">
                <span className="roadmap-dot">3</span>
                <div>
                  <strong>Thực hành &amp; đánh giá</strong>
                  <div className="muted">Tiếp theo · 5 bài</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="home-section container">
        <div className="section-heading">
          <div>
            <span className="status">Học ngay</span>
            <h2>Khóa học nổi bật</h2>
          </div>
          <p className="muted">
            Nội dung được tổ chức theo lộ trình để bạn tập trung vào đúng phần
            cần học tiếp theo.
          </p>
        </div>
        <div className="course-grid">
          {courses.length ? (
            courses.map((course) => (
              <Link
                className="card course-card"
                href={`/courses/${course.slug}`}
                key={course.id}
              >
                <span className="status">{course.level}</span>
                <h3>{course.title}</h3>
                <p className="muted">{course.shortDescription}</p>
                <span className="course-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))
          ) : (
            <div className="card muted">{t('emptyCourses')}</div>
          )}
        </div>
      </section>

      <section className="home-section container">
        <div className="section-heading">
          <div>
            <span className="status">Cách học</span>
            <h2>Một nhịp học dễ duy trì</h2>
          </div>
          <p className="muted">
            Không cần học lan man. Mỗi bước đều cho bạn biết mình đang ở đâu và
            nên làm gì tiếp theo.
          </p>
        </div>
        <div className="journey-grid">
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
            <article className="card journey-card" key={item[0]}>
              <span className="journey-number">{item[0]}</span>
              <h3>{item[1]}</h3>
              <p className="muted">{item[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container card home-cta">
        <div className="section-heading">
          <div>
            <h2>Bắt đầu từ mục tiêu bạn đang có.</h2>
            <p className="muted">
              Chọn một khóa học, lưu tiến độ và quay lại đúng bài đang học.
            </p>
          </div>
          <Link className="btn" href="/explore">
            Xem tất cả khóa học
          </Link>
        </div>
      </section>
    </>
  );
}
