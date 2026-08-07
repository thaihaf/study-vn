import { requirePermission } from '@/modules/auth/session';

export default async function Page() {
  const user = await requirePermission('user:roles');
  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Cài đặt hệ thống</h1>
      <div className="card">
        <h2>AI</h2>
        <p>
          Provider: {process.env.AI_PROVIDER ?? 'openai'} · Model:{' '}
          {process.env.OPENAI_MODEL ?? 'chưa cấu hình'} · API key:{' '}
          {process.env.OPENAI_API_KEY ? 'đã cấu hình' : 'chưa cấu hình'}
        </p>
        <p className="muted">
          Các giá trị nhạy cảm được quản lý bằng biến môi trường trên
          server/Vercel. Trang này không bao giờ hiển thị hoặc gửi API key tới
          trình duyệt.
        </p>
      </div>
      <div className="card">
        <h2>Password reset</h2>
        <p>
          Webhook giao email:{' '}
          {process.env.PASSWORD_RESET_WEBHOOK_URL
            ? 'đã cấu hình'
            : 'chưa cấu hình'}
        </p>
        <p className="muted">
          Ở local, liên kết reset được ghi vào log. Production nên cấu hình
          webhook tới nhà cung cấp email transactional.
        </p>
      </div>
      <div className="card">
        <h2>Phiên hiện tại</h2>
        <p>
          {user.role} · xuất bản:{' '}
          {user.canPublish ? 'có' : 'theo chính sách vai trò'}
        </p>
      </div>
    </>
  );
}
