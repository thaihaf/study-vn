import { z } from 'zod';

export const generatedQuestionSchema = z.object({
  prompt: z.string().min(3),
  type: z.enum([
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'SHORT_TEXT',
    'ESSAY',
    'CODE_REVIEW',
    'SCENARIO',
  ]),
  difficulty: z.number().int().min(1).max(5),
  choices: z
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
    .max(12),
  explanation: z.string().default(''),
  referenceAnswer: z.string().default(''),
  rubric: z.array(z.string()).default([]),
  topic: z.string().default('Tổng quát'),
});

export const questionsSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(50),
});

export const essaySetSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        prompt: z.string().min(3),
        suggestedMinutes: z.number().int().positive(),
        requiredConcepts: z.array(z.string()),
        suggestedOutline: z.array(z.string()),
        rubric: z.array(z.string()).min(1),
        referenceAnswer: z.string(),
        commonMistakes: z.array(z.string()),
      }),
    )
    .min(1)
    .max(30),
});

export const interviewSetSchema = z.object({
  items: z
    .array(
      z.object({
        mainQuestion: z.string().min(3),
        purpose: z.string(),
        expectedAnswerStructure: z.array(z.string()),
        evaluationRubric: z.array(z.string()).min(1),
        followUpQuestions: z.array(z.string()),
        commonWeakAnswers: z.array(z.string()),
        referenceAnswer: z.string(),
        topic: z.string(),
        difficulty: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(30),
});

export const practiceFeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  structureFeedback: z.string(),
  clarityFeedback: z.string(),
  factualFeedback: z.string(),
  notice: z.string(),
});

export type GeneratedQuestions = z.infer<typeof questionsSchema>;
export type GeneratedEssaySet = z.infer<typeof essaySetSchema>;
export type GeneratedInterviewSet = z.infer<typeof interviewSetSchema>;
export type PracticeFeedback = z.infer<typeof practiceFeedbackSchema>;
