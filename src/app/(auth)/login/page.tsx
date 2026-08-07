import Link from 'next/link';

import { login } from '@/modules/auth/credential-actions';
import { t } from '@/lib/i18n';

import { LoginSubmitButton } from './login-submit-button';

export default function Login() {
  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <form className="card grid" action={login}>
        <h1 style={{ fontSize: '2rem' }}>Chào bạn trở lại</h1>
        <label className="label">
          {t('email')}
          <input
            className="input"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>
        <label className="label">
          {t('password')}
          <input
            className="input"
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="current-password"
          />
        </label>
        <LoginSubmitButton />
        <Link className="muted" href="/forgot-password">
          {t('forgotPassword')}
        </Link>
        <Link href="/register">{t('noAccountRegister')}</Link>
      </form>
    </div>
  );
}
