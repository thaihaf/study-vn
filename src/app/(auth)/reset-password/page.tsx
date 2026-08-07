import Link from 'next/link';

import { resetPassword } from '@/modules/auth/password-actions';

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="page container" style={{ maxWidth: 480 }}>
        <div className="card grid">
          <h1 style={{ fontSize: '2rem' }}>Liên kết không hợp lệ</h1>
          <p>Liên kết đặt lại mật khẩu không có token.</p>
          <Link className="btn" href="/forgot-password">
            Yêu cầu liên kết mới
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <form className="card grid" action={resetPassword}>
        <h1 style={{ fontSize: '2rem' }}>Mật khẩu mới</h1>
        <input type="hidden" name="token" value={token} />
        <label className="label">
          Mật khẩu mới
          <input
            className="input"
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="label">
          Nhập lại mật khẩu
          <input
            className="input"
            name="confirmPassword"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <p className="muted">Tối thiểu 12 ký tự.</p>
        <button className="btn">Đổi mật khẩu</button>
      </form>
    </div>
  );
}
