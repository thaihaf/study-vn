'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'rich-editor prose',
        'aria-label': 'Nội dung bài học',
      },
    },
    onUpdate({ editor: instance }) {
      onChange(instance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="input">Đang mở trình soạn thảo…</div>;

  return (
    <div className="rich-editor-shell">
      <div className="editor-toolbar" role="toolbar" aria-label="Định dạng văn bản">
        <button
          className="btn secondary compact"
          type="button"
          aria-pressed={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Đậm
        </button>
        <button
          className="btn secondary compact"
          type="button"
          aria-pressed={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Nghiêng
        </button>
        <button
          className="btn secondary compact"
          type="button"
          aria-pressed={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Danh sách
        </button>
        <button
          className="btn secondary compact"
          type="button"
          aria-pressed={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Trích dẫn
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
