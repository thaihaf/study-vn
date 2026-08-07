'use client';

import { useFormStatus } from 'react-dom';

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Đang đăng nhập...' : 'Đăng nhập'}
    </button>
  );
}
