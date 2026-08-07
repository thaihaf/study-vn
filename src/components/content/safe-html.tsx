'use client';

import createDOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

const sanitizeOptions = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
};

export function SafeHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const [clean, setClean] = useState('');

  useEffect(() => {
    const purifier = createDOMPurify(window);
    setClean(purifier.sanitize(html, sanitizeOptions));
  }, [html]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
  );
}
