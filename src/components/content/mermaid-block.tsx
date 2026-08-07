'use client';

import mermaid from 'mermaid';
import { useEffect, useId, useState } from 'react';

export function MermaidBlock({ code }: { code: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'neutral',
    });
    void mermaid
      .render(id, code)
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvg('');
          setError('Không thể hiển thị sơ đồ Mermaid này.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (error) {
    return (
      <div className="card" role="alert">
        {error}
        <pre className="code-block">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-render"
      aria-label="Sơ đồ Mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
