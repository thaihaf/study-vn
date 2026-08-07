import Link from 'next/link';

import { logout } from '@/app/actions';
import { auth } from '@/auth';
import { t } from '@/lib/i18n';
import { isAdmin } from '@/modules/auth/permissions';

export async function Header() {
  const session = await auth();

  return (
    <header className="nav">
      <nav className="nav-inner container" aria-label="Điều hướng chính">
        <Link className="brand" href="/">
          ◉ {t('brand')}
        </Link>
        <div className="nav-links">
          <Link href="/explore">{t('explore')}</Link>
          {session?.user && <Link href="/dashboard">{t('dashboard')}</Link>}
          {session?.user && isAdmin(session.user.role) && (
            <Link href="/admin">Quản trị</Link>
          )}
          {session?.user ? (
            <form action={logout}>
              <button className="btn secondary" type="submit">
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link className="btn keep" href="/login">
              {t('login')}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
