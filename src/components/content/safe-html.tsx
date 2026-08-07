'use client';

import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export function SafeHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
      }),
    [html],
  );

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
  );
}
