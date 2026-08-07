'use client';

import type { ButtonHTMLAttributes } from 'react';

export function ConfirmButton({
  message,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      {...props}
      type={props.type ?? 'submit'}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
        props.onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
