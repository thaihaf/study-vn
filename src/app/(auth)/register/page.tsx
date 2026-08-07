import { register } from '@/app/actions';
export default function Register() {
  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <form className="card grid" action={register}>
        <h1 style={{ fontSize: '2rem' }}>Bắt đầu học</h1>
        <label className="label">
          Tên của bạn
          <input className="input" name="name" required />
        </label>
        <label className="label">
          Email
          <input className="input" name="email" type="email" required />
        </label>
        <label className="label">
          Mật khẩu (từ 8 ký tự)
          <input
            className="input"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </label>
        <button className="btn">Tạo tài khoản</button>
      </form>
    </div>
  );
}
