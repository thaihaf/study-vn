'use client';

import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? t('loggingIn') : t('login')}
    </Button>
  );
}
