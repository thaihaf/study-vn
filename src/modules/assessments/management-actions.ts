'use server';

import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { questionInput } from '@/modules/assessments/grading';
import { requirePermission } from '@/modules/auth/session';

const questionTypes = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_TEXT',
  'ESSAY',
  'CODE_REVIEW',
  'SCENARIO',
]);
const contentStatuses = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

function parseChoices(type: z.infer<typeof questionTypes>, raw: string) {
  if (type === 'TRUE_FALSE') {
    const answer = raw.trim().toLowerCase();
    const truthy = answer === 'true' || answer === 'đúng' || answer === 'dung';
    return [
      { text: 'Đúng', isCorrect: truthy },
      { text: 'Sai', isCorrect: !truthy },
    ];
  }
  if (!['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(type)) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      text: line.replace(/^\*\s*/, '').trim(),
      isCorrect: /^\*/.test(line),
    }));
}

async function resolveBankAndTopic(bankTitle: string, topicName: string) {
  const title = bankTitle.trim() || 'Ngân hàng chung';
  const bank =
    (await db.questionBank.findFirst({ where: { title } })) ??
    (await db.questionBank.create({ data: { title } }));
  const topicLabel = topicName.trim();
  if (!topicLabel) return { bank, topic: null };
  let topic = await db.topic.findFirst({ where: { name: topicLabel } });
  if (!topic) {
    const base = slugify(topicLabel) || 'chu-de';
    let slug = base;
    let suffix = 2;
    while (await db.topic.findUnique({ where: { slug } }))
      slug = `${base}-${suffix++}`;
    topic = await db.topic.create({ data: { name: topicLabel, slug } });
  }
  return { bank, topic };
}

const questionFormSchema = z.object({
  questionId: z.string().optional(),
  bankTitle: z.string().min(1).max(200),
  topicName: z.string().max(200).default(''),
  prompt: z.string().min(3).max(20000),
  type: questionTypes,
  difficulty: z.coerce.number().int().min(1).max(5),
  choices: z.string().default(''),
  explanation: z.string().max(20000).default(''),
  referenceAnswer: z.string().max(20000).default(''),
  rubric: z.string().max(20000).default(''),
  status: contentStatuses.default('DRAFT'),
});

function parseRubric(raw: string): Prisma.InputJsonValue | undefined {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as Prisma.InputJsonValue;
  } catch {
    return { criteria: raw };
  }
}

function validateChoices(
  type: z.infer<typeof questionTypes>,
  choices: Array<{ text: string; isCorrect: boolean }>,
  referenceAnswer: string,
) {
  questionInput.parse({
    type,
    choices: choices.map((choice, index) => ({
      id: String(index + 1),
      ...choice,
    })),
    referenceAnswer: referenceAnswer || null,
  });
}

function questionsPath(id?: string, state?: string) {
  const query = new URLSearchParams();
  if (id) query.set('focus', id);
  if (state) query.set('state', state);
  const suffix = query.toString();
  return `/admin/questions${suffix ? `?${suffix}` : ''}`;
}

export async function createQuestion(form: FormData) {
  const user = await requirePermission('course:edit');
  const raw = questionFormSchema.parse(Object.fromEntries(form));
  const choices = parseChoices(raw.type, raw.choices);
  validateChoices(raw.type, choices, raw.referenceAnswer);
  const { bank, topic } = await resolveBankAndTopic(
    raw.bankTitle,
    raw.topicName,
  );
  const question = await db.question.create({
    data: {
      bankId: bank.id,
      topicId: topic?.id,
      prompt: raw.prompt,
      type: raw.type,
      difficulty: raw.difficulty,
      explanation: raw.explanation || null,
      referenceAnswer: raw.referenceAnswer || null,
      rubricJson: parseRubric(raw.rubric),
      status: raw.status,
      authorId: user.id,
      choices: choices.length
        ? {
            create: choices.map((choice, position) => ({
              ...choice,
              position,
            })),
          }
        : undefined,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'QUESTION_CREATED',
      entityType: 'Question',
      entityId: question.id,
    },
  });
  redirect(questionsPath(question.id, 'created'));
}

export async function updateQuestion(form: FormData) {
  const user = await requirePermission('course:edit');
  const raw = questionFormSchema
    .extend({ questionId: z.string().min(1) })
    .parse(Object.fromEntries(form));
  const choices = parseChoices(raw.type, raw.choices);
  validateChoices(raw.type, choices, raw.referenceAnswer);
  const { bank, topic } = await resolveBankAndTopic(
    raw.bankTitle,
    raw.topicName,
  );
  await db.$transaction(async (tx) => {
    await tx.questionChoice.deleteMany({
      where: { questionId: raw.questionId },
    });
    await tx.question.update({
      where: { id: raw.questionId },
      data: {
        bankId: bank.id,
        topicId: topic?.id ?? null,
        prompt: raw.prompt,
        type: raw.type,
        difficulty: raw.difficulty,
        explanation: raw.explanation || null,
        referenceAnswer: raw.referenceAnswer || null,
        rubricJson: parseRubric(raw.rubric) ?? Prisma.DbNull,
        status: raw.status,
        choices: choices.length
          ? {
              create: choices.map((choice, position) => ({
                ...choice,
                position,
              })),
            }
          : undefined,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'QUESTION_UPDATED',
        entityType: 'Question',
        entityId: raw.questionId,
      },
    });
  });
  redirect(questionsPath(raw.questionId, 'updated'));
}

export async function deleteQuestion(form: FormData) {
  const user = await requirePermission('course:edit');
  const id = z.string().parse(form.get('questionId'));
  if (await db.assessmentQuestion.count({ where: { questionId: id } })) {
    throw new Error('QUESTION_IN_USE');
  }
  await db.question.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'QUESTION_DELETED',
      entityType: 'Question',
      entityId: id,
    },
  });
  redirect(questionsPath(undefined, 'deleted'));
}

const optionalPositiveInt = z.preprocess(
  (value) =>
    value === '' || value === null || value === undefined ? undefined : value,
  z.coerce.number().int().positive().optional(),
);

const assessmentFormSchema = z.object({
  assessmentId: z.string().optional(),
  title: z.string().min(3).max(240),
  description: z.string().max(5000).default(''),
  type: z.enum(['QUIZ', 'MOCK_EXAM']),
  courseId: z.string().optional(),
  timeLimitMinutes: optionalPositiveInt,
  passScore: z.coerce.number().int().min(0).max(100).default(70),
  maximumAttempts: optionalPositiveInt,
  randomizeQuestions: z.enum(['on']).optional(),
  randomizeChoices: z.enum(['on']).optional(),
  feedbackMode: z
    .enum(['NEVER', 'AFTER_SUBMISSION', 'AFTER_PASS'])
    .default('AFTER_SUBMISSION'),
});

function assessmentData(input: z.infer<typeof assessmentFormSchema>) {
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    courseId: input.courseId || null,
    timeLimitMinutes: input.timeLimitMinutes || null,
    passScore: input.passScore,
    maximumAttempts: input.maximumAttempts || null,
    randomizeQuestions: Boolean(input.randomizeQuestions),
    randomizeChoices: Boolean(input.randomizeChoices),
    feedbackMode: input.feedbackMode,
  };
}

function assessmentPath(id: string, created = false) {
  return `/admin/assessments?${created ? 'created' : 'focus'}=${encodeURIComponent(id)}`;
}

export async function createAssessment(form: FormData) {
  const user = await requirePermission('course:edit');
  const input = assessmentFormSchema.parse(Object.fromEntries(form));
  const assessment = await db.assessment.create({
    data: assessmentData(input),
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'ASSESSMENT_CREATED',
      entityType: 'Assessment',
      entityId: assessment.id,
    },
  });
  return { redirectTo: assessmentPath(assessment.id, true) };
}

export async function updateAssessment(form: FormData) {
  const user = await requirePermission('course:edit');
  const input = assessmentFormSchema
    .extend({ assessmentId: z.string().min(1) })
    .parse(Object.fromEntries(form));
  await db.assessment.update({
    where: { id: input.assessmentId },
    data: assessmentData(input),
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'ASSESSMENT_UPDATED',
      entityType: 'Assessment',
      entityId: input.assessmentId,
    },
  });
  return { redirectTo: assessmentPath(input.assessmentId) };
}

export async function addQuestionToAssessment(form: FormData) {
  await requirePermission('course:edit');
  const input = z
    .object({ assessmentId: z.string(), questionId: z.string() })
    .parse(Object.fromEntries(form));
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: input.assessmentId },
  });
  if (assessment.published) throw new Error('UNPUBLISH_BEFORE_EDITING');
  const position = await db.assessmentQuestion.count({
    where: { assessmentId: input.assessmentId },
  });
  await db.assessmentQuestion.upsert({
    where: { assessmentId_questionId: input },
    update: {},
    create: { ...input, position },
  });
  return { redirectTo: assessmentPath(input.assessmentId) };
}

export async function removeQuestionFromAssessment(form: FormData) {
  await requirePermission('course:edit');
  const input = z
    .object({ assessmentId: z.string(), questionId: z.string() })
    .parse(Object.fromEntries(form));
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: input.assessmentId },
  });
  if (assessment.published) throw new Error('UNPUBLISH_BEFORE_EDITING');
  await db.assessmentQuestion.delete({
    where: { assessmentId_questionId: input },
  });
  const rows = await db.assessmentQuestion.findMany({
    where: { assessmentId: input.assessmentId },
    orderBy: { position: 'asc' },
  });
  for (const [position, row] of rows.entries()) {
    await db.assessmentQuestion.update({
      where: {
        assessmentId_questionId: {
          assessmentId: row.assessmentId,
          questionId: row.questionId,
        },
      },
      data: { position },
    });
  }
  return { redirectTo: assessmentPath(input.assessmentId) };
}

export async function moveAssessmentQuestion(form: FormData) {
  await requirePermission('course:edit');
  const input = z
    .object({
      assessmentId: z.string(),
      questionId: z.string(),
      direction: z.enum(['up', 'down']),
    })
    .parse(Object.fromEntries(form));
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: input.assessmentId },
  });
  if (assessment.published) throw new Error('UNPUBLISH_BEFORE_EDITING');
  const rows = await db.assessmentQuestion.findMany({
    where: { assessmentId: input.assessmentId },
    orderBy: { position: 'asc' },
  });
  const index = rows.findIndex((row) => row.questionId === input.questionId);
  const targetIndex = input.direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) {
    return { redirectTo: assessmentPath(input.assessmentId) };
  }
  const next = [...rows];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  await db.assessmentQuestion.updateMany({
    where: { assessmentId: input.assessmentId },
    data: { position: { increment: 10000 } },
  });
  for (const [position, row] of next.entries()) {
    await db.assessmentQuestion.update({
      where: {
        assessmentId_questionId: {
          assessmentId: row.assessmentId,
          questionId: row.questionId,
        },
      },
      data: { position },
    });
  }
  return { redirectTo: assessmentPath(input.assessmentId) };
}

export async function toggleAssessmentPublished(form: FormData) {
  const user = await requirePermission('course:edit');
  const id = z.string().parse(form.get('assessmentId'));
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id },
    include: { questions: true },
  });
  if (!assessment.published && assessment.questions.length === 0) {
    throw new Error('ASSESSMENT_HAS_NO_QUESTIONS');
  }
  await db.assessment.update({
    where: { id },
    data: { published: !assessment.published },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: assessment.published
        ? 'ASSESSMENT_UNPUBLISHED'
        : 'ASSESSMENT_PUBLISHED',
      entityType: 'Assessment',
      entityId: id,
    },
  });
  return { redirectTo: assessmentPath(id) };
}
