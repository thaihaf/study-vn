import Link from 'next/link';

import { logout } from '@/app/actions';
import { auth } from '@/auth';
import { t } from '@/lib/i18n';
import { isAdmin } from '@/modules/auth/permissions';

export async function Header() {
  const session = await auth().catch((error) => {
    console.error('Unable to load session for public navigation', error);
    return null;
  });

  return (
    <header className="nav">
      <nav className="container nav-inner" aria-label="Điều hướng chính">
        <Link className="brand" href="/">
          ◉ {t('brand')}
        </Link>
        <div className="nav-links">
          <Link href="/explore">{t('explore')}</Link>
          {session && <Link href="/dashboard">{t('dashboard')}</Link>}
          {session && isAdmin(session.user.role) && (
            <Link href="/admin">{t('admin')}</Link>
          )}
          {session ? (
            <form action={logout}>
              <button className="btn secondary" type="submit">
                {t('logout')}
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
