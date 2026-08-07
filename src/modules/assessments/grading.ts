import { z } from 'zod';

export const questionInput = z
  .object({
    type: z.enum([
      'SINGLE_CHOICE',
      'MULTIPLE_CHOICE',
      'TRUE_FALSE',
      'SHORT_TEXT',
      'ESSAY',
      'CODE_REVIEW',
      'SCENARIO',
    ]),
    choices: z.array(
      z.object({ id: z.string(), text: z.string(), isCorrect: z.boolean() }),
    ),
    referenceAnswer: z.string().nullable().optional(),
  })
  .superRefine((question, context) => {
    const count = question.choices.filter((choice) => choice.isCorrect).length;
    if (question.type === 'SINGLE_CHOICE' && count !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'Câu một lựa chọn phải có đúng một đáp án',
      });
    }
    if (question.type === 'MULTIPLE_CHOICE' && count < 1) {
      context.addIssue({
        code: 'custom',
        message: 'Câu nhiều lựa chọn cần ít nhất một đáp án',
      });
    }
  });

export type Snapshot = { type: string; correctAnswerJson: unknown };
const normalize = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

export function grade(snapshot: Snapshot, answer: unknown) {
  if (['SINGLE_CHOICE', 'TRUE_FALSE'].includes(snapshot.type)) {
    return answer === snapshot.correctAnswerJson;
  }
  if (snapshot.type === 'MULTIPLE_CHOICE') {
    const submitted = [...(answer as string[])].sort();
    const correct = [...(snapshot.correctAnswerJson as string[])].sort();
    return JSON.stringify(submitted) === JSON.stringify(correct);
  }
  if (snapshot.type === 'SHORT_TEXT') {
    return (
      normalize(String(answer)) ===
      normalize(String(snapshot.correctAnswerJson))
    );
  }
  return null;
}

export function serializeForLearner<
  T extends { isCorrect?: boolean; correctAnswerJson?: unknown },
>(question: T): Omit<T, 'isCorrect' | 'correctAnswerJson'> {
  const safe = { ...question };
  delete safe.isCorrect;
  delete safe.correctAnswerJson;
  return safe;
}
