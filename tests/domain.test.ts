import { describe, it, expect } from 'vitest';
import { can } from '@/modules/auth/permissions';
import { validateBlock, hasUnsafeContent } from '@/modules/content/blocks';
import {
  questionInput,
  grade,
  serializeForLearner,
} from '@/modules/assessments/grading';
import { calculateProgress, nextReview } from '@/modules/progress/progress';
import { blueprintSchema } from '@/modules/ai/schemas';
import { mergeUnlocked } from '@/modules/ai/provider';
import { chunks, uploadMetadata } from '@/modules/sources/service';
describe('RBAC', () => {
  it('ngăn learner sửa và cho admin quản trị', () => {
    expect(can('LEARNER', 'course:edit')).toBe(false);
    expect(can('SUPER_ADMIN', 'user:roles')).toBe(true);
    expect(can('CONTENT_ADMIN', 'course:publish', false)).toBe(false);
    expect(can('CONTENT_ADMIN', 'course:publish', true)).toBe(true);
  });
});
describe('content', () => {
  it('validates typed blocks and unsafe html', () => {
    expect(validateBlock('HEADING', { text: 'Mục', level: 2 })).toBeTruthy();
    expect(() => validateBlock('HEADING', { text: '', level: 9 })).toThrow();
    expect(hasUnsafeContent({ html: '<script>x</script>' })).toBe(true);
  });
  it('keeps locked blocks', () => {
    const old = [{ id: 'a', isLocked: true, value: 'manual' }],
      fresh = [{ id: 'a', isLocked: false, value: 'ai' }];
    expect(mergeUnlocked(old, fresh)[0].value).toBe('manual');
  });
});
describe('assessment', () => {
  it('enforces choice rules', () => {
    expect(() =>
      questionInput.parse({
        type: 'SINGLE_CHOICE',
        choices: [
          { id: '1', text: 'a', isCorrect: true },
          { id: '2', text: 'b', isCorrect: true },
        ],
      }),
    ).toThrow();
    expect(
      questionInput.safeParse({
        type: 'MULTIPLE_CHOICE',
        choices: [{ id: '1', text: 'a', isCorrect: true }],
      }).success,
    ).toBe(true);
  });
  it('grades objective and normalized text', () => {
    expect(
      grade({ type: 'MULTIPLE_CHOICE', correctAnswerJson: ['a', 'b'] }, [
        'b',
        'a',
      ]),
    ).toBe(true);
    expect(
      grade(
        { type: 'SHORT_TEXT', correctAnswerJson: ' Xin  Chào ' },
        'xin chào',
      ),
    ).toBe(true);
    expect(grade({ type: 'ESSAY', correctAnswerJson: null }, 'x')).toBe(null);
  });
  it('never serializes keys', () => {
    expect(
      serializeForLearner({
        prompt: '?',
        isCorrect: true,
        correctAnswerJson: 'x',
      }),
    ).toEqual({ prompt: '?' });
  });
});
describe('progress/review', () => {
  it('calculates robust progress', () => {
    expect(calculateProgress(3, 4)).toBe(75);
    expect(calculateProgress(0, 0)).toBe(0);
  });
  it('schedules deterministic review', () => {
    const now = new Date('2026-01-01');
    expect(nextReview(now, 'EASY', 2).toISOString()).toBe(
      '2026-01-07T00:00:00.000Z',
    );
  });
});
describe('AI and sources', () => {
  it('rejects malformed structured output', () => {
    expect(blueprintSchema.safeParse({ title: 'x' }).success).toBe(false);
  });
  it('validates safe upload and chunks text', () => {
    expect(
      uploadMetadata.safeParse({
        title: 'Nguồn',
        sourceType: 'OTHER',
        filename: 'a.txt',
        mimeType: 'text/plain',
        size: 10,
      }).success,
    ).toBe(true);
    expect(
      uploadMetadata.safeParse({
        title: 'Nguồn',
        sourceType: 'OTHER',
        filename: '../a',
        mimeType: 'text/plain',
        size: 10,
      }).success,
    ).toBe(false);
    expect(chunks('a'.repeat(2000), 1000)).toHaveLength(2);
  });
});
