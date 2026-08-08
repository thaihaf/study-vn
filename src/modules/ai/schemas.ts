import { z } from 'zod';

export const blueprintSchema = z.object({
  title: z.string().min(3),
  shortDescription: z.string().min(10),
  category: z.string().min(1),
  level: z.string().min(1),
  language: z.string().default('vi'),
  estimatedMinutes: z.number().int().positive().default(60),
  modules: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        estimatedMinutes: z.number().int().positive().default(30),
        learningObjectives: z
          .array(z.string().min(1))
          .min(1)
          .default(['Nắm được nội dung chính của mô-đun']),
        lessons: z
          .array(
            z.object({
              title: z.string().min(1),
              slug: z.string().regex(/^[a-z0-9-]+$/),
              description: z
                .string()
                .min(1)
                .default('Bài học được xây dựng từ tài liệu nguồn.'),
              estimatedMinutes: z.number().int().positive().default(15),
              objectives: z.array(z.string().min(1)).min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1)
    .max(20),
});

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('HEADING'),
    content: z.object({
      text: z.string().min(1),
      level: z.number().int().min(2).max(4),
    }),
  }),
  z.object({
    type: z.literal('PARAGRAPH'),
    content: z.object({ html: z.string().min(1) }),
  }),
  z.object({
    type: z.literal('CALLOUT'),
    content: z.object({
      title: z.string(),
      html: z.string().min(1),
      tone: z.enum(['info', 'warning', 'success']).default('info'),
    }),
  }),
  z.object({
    type: z.literal('EXAMPLE'),
    content: z.object({ title: z.string(), html: z.string().min(1) }),
  }),
  z.object({
    type: z.literal('SCENARIO'),
    content: z.object({ prompt: z.string().min(1) }),
  }),
  z.object({
    type: z.literal('ESSAY_PROMPT'),
    content: z.object({ prompt: z.string().min(1) }),
  }),
  z.object({
    type: z.literal('INTERVIEW_QUESTION'),
    content: z.object({ question: z.string().min(1) }),
  }),
  z.object({
    type: z.literal('FLASHCARD_SET'),
    content: z.object({
      cards: z
        .array(
          z.object({ front: z.string().min(1), back: z.string().min(1) }),
        )
        .min(1),
    }),
  }),
  z.object({
    type: z.literal('SUMMARY'),
    content: z.object({ items: z.array(z.string().min(1)).min(1) }),
  }),
]);

export const lessonSchema = z.object({
  title: z.string(),
  blocks: z.array(blockSchema).min(3),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type GeneratedLesson = z.infer<typeof lessonSchema>;
