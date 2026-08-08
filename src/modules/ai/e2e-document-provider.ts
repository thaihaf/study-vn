import { FakeAIProvider, type GenerateContext } from './provider';
import { blueprintSchema, lessonSchema } from './schemas';

export function isE2EDocumentAIEnabled() {
  return process.env.CI === 'true' && process.env.E2E_DOCUMENT_AI === 'true';
}

export class E2EDocumentAIProvider extends FakeAIProvider {
  override async generateCourseBlueprint(input: GenerateContext) {
    return blueprintSchema.parse({
      title: 'Khóa học tài liệu E2E',
      shortDescription:
        'Khóa học nhiều module được tạo xác định để kiểm tra toàn bộ luồng AI tài liệu trên trình duyệt.',
      category: 'Kiểm thử',
      level: 'Trung cấp',
      language: input.language,
      modules: Array.from({ length: 3 }, (_, moduleIndex) => ({
        title: `Module ${moduleIndex + 1}: Nền tảng kiểm thử`,
        description:
          'Module kiểm thử có đủ nội dung để xác nhận publish, enroll và trải nghiệm học.',
        lessons: Array.from({ length: 3 }, (_, lessonIndex) => ({
          title: `Bài ${moduleIndex * 3 + lessonIndex + 1}: Kiến thức từ tài liệu`,
          slug: `bai-${moduleIndex * 3 + lessonIndex + 1}-kien-thuc-tu-tai-lieu`,
          objectives: [
            'Hiểu kiến thức chính từ tài liệu nguồn',
            'Áp dụng kiến thức vào một tình huống thực tế',
          ],
        })),
      })),
    });
  }
}

export function e2eRichDocumentLesson() {
  const paragraph =
    'Nội dung kiểm thử này mô phỏng một bài học thực tế được AI tổng hợp từ tài liệu nguồn. Người học cần hiểu khái niệm, cơ chế hoạt động, cách áp dụng trong tình huống thực tế và biết giải thích lại bằng ngôn ngữ của mình. Phần nội dung đủ dài để ngăn hệ thống chấp nhận các placeholder hoặc bài học rỗng.';

  return lessonSchema.parse({
    title: 'Kiến thức từ tài liệu',
    blocks: [
      {
        type: 'HEADING',
        content: { text: 'Mental model', level: 2 },
      },
      {
        type: 'PARAGRAPH',
        content: { html: `${paragraph} ${paragraph}` },
      },
      {
        type: 'EXAMPLE',
        content: {
          title: 'Ví dụ thực tế',
          html: `${paragraph} Ví dụ này giúp kiểm tra block EXAMPLE được render đúng trên giao diện học.`,
        },
      },
      {
        type: 'CALLOUT',
        content: {
          title: 'Điểm cần nhớ',
          html: `${paragraph} Không được học thuộc máy móc mà phải hiểu nguyên nhân và hệ quả.`,
          tone: 'info',
        },
      },
      {
        type: 'SCENARIO',
        content: {
          prompt:
            'Giả sử hệ thống gặp một tình huống thực tế liên quan đến nội dung vừa học, hãy mô tả cách phân tích và xử lý theo từng bước.',
        },
      },
      {
        type: 'INTERVIEW_QUESTION',
        content: {
          question:
            'Bạn sẽ giải thích kiến thức này như thế nào trong 60–90 giây khi được hỏi trong phỏng vấn?',
        },
      },
      {
        type: 'FLASHCARD_SET',
        content: {
          cards: [
            {
              front: 'Điều quan trọng nhất của bài học là gì?',
              back: 'Hiểu khái niệm, cơ chế, ví dụ và khả năng áp dụng vào tình huống.',
            },
            {
              front: 'Khi trả lời phỏng vấn nên theo cấu trúc nào?',
              back: 'Answer → Why → Example → Impact.',
            },
          ],
        },
      },
      {
        type: 'SUMMARY',
        content: {
          items: [
            'Nắm mental model trước khi nhớ chi tiết.',
            'Luôn liên hệ kiến thức với ví dụ thực tế.',
            'Tự kiểm tra bằng tình huống và câu hỏi phỏng vấn.',
          ],
        },
      },
    ],
  });
}
