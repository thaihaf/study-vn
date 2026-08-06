import Link from 'next/link';

import { t } from '@/lib/i18n';

export function Header() {
  return (
    <header className="nav">
      <nav className="container nav-inner" aria-label="Điều hướng chính">
        <Link className="brand" href="/">
          ◉ {t('brand')}
        </Link>
        <div className="nav-links">
          <Link href="/explore">{t('explore')}</Link>
          <Link className="btn keep" href="/login">
            {t('login')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
