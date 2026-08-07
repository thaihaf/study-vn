'use client';

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { useFormStatus } from 'react-dom';

type ServerActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: ReactNode;
};

export function ServerActionButton({
  children,
  pendingLabel = 'Đang xử lý...',
  disabled,
  ...props
}: ServerActionButtonProps) {
  const { pending } = useFormStatus();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isDisabled = Boolean(disabled) || pending || !hydrated;

  return (
    <button
      {...props}
      type={props.type ?? 'submit'}
      disabled={isDisabled}
      aria-disabled={isDisabled}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
