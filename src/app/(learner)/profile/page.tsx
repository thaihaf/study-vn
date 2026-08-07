import { requireUser } from '@/modules/auth/session';
export default async function Page() {
  const u = await requireUser();
  return (
    <div className="page container">
      <h1 style={{ fontSize: '2.5rem' }}>Hồ sơ</h1>
      <div className="card">
        <p>
          <b>{u.name}</b>
        </p>
        <p>{u.email}</p>
        <p>Mục tiêu ngày: 30 phút</p>
      </div>
    </div>
  );
}
