'use client';

import type { CSSProperties, ReactNode } from 'react';

type RedirectActionResult = {
  redirectTo: string;
};

type RedirectAction = (formData: FormData) => Promise<RedirectActionResult>;

export function ActionRedirectForm({
  action,
  children,
  className,
  style,
}: {
  action: RedirectAction;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  async function submit(formData: FormData) {
    const result = await action(formData);
    window.location.assign(result.redirectTo);
  }

  return (
    <form action={submit} className={className} style={style}>
      {children}
    </form>
  );
}
