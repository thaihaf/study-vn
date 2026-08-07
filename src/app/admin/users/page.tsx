import { db } from '@/lib/db';
import { requirePermission } from '@/modules/auth/session';
import { updateUserRole } from '@/modules/users/actions';

const roles = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'REVIEWER', 'INSTRUCTOR', 'LEARNER'] as const;

export default async function Users() {
  await requirePermission('user:roles');
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <h1 style={{ fontSize: '2.5rem' }}>Người dùng và vai trò</h1>
      <p className="muted">Quyền luôn được kiểm tra ở server; việc ẩn nút chỉ là phần giao diện.</p>
      <div className="card table-scroll">
        <table className="admin-table">
          <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Xuất bản</th><th>Thao tác</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name ?? user.email}<br /><span className="muted">{user.email}</span></td>
                <td colSpan={3}>
                  <form className="builder-row" action={updateUserRole}>
                    <input type="hidden" name="userId" value={user.id} />
                    <select className="input" name="role" defaultValue={user.role} aria-label={`Vai trò của ${user.email}`}>
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <label className="check-row">
                      <input type="checkbox" name="canPublish" defaultChecked={user.canPublish} />
                      Có quyền publish
                    </label>
                    <button className="btn secondary">Cập nhật</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
