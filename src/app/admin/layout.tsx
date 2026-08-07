import Link from 'next/link';
import { notFound } from 'next/navigation';

import { t, type MessageKey } from '@/lib/i18n';
import { isAdmin } from '@/modules/auth/permissions';
import { requireUser } from '@/modules/auth/session';

const links: Array<[string, MessageKey]> = [
  ['/admin', 'adminOverview'],
  ['/admin/courses', 'adminCourses'],
  ['/admin/generate', 'adminGenerate'],
  ['/admin/generation-jobs', 'adminGenerationJobs'],
  ['/admin/sources', 'adminSources'],
  ['/admin/questions', 'adminQuestions'],
  ['/admin/assessments', 'adminAssessments'],
  ['/admin/interviews', 'adminInterviews'],
  ['/admin/reviews', 'adminReviews'],
  ['/admin/users', 'adminUsers'],
  ['/admin/audit-logs', 'adminAuditLogs'],
  ['/admin/settings', 'adminSettings'],
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
      <nav className="sidebar" aria-label={t('adminNavigation')}>
        <div className="sidebar-head">
          <strong>Không gian quản trị</strong>
          <span>{user.role.replaceAll('_', ' ')}</span>
        </div>
        {links.map(([href, key]) => (
          <Link key={href} href={href}>
            {t(key)}
          </Link>
        ))}
      </nav>
      <div className="admin-content">{children}</div>
    </div>
  );
}
