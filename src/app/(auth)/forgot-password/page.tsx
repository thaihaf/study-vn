import { requestPasswordReset } from '@/modules/auth/password-actions';

export default async function Forgot({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  return (
    <div className="container page" style={{ maxWidth: 480 }}>
      <form className="card grid" action={requestPasswordReset}>
        <h1 style={{ fontSize: '2rem' }}>Đặt lại mật khẩu</h1>
        {sent === '1' ? (
          <div className="card">
            Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.
          </div>
        ) : (
          <p className="muted">
            Nhập email của bạn. Liên kết chỉ dùng được một lần và hết hạn sau 60 phút.
          </p>
        )}
        <label className="label">
          Email
          <input className="input" name="email" type="email" required autoComplete="email" />
        </label>
        <button className="btn">Gửi hướng dẫn</button>
      </form>
    </div>
  );
}
