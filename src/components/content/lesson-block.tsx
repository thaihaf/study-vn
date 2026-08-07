import hljs from 'highlight.js';
import Link from 'next/link';

import { MermaidBlock } from '@/components/content/mermaid-block';
import { SafeHtml } from '@/components/content/safe-html';

type Citation = {
  chunk: {
    id: string;
    position: number;
    section: string | null;
    source: { title: string };
  };
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function LessonBlockView({
  type,
  contentJson,
  citations = [],
}: {
  type: string;
  contentJson: unknown;
  citations?: Citation[];
}) {
  const content = record(contentJson);
  let body: React.ReactNode;

  switch (type) {
    case 'HEADING': {
      const text = String(content.text ?? '');
      const level = Number(content.level ?? 2);
      body =
        level === 4 ? (
          <h4>{text}</h4>
        ) : level === 3 ? (
          <h3>{text}</h3>
        ) : (
          <h2>{text}</h2>
        );
      break;
    }
    case 'PARAGRAPH':
      body = <SafeHtml className="prose" html={String(content.html ?? '')} />;
      break;
    case 'CALLOUT':
      body = (
        <aside className="card callout">
          <b>{String(content.title ?? 'Ghi chú')}</b>
          <SafeHtml className="prose" html={String(content.html ?? '')} />
        </aside>
      );
      break;
    case 'EXAMPLE':
      body = (
        <section className="card example-block">
          <b>{String(content.title ?? 'Ví dụ')}</b>
          <SafeHtml className="prose" html={String(content.html ?? '')} />
        </section>
      );
      break;
    case 'CODE': {
      const code = String(content.code ?? '');
      const language = String(content.language ?? 'text');
      let highlighted = '';
      try {
        highlighted = hljs.getLanguage(language)
          ? hljs.highlight(code, { language }).value
          : hljs.highlightAuto(code).value;
      } catch {
        highlighted = hljs.highlightAuto(code).value;
      }
      body = (
        <pre className="code-block" data-language={language}>
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      );
      break;
    }
    case 'DIAGRAM':
      body = <MermaidBlock code={String(content.mermaid ?? '')} />;
      break;
    case 'TABLE': {
      const headers = Array.isArray(content.headers)
        ? content.headers.map(String)
        : [];
      const rows = Array.isArray(content.rows)
        ? content.rows.map((row) => (Array.isArray(row) ? row.map(String) : []))
        : [];
      body = (
        <div className="table-scroll">
          <table className="content-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;
    }
    case 'IMAGE':
      body = (
        <figure className="lesson-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(content.url ?? '')}
            alt={String(content.alt ?? '')}
            loading="lazy"
          />
          {content.caption ? (
            <figcaption className="muted">{String(content.caption)}</figcaption>
          ) : null}
        </figure>
      );
      break;
    case 'QUIZ_EMBED':
      body = (
        <div className="card">
          <b>Bài luyện liên quan</b>
          <p className="muted">Kiểm tra nhanh kiến thức của bài học.</p>
          <Link
            className="btn secondary"
            href={`/assessments/${String(content.assessmentId ?? '')}`}
          >
            Mở bài luyện
          </Link>
        </div>
      );
      break;
    case 'FLASHCARD_SET': {
      const cards = Array.isArray(content.cards)
        ? content.cards.filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null,
          )
        : [];
      body = (
        <div className="flashcard-grid">
          {cards.map((card, index) => (
            <details className="card" key={index}>
              <summary>{String(card.front ?? `Thẻ ${index + 1}`)}</summary>
              <p>{String(card.back ?? '')}</p>
            </details>
          ))}
        </div>
      );
      break;
    }
    case 'SCENARIO':
      body = (
        <div className="card scenario-block">
          <b>Tình huống</b>
          <p>{String(content.prompt ?? '')}</p>
        </div>
      );
      break;
    case 'ESSAY_PROMPT':
      body = (
        <div className="card">
          <b>Đề tự luận</b>
          <p>{String(content.prompt ?? '')}</p>
          <Link className="btn secondary" href="/practice">
            Luyện tập →
          </Link>
        </div>
      );
      break;
    case 'INTERVIEW_QUESTION':
      body = (
        <div className="card">
          <b>Câu hỏi phỏng vấn</b>
          <p>{String(content.question ?? '')}</p>
          <Link className="btn secondary" href="/interviews">
            Luyện trả lời →
          </Link>
        </div>
      );
      break;
    case 'SOURCE_REFERENCE':
      body = (
        <div className="card source-reference">
          <b>Tài liệu tham khảo</b>
          <p className="muted">
            Các nguồn được dùng để xây dựng nội dung này được liệt kê bên dưới.
          </p>
        </div>
      );
      break;
    case 'SUMMARY': {
      const items = Array.isArray(content.items)
        ? content.items.map(String)
        : [];
      body = (
        <div className="card summary-block">
          <b>Tóm tắt</b>
          <ul>
            {items.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      );
      break;
    }
    default:
      body = (
        <pre className="code-block">
          <code>{JSON.stringify(contentJson, null, 2)}</code>
        </pre>
      );
  }

  return (
    <section className="lesson-block">
      {body}
      {citations.length > 0 && (
        <details className="citations">
          <summary>Nguồn tham khảo ({citations.length})</summary>
          <ul>
            {citations.map((citation) => (
              <li key={citation.chunk.id}>
                {citation.chunk.source.title} · đoạn{' '}
                {citation.chunk.position + 1}
                {citation.chunk.section ? ` · ${citation.chunk.section}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
