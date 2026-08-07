import Link from 'next/link';
import { requireUser } from '@/modules/auth/session';
import { isAdmin } from '@/modules/auth/permissions';
import { notFound } from 'next/navigation';
const links = [
  ['/admin', 'Tổng quan'],
  ['/admin/courses', 'Khóa học'],
  ['/admin/generate', 'Tạo bằng AI'],
  ['/admin/generation-jobs', 'AI jobs'],
  ['/admin/sources', 'Nguồn'],
  ['/admin/questions', 'Câu hỏi'],
  ['/admin/assessments', 'Bài thi'],
  ['/admin/interviews', 'Phỏng vấn'],
  ['/admin/reviews', 'Duyệt'],
  ['/admin/users', 'Người dùng'],
  ['/admin/audit-logs', 'Nhật ký'],
  ['/admin/settings', 'Cài đặt'],
];
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (!isAdmin(user.role)) notFound();
  return (
    <div className="admin-shell">
      <nav className="sidebar" aria-label="Quản trị">
        {links.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="page" style={{ paddingInline: 'clamp(1rem,4vw,3rem)' }}>
        {children}
      </div>
    </div>
  );
}
