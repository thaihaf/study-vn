'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { RichTextField } from '@/components/admin/rich-text-field';
import { saveCourseBuilder } from '@/modules/courses/actions';
import {
  builderBlockTypes,
  type CourseBuilderState,
} from '@/modules/courses/builder';

const blockLabels: Record<(typeof builderBlockTypes)[number], string> = {
  HEADING: 'Tiêu đề',
  PARAGRAPH: 'Đoạn văn',
  CALLOUT: 'Ghi chú nổi bật',
  EXAMPLE: 'Ví dụ',
  CODE: 'Mã nguồn',
  DIAGRAM: 'Sơ đồ Mermaid',
  TABLE: 'Bảng',
  IMAGE: 'Hình ảnh',
  QUIZ_EMBED: 'Nhúng bài luyện',
  FLASHCARD_SET: 'Bộ flashcard',
  SCENARIO: 'Tình huống',
  ESSAY_PROMPT: 'Đề tự luận',
  INTERVIEW_QUESTION: 'Câu hỏi phỏng vấn',
  SOURCE_REFERENCE: 'Trích dẫn nguồn',
  SUMMARY: 'Tóm tắt',
};

type ModuleState = CourseBuilderState['modules'][number];
type LessonState = ModuleState['lessons'][number];
type BlockState = LessonState['blocks'][number];
type SourceChunkOption = { id: string; label: string };

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultBlock(
  type: BlockState['type'],
  sourceChunks: SourceChunkOption[],
): BlockState['contentJson'] {
  switch (type) {
    case 'HEADING':
      return { text: 'Tiêu đề mới', level: 2 };
    case 'PARAGRAPH':
      return { html: '<p>Nội dung mới.</p>' };
    case 'CALLOUT':
      return { title: 'Lưu ý', html: '<p>Nội dung cần chú ý.</p>', tone: 'info' };
    case 'EXAMPLE':
      return { title: 'Ví dụ', html: '<p>Ví dụ minh họa.</p>' };
    case 'CODE':
      return { code: '// Viết mã tại đây', language: 'text' };
    case 'DIAGRAM':
      return { mermaid: 'flowchart TD\n  A[Bắt đầu] --> B[Kết thúc]' };
    case 'TABLE':
      return { headers: ['Cột 1', 'Cột 2'], rows: [['Giá trị 1', 'Giá trị 2']] };
    case 'IMAGE':
      return {
        url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8',
        alt: 'Hình minh họa cho bài học',
        caption: '',
      };
    case 'QUIZ_EMBED':
      return { assessmentId: 'assessment-id' };
    case 'FLASHCARD_SET':
      return { cards: [{ front: 'Mặt trước', back: 'Mặt sau' }] };
    case 'SCENARIO':
      return { prompt: 'Mô tả tình huống để người học xử lý.' };
    case 'ESSAY_PROMPT':
      return { prompt: 'Viết câu trả lời cho đề bài này.' };
    case 'INTERVIEW_QUESTION':
      return { question: 'Hãy trình bày câu trả lời của bạn.' };
    case 'SOURCE_REFERENCE':
      return { chunkIds: sourceChunks.slice(0, 1).map((chunk) => chunk.id) };
    case 'SUMMARY':
      return { items: ['Điểm chính cần ghi nhớ'] };
  }
}

function contentRecord(content: unknown): Record<string, unknown> {
  return typeof content === 'object' && content !== null
    ? (content as Record<string, unknown>)
    : {};
}

function SortableItem({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
      }}
    >
      {children(
        <button
          className="drag-handle"
          type="button"
          aria-label="Kéo để đổi thứ tự"
          {...attributes}
          {...listeners}
        >
          ↕
        </button>,
      )}
    </div>
  );
}

function SortableList<T extends { clientId: string }>({
  items,
  onChange,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  children: (item: T, index: number, handle: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function dragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.clientId === active.id);
    const newIndex = items.findIndex((item) => item.clientId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
      <SortableContext items={items.map((item) => item.clientId)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableItem id={item.clientId} key={item.clientId}>
            {(handle) => children(item, index, handle)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function JsonField({
  value,
  onChange,
  label,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <label className="label">
      {label}
      <textarea
        className="input code-input"
        rows={8}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next) as unknown;
            setError('');
            onChange(parsed);
          } catch {
            setError('JSON chưa hợp lệ');
          }
        }}
      />
      {error && <small className="error-text">{error}</small>}
    </label>
  );
}

function BlockEditor({
  block,
  index,
  handle,
  sourceChunks,
  onChange,
  onDuplicate,
  onDelete,
}: {
  block: BlockState;
  index: number;
  handle: ReactNode;
  sourceChunks: SourceChunkOption[];
  onChange: (block: BlockState) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const content = contentRecord(block.contentJson);
  const updateContent = (patch: Record<string, unknown>) =>
    onChange({ ...block, contentJson: { ...content, ...patch } });

  return (
    <section className="builder-block card">
      <div className="builder-row">
        <div className="builder-row-title">
          {handle}
          <b>
            Block {index + 1} · {blockLabels[block.type]}
          </b>
          {block.generatedByAI && <span className="status">AI</span>}
        </div>
        <div className="builder-actions">
          <button className="btn secondary compact" type="button" onClick={onDuplicate}>
            Nhân bản
          </button>
          <button className="btn danger compact" type="button" onClick={onDelete}>
            Xóa
          </button>
        </div>
      </div>

      <div className="builder-two-cols">
        <label className="label">
          Loại block
          <select
            className="input"
            value={block.type}
            onChange={(event) => {
              const type = event.target.value as BlockState['type'];
              if (type === 'SOURCE_REFERENCE' && sourceChunks.length === 0) {
                window.alert('Hãy tải tài liệu nguồn trước khi thêm block trích dẫn.');
                return;
              }
              onChange({ ...block, type, contentJson: defaultBlock(type, sourceChunks) });
            }}
          >
            {builderBlockTypes.map((type) => (
              <option key={type} value={type}>
                {blockLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={block.isLocked}
            onChange={(event) => onChange({ ...block, isLocked: event.target.checked })}
          />
          Khóa block để AI không ghi đè
        </label>
      </div>

      {block.type === 'HEADING' && (
        <div className="builder-two-cols">
          <label className="label">
            Nội dung
            <input
              className="input"
              value={String(content.text ?? '')}
              onChange={(event) => updateContent({ text: event.target.value })}
            />
          </label>
          <label className="label">
            Cấp tiêu đề
            <select
              className="input"
              value={Number(content.level ?? 2)}
              onChange={(event) => updateContent({ level: Number(event.target.value) })}
            >
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
            </select>
          </label>
        </div>
      )}

      {block.type === 'PARAGRAPH' && (
        <RichTextField
          value={String(content.html ?? '<p></p>')}
          onChange={(html) => updateContent({ html })}
        />
      )}

      {(block.type === 'CALLOUT' || block.type === 'EXAMPLE') && (
        <div className="grid">
          <label className="label">
            Tiêu đề
            <input
              className="input"
              value={String(content.title ?? '')}
              onChange={(event) => updateContent({ title: event.target.value })}
            />
          </label>
          {block.type === 'CALLOUT' && (
            <label className="label">
              Kiểu
              <select
                className="input"
                value={String(content.tone ?? 'info')}
                onChange={(event) => updateContent({ tone: event.target.value })}
              >
                <option value="info">Thông tin</option>
                <option value="warning">Cảnh báo</option>
                <option value="success">Ghi nhớ</option>
              </select>
            </label>
          )}
          <RichTextField
            value={String(content.html ?? '<p></p>')}
            onChange={(html) => updateContent({ html })}
          />
        </div>
      )}

      {block.type === 'CODE' && (
        <div className="grid">
          <label className="label">
            Ngôn ngữ
            <input
              className="input"
              value={String(content.language ?? 'text')}
              onChange={(event) => updateContent({ language: event.target.value })}
            />
          </label>
          <label className="label">
            Mã nguồn
            <textarea
              className="input code-input"
              rows={10}
              value={String(content.code ?? '')}
              onChange={(event) => updateContent({ code: event.target.value })}
            />
          </label>
        </div>
      )}

      {block.type === 'DIAGRAM' && (
        <label className="label">
          Mermaid
          <textarea
            className="input code-input"
            rows={8}
            value={String(content.mermaid ?? '')}
            onChange={(event) => updateContent({ mermaid: event.target.value })}
          />
        </label>
      )}

      {block.type === 'TABLE' && (
        <JsonField
          label="Dữ liệu bảng"
          value={block.contentJson}
          onChange={(contentJson) => onChange({ ...block, contentJson })}
        />
      )}

      {block.type === 'IMAGE' && (
        <div className="grid">
          <label className="label">
            URL ảnh
            <input
              className="input"
              type="url"
              value={String(content.url ?? '')}
              onChange={(event) => updateContent({ url: event.target.value })}
            />
          </label>
          <label className="label">
            Mô tả ảnh (alt)
            <input
              className="input"
              value={String(content.alt ?? '')}
              onChange={(event) => updateContent({ alt: event.target.value })}
            />
          </label>
          <label className="label">
            Chú thích
            <input
              className="input"
              value={String(content.caption ?? '')}
              onChange={(event) => updateContent({ caption: event.target.value })}
            />
          </label>
        </div>
      )}

      {block.type === 'QUIZ_EMBED' && (
        <label className="label">
          Assessment ID
          <input
            className="input"
            value={String(content.assessmentId ?? '')}
            onChange={(event) => updateContent({ assessmentId: event.target.value })}
          />
        </label>
      )}

      {block.type === 'FLASHCARD_SET' && (
        <JsonField
          label="Danh sách flashcard"
          value={block.contentJson}
          onChange={(contentJson) => onChange({ ...block, contentJson })}
        />
      )}

      {block.type === 'SCENARIO' && (
        <label className="label">
          Tình huống
          <textarea
            className="input"
            rows={6}
            value={String(content.prompt ?? '')}
            onChange={(event) => updateContent({ prompt: event.target.value })}
          />
        </label>
      )}

      {block.type === 'ESSAY_PROMPT' && (
        <label className="label">
          Đề tự luận
          <textarea
            className="input"
            rows={6}
            value={String(content.prompt ?? '')}
            onChange={(event) => updateContent({ prompt: event.target.value })}
          />
        </label>
      )}

      {block.type === 'INTERVIEW_QUESTION' && (
        <label className="label">
          Câu hỏi
          <textarea
            className="input"
            rows={6}
            value={String(content.question ?? '')}
            onChange={(event) => updateContent({ question: event.target.value })}
          />
        </label>
      )}

      {block.type === 'SOURCE_REFERENCE' && (
        <fieldset className="card inset-card">
          <legend>
            <b>Đoạn nguồn được trích dẫn</b>
          </legend>
          <div className="grid">
            {sourceChunks.map((chunk) => {
              const selected = Array.isArray(content.chunkIds)
                ? content.chunkIds.includes(chunk.id)
                : false;
              return (
                <label className="check-row" key={chunk.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      const current = Array.isArray(content.chunkIds)
                        ? content.chunkIds.filter((id): id is string => typeof id === 'string')
                        : [];
                      const next = event.target.checked
                        ? [...new Set([...current, chunk.id])]
                        : current.filter((id) => id !== chunk.id);
                      updateContent({ chunkIds: next });
                    }}
                  />
                  {chunk.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {block.type === 'SUMMARY' && (
        <label className="label">
          Mỗi dòng là một ý tóm tắt
          <textarea
            className="input"
            rows={6}
            value={Array.isArray(content.items) ? content.items.map(String).join('\n') : ''}
            onChange={(event) =>
              updateContent({
                items: event.target.value
                  .split('\n')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      )}
    </section>
  );
}

export function CourseBuilder({
  initialState,
  sourceChunks,
}: {
  initialState: CourseBuilderState;
  sourceChunks: SourceChunkOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialState);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [message, setMessage] = useState('Đã lưu');
  const draftRef = useRef(draft);
  const statusRef = useRef(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const markChanged = useCallback((next: CourseBuilderState) => {
    draftRef.current = next;
    setDraft(next);
    setStatus('dirty');
    setMessage('Có thay đổi chưa lưu');
  }, []);

  const save = useCallback(async () => {
    if (statusRef.current === 'saving') return;
    setStatus('saving');
    statusRef.current = 'saving';
    setMessage('Đang lưu…');
    try {
      const saved = await saveCourseBuilder(draftRef.current);
      draftRef.current = saved;
      setDraft(saved);
      setStatus('saved');
      statusRef.current = 'saved';
      setMessage(`Đã lưu · revision ${saved.revision}`);
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'SAVE_FAILED';
      const conflict = text.includes('CONFLICT');
      setStatus(conflict ? 'conflict' : 'error');
      statusRef.current = conflict ? 'conflict' : 'error';
      setMessage(
        conflict
          ? 'Có xung đột phiên bản. Tải lại trang trước khi tiếp tục.'
          : `Không thể lưu: ${text}`,
      );
    }
  }, [router]);

  useEffect(() => {
    if (status !== 'dirty') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), 1200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, save, status]);

  const disabled = status === 'saving' || status === 'conflict';
  const statusClass = useMemo(
    () => `save-state ${status === 'error' || status === 'conflict' ? 'save-error' : ''}`,
    [status],
  );

  function updateModule(index: number, next: ModuleState) {
    const modules = [...draft.modules];
    modules[index] = next;
    markChanged({ ...draft, modules });
  }

  function removeModule(index: number) {
    if (draft.modules.length === 1) {
      window.alert('Khóa học cần ít nhất một mô-đun.');
      return;
    }
    if (!window.confirm('Xóa mô-đun và toàn bộ bài học bên trong?')) return;
    markChanged({ ...draft, modules: draft.modules.filter((_, i) => i !== index) });
  }

  function duplicateModule(index: number) {
    const source = cloneJson(draft.modules[index]);
    const copy: ModuleState = {
      ...source,
      id: undefined,
      clientId: uid('module'),
      title: `${source.title} (bản sao)`,
      lessons: source.lessons.map((lesson) => ({
        ...lesson,
        id: undefined,
        clientId: uid('lesson'),
        slug: `${lesson.slug || 'bai-hoc'}-copy`,
        blocks: lesson.blocks.map((block) => ({
          ...block,
          id: undefined,
          clientId: uid('block'),
        })),
      })),
    };
    const modules = [...draft.modules];
    modules.splice(index + 1, 0, copy);
    markChanged({ ...draft, modules });
  }

  function addModule() {
    const moduleIndex = draft.modules.length + 1;
    const next: ModuleState = {
      id: undefined,
      clientId: uid('module'),
      title: `Mô-đun ${moduleIndex}`,
      description: '',
      estimatedMinutes: null,
      learningObjectives: [],
      lessons: [
        {
          id: undefined,
          clientId: uid('lesson'),
          title: 'Bài học mới',
          slug: `bai-hoc-${moduleIndex}`,
          description: '',
          estimatedMinutes: null,
          learningObjectives: [],
          blocks: [
            {
              id: undefined,
              clientId: uid('block'),
              type: 'PARAGRAPH',
              contentJson: defaultBlock('PARAGRAPH', sourceChunks),
              isLocked: false,
              generatedByAI: false,
            },
          ],
        },
      ],
    };
    markChanged({ ...draft, modules: [...draft.modules, next] });
  }

  return (
    <div className="grid">
      <div className="builder-sticky card">
        <div>
          <b>Trình biên tập khóa học</b>
          <div className={statusClass} aria-live="polite">
            {message}
          </div>
        </div>
        <div className="builder-actions">
          <Link className="btn secondary" href={`/admin/courses/${draft.courseId}/preview`}>
            Xem trước
          </Link>
          <button
            className="btn"
            type="button"
            disabled={status === 'saving' || status === 'saved'}
            onClick={() => void save()}
          >
            {status === 'saving' ? 'Đang lưu…' : 'Lưu ngay'}
          </button>
        </div>
      </div>

      <fieldset className="builder-fieldset" disabled={disabled}>
        <section className="card grid">
          <h2>Thông tin khóa học</h2>
          <div className="builder-two-cols">
            <label className="label">
              Tên khóa học
              <input
                className="input"
                value={draft.title}
                onChange={(event) => markChanged({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="label">
              Danh mục
              <input
                className="input"
                value={draft.category}
                onChange={(event) => markChanged({ ...draft, category: event.target.value })}
              />
            </label>
          </div>
          <label className="label">
            Mô tả ngắn
            <textarea
              className="input"
              rows={4}
              value={draft.shortDescription}
              onChange={(event) =>
                markChanged({ ...draft, shortDescription: event.target.value })
              }
            />
          </label>
          <div className="builder-three-cols">
            <label className="label">
              Trình độ
              <input
                className="input"
                value={draft.level}
                onChange={(event) => markChanged({ ...draft, level: event.target.value })}
              />
            </label>
            <label className="label">
              Ngôn ngữ
              <input
                className="input"
                value={draft.language}
                onChange={(event) => markChanged({ ...draft, language: event.target.value })}
              />
            </label>
            <label className="label">
              Thời lượng (phút)
              <input
                className="input"
                type="number"
                min={1}
                value={draft.estimatedMinutes ?? ''}
                onChange={(event) =>
                  markChanged({
                    ...draft,
                    estimatedMinutes: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </label>
          </div>
          <div className="builder-two-cols">
            <label className="label">
              Ảnh bìa URL
              <input
                className="input"
                type="url"
                value={draft.coverImageUrl ?? ''}
                onChange={(event) =>
                  markChanged({ ...draft, coverImageUrl: event.target.value || null })
                }
              />
            </label>
            <label className="label">
              Hiển thị
              <select
                className="input"
                value={draft.visibility}
                onChange={(event) =>
                  markChanged({
                    ...draft,
                    visibility: event.target.value as CourseBuilderState['visibility'],
                  })
                }
              >
                <option value="PRIVATE">Riêng tư</option>
                <option value="UNLISTED">Không liệt kê</option>
                <option value="PUBLIC">Công khai</option>
              </select>
            </label>
          </div>
          <label className="label">
            Tóm tắt thay đổi của phiên bản
            <textarea
              className="input"
              rows={3}
              value={draft.changeSummary}
              onChange={(event) =>
                markChanged({ ...draft, changeSummary: event.target.value })
              }
            />
          </label>
        </section>

        <div className="builder-section-heading">
          <div>
            <h2>Roadmap</h2>
            <p className="muted">Kéo thả để sắp xếp mô-đun, bài học và block.</p>
          </div>
          <button className="btn" type="button" onClick={addModule}>
            + Mô-đun
          </button>
        </div>

        <SortableList
          items={draft.modules}
          onChange={(modules) => markChanged({ ...draft, modules })}
        >
          {(courseModule, moduleIndex, moduleHandle) => (
            <section className="card builder-module">
              <div className="builder-row">
                <div className="builder-row-title">
                  {moduleHandle}
                  <h3>
                    Mô-đun {moduleIndex + 1}: {courseModule.title}
                  </h3>
                </div>
                <div className="builder-actions">
                  <button
                    className="btn secondary compact"
                    type="button"
                    onClick={() => duplicateModule(moduleIndex)}
                  >
                    Nhân bản
                  </button>
                  <button
                    className="btn danger compact"
                    type="button"
                    onClick={() => removeModule(moduleIndex)}
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div className="builder-two-cols">
                <label className="label">
                  Tên mô-đun
                  <input
                    className="input"
                    value={courseModule.title}
                    onChange={(event) =>
                      updateModule(moduleIndex, { ...courseModule, title: event.target.value })
                    }
                  />
                </label>
                <label className="label">
                  Thời lượng (phút)
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={courseModule.estimatedMinutes ?? ''}
                    onChange={(event) =>
                      updateModule(moduleIndex, {
                        ...courseModule,
                        estimatedMinutes: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </label>
              </div>
              <label className="label">
                Mô tả mô-đun
                <textarea
                  className="input"
                  rows={3}
                  value={courseModule.description}
                  onChange={(event) =>
                    updateModule(moduleIndex, { ...courseModule, description: event.target.value })
                  }
                />
              </label>
              <label className="label">
                Mục tiêu học tập (mỗi dòng một mục tiêu)
                <textarea
                  className="input"
                  rows={3}
                  value={courseModule.learningObjectives.join('\n')}
                  onChange={(event) =>
                    updateModule(moduleIndex, {
                      ...courseModule,
                      learningObjectives: event.target.value
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>

              <div className="builder-subheading">
                <b>Bài học</b>
                <button
                  className="btn secondary compact"
                  type="button"
                  onClick={() => {
                    const next: LessonState = {
                      id: undefined,
                      clientId: uid('lesson'),
                      title: `Bài học ${courseModule.lessons.length + 1}`,
                      slug: `bai-hoc-${courseModule.lessons.length + 1}`,
                      description: '',
                      estimatedMinutes: null,
                      learningObjectives: [],
                      blocks: [
                        {
                          id: undefined,
                          clientId: uid('block'),
                          type: 'PARAGRAPH',
                          contentJson: defaultBlock('PARAGRAPH', sourceChunks),
                          isLocked: false,
                          generatedByAI: false,
                        },
                      ],
                    };
                    updateModule(moduleIndex, {
                      ...courseModule,
                      lessons: [...courseModule.lessons, next],
                    });
                  }}
                >
                  + Bài học
                </button>
              </div>

              <SortableList
                items={courseModule.lessons}
                onChange={(lessons) => updateModule(moduleIndex, { ...courseModule, lessons })}
              >
                {(lesson, lessonIndex, lessonHandle) => {
                  const updateLesson = (next: LessonState) => {
                    const lessons = [...courseModule.lessons];
                    lessons[lessonIndex] = next;
                    updateModule(moduleIndex, { ...courseModule, lessons });
                  };
                  return (
                    <article className="card builder-lesson">
                      <div className="builder-row">
                        <div className="builder-row-title">
                          {lessonHandle}
                          <h4>
                            Bài {lessonIndex + 1}: {lesson.title}
                          </h4>
                        </div>
                        <div className="builder-actions">
                          <button
                            className="btn secondary compact"
                            type="button"
                            onClick={() => {
                              const copy = cloneJson(lesson);
                              const duplicated: LessonState = {
                                ...copy,
                                id: undefined,
                                clientId: uid('lesson'),
                                title: `${copy.title} (bản sao)`,
                                slug: `${copy.slug || 'bai-hoc'}-copy`,
                                blocks: copy.blocks.map((block) => ({
                                  ...block,
                                  id: undefined,
                                  clientId: uid('block'),
                                })),
                              };
                              const lessons = [...courseModule.lessons];
                              lessons.splice(lessonIndex + 1, 0, duplicated);
                              updateModule(moduleIndex, { ...courseModule, lessons });
                            }}
                          >
                            Nhân bản
                          </button>
                          <button
                            className="btn danger compact"
                            type="button"
                            onClick={() => {
                              if (courseModule.lessons.length === 1) {
                                window.alert('Mỗi mô-đun cần ít nhất một bài học.');
                                return;
                              }
                              if (!window.confirm('Xóa bài học và toàn bộ nội dung bên trong?')) return;
                              updateModule(moduleIndex, {
                                ...courseModule,
                                lessons: courseModule.lessons.filter((_, i) => i !== lessonIndex),
                              });
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="builder-two-cols">
                        <label className="label">
                          Tên bài
                          <input
                            className="input"
                            value={lesson.title}
                            onChange={(event) => updateLesson({ ...lesson, title: event.target.value })}
                          />
                        </label>
                        <label className="label">
                          Slug
                          <input
                            className="input"
                            value={lesson.slug}
                            onChange={(event) => updateLesson({ ...lesson, slug: event.target.value })}
                          />
                        </label>
                      </div>
                      <div className="builder-two-cols">
                        <label className="label">
                          Mô tả bài
                          <textarea
                            className="input"
                            rows={3}
                            value={lesson.description}
                            onChange={(event) =>
                              updateLesson({ ...lesson, description: event.target.value })
                            }
                          />
                        </label>
                        <label className="label">
                          Mục tiêu bài học (mỗi dòng một mục tiêu)
                          <textarea
                            className="input"
                            rows={3}
                            value={lesson.learningObjectives.join('\n')}
                            onChange={(event) =>
                              updateLesson({
                                ...lesson,
                                learningObjectives: event.target.value
                                  .split('\n')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className="builder-subheading">
                        <b>Nội dung</b>
                        <button
                          className="btn secondary compact"
                          type="button"
                          onClick={() =>
                            updateLesson({
                              ...lesson,
                              blocks: [
                                ...lesson.blocks,
                                {
                                  id: undefined,
                                  clientId: uid('block'),
                                  type: 'PARAGRAPH',
                                  contentJson: defaultBlock('PARAGRAPH', sourceChunks),
                                  isLocked: false,
                                  generatedByAI: false,
                                },
                              ],
                            })
                          }
                        >
                          + Block
                        </button>
                      </div>

                      <SortableList
                        items={lesson.blocks}
                        onChange={(blocks) => updateLesson({ ...lesson, blocks })}
                      >
                        {(block, blockIndex, blockHandle) => (
                          <BlockEditor
                            block={block}
                            index={blockIndex}
                            handle={blockHandle}
                            sourceChunks={sourceChunks}
                            onChange={(next) => {
                              const blocks = [...lesson.blocks];
                              blocks[blockIndex] = next;
                              updateLesson({ ...lesson, blocks });
                            }}
                            onDuplicate={() => {
                              const copy: BlockState = {
                                ...cloneJson(block),
                                id: undefined,
                                clientId: uid('block'),
                              };
                              const blocks = [...lesson.blocks];
                              blocks.splice(blockIndex + 1, 0, copy);
                              updateLesson({ ...lesson, blocks });
                            }}
                            onDelete={() => {
                              if (lesson.blocks.length === 1) {
                                window.alert('Mỗi bài học cần ít nhất một block.');
                                return;
                              }
                              if (!window.confirm('Xóa block này?')) return;
                              updateLesson({
                                ...lesson,
                                blocks: lesson.blocks.filter((_, i) => i !== blockIndex),
                              });
                            }}
                          />
                        )}
                      </SortableList>
                    </article>
                  );
                }}
              </SortableList>
            </section>
          )}
        </SortableList>
      </fieldset>
    </div>
  );
}
