'use client';

import { useFormStatus } from 'react-dom';

import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/ui/button';

export function SubmitButton({
  idleLabel,
  pendingLabel = 'Đang xử lý…',
  variant = 'primary',
  size = 'default',
}: {
  idleLabel: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
