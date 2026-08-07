import Link from 'next/link';

import { logout } from '@/app/actions';
import { auth } from '@/auth';
import { buttonClassName } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { isAdmin } from '@/modules/auth/permissions';

export async function Header() {
  const session = await auth();

  return (
    <header className="nav">
      <nav className="nav-inner container" aria-label={t('mainNavigation')}>
        <Link className="brand brand-lockup" href="/">
          {t('brand')}
        </Link>
        <div className="nav-links">
          <Link href="/explore">{t('explore')}</Link>
          {session?.user && <Link href="/dashboard">{t('dashboard')}</Link>}
          {session?.user && isAdmin(session.user.role) && (
            <Link href="/admin">{t('admin')}</Link>
          )}
          {session?.user ? (
            <form action={logout}>
              <button className={buttonClassName('secondary')} type="submit">
                {t('logout')}
              </button>
            </form>
          ) : (
            <Link
              className={buttonClassName('primary', 'default', 'keep')}
              href="/login"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
