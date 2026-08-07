'use server';

import { revalidatePath } from 'next/cache';
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

function parseChoices(type: z.infer<typeof questionTypes>, raw: string) {
  if (type === 'TRUE_FALSE') {
    const answer = raw.trim().toLowerCase();
    const truthy = answer === 'true' || answer === 'đúng' || answer === 'dung';
    return [
      { id: 'true', text: 'Đúng', isCorrect: truthy },
      { id: 'false', text: 'Sai', isCorrect: !truthy },
    ];
  }
  if (!['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(type)) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: String(index + 1),
      text: line.replace(/^\*\s*/, '').trim(),
      isCorrect: /^\*/.test(line),
    }));
}

async function resolveBankAndTopic(bankTitle: string, topicName: string) {
  const bank = await db.questionBank.upsert({
    where: { id: bankTitle.startsWith('id:') ? bankTitle.slice(3) : '__never__' },
    update: {},
    create: { title: bankTitle || 'Ngân hàng chung' },
  }).catch(async () => {
    const existing = await db.questionBank.findFirst({ where: { title: bankTitle || 'Ngân hàng chung' } });
    return existing ?? db.questionBank.create({ data: { title: bankTitle || 'Ngân hàng chung' } });
  });

  const trimmedTopic = topicName.trim();
  if (!trimmedTopic) return { bank, topic: null };
  const base = slugify(trimmedTopic) || 'chu-de';
  let topic = await db.topic.findFirst({ where: { name: trimmedTopic } });
  if (!topic) {
    const existsBySlug = await db.topic.findUnique({ where: { slug: base } });
    topic = existsBySlug ?? await db.topic.create({ data: { name: trimmedTopic, slug: base } });
  }
  return { bank, topic };
}

export async function createQuestion(form: FormData) {
  const user = await requirePermission('course:edit');
  const raw = z.object({
    bankTitle: z.string().min(1).max(200),
    topicName: z.string().max(200).default(''),
    prompt: z.string().min(3).max(20000),
    type: questionTypes,
    difficulty: z.coerce.number().int().min(1).max(5),
    choices: z.string().default(''),
    explanation: z.string().max(20000).default(''),
    referenceAnswer: z.string().max(20000).default(''),
    rubric: z.string().max(20000).default(''),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  }).parse(Object.fromEntries(form));

  const parsedChoices = parseChoices(raw.type, raw.choices);
  questionInput.parse({
    type: raw.type,
    choices: parsedChoices,
    referenceAnswer: raw.referenceAnswer || null,
  });
  const { bank, topic } = await resolveBankAndTopic(raw.bankTitle, raw.topicName);

  let rubricJson: unknown = undefined;
  if (raw.rubric.trim()) {
    try { rubricJson = JSON.parse(raw.rubric); } catch { rubricJson = { criteria: raw.rubric }; }
  }

  const question = await db.question.create({
    data: {
      bankId: bank.id,
      topicId: topic?.id,
      prompt: raw.prompt,
      type: raw.type,
      difficulty: raw.difficulty,
      explanation: raw.explanation || null,
      referenceAnswer: raw.referenceAnswer || null,
      rubricJson: rubricJson as never,
      status: raw.status,
      authorId: user.id,
      choices: parsedChoices.length ? {
        create: parsedChoices.map((choice, index) => ({
          text: choice.text,
          isCorrect: choice.isCorrect,
          position: index,
        })),
      } : undefined,
    },
  });
  await db.auditLog.create({ data: { actorId: user.id, action: 'QUESTION_CREATED', entityType: 'Question', entityId: question.id } });
  revalidatePath('/admin/questions');
}

export async function deleteQuestion(form: FormData) {
  const user = await requirePermission('course:edit');
  const id = z.string().parse(form.get('questionId'));
  const used = await db.assessmentQuestion.count({ where: { questionId: id } });
  if (used) throw new Error('QUESTION_IN_USE');
  await db.question.delete({ where: { id } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'QUESTION_DELETED', entityType: 'Question', entityId: id } });
  revalidatePath('/admin/questions');
}

export async function createAssessment(form: FormData) {
  const user = await requirePermission('course:edit');
  const input = z.object({
    title: z.string().min(3).max(240),
    description: z.string().max(5000).default(''),
    type: z.enum(['QUIZ', 'MOCK_EXAM']),
    courseId: z.string().optional(),
    timeLimitMinutes: z.coerce.number().int().positive().optional(),
    passScore: z.coerce.number().int().min(0).max(100).default(70),
    maximumAttempts: z.coerce.number().int().positive().optional(),
  }).parse(Object.fromEntries(form));
  const assessment = await db.assessment.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      courseId: input.courseId || null,
      timeLimitMinutes: input.timeLimitMinutes || null,
      passScore: input.passScore,
      maximumAttempts: input.maximumAttempts || null,
    },
  });
  await db.auditLog.create({ data: { actorId: user.id, action: 'ASSESSMENT_CREATED', entityType: 'Assessment', entityId: assessment.id } });
  revalidatePath('/admin/assessments');
}

export async function addQuestionToAssessment(form: FormData) {
  await requirePermission('course:edit');
  const input = z.object({ assessmentId: z.string(), questionId: z.string() }).parse(Object.fromEntries(form));
  const position = await db.assessmentQuestion.count({ where: { assessmentId: input.assessmentId } });
  await db.assessmentQuestion.upsert({
    where: { assessmentId_questionId: input },
    update: {},
    create: { ...input, position },
  });
  revalidatePath('/admin/assessments');
}

export async function removeQuestionFromAssessment(form: FormData) {
  await requirePermission('course:edit');
  const input = z.object({ assessmentId: z.string(), questionId: z.string() }).parse(Object.fromEntries(form));
  await db.assessmentQuestion.delete({ where: { assessmentId_questionId: input } });
  const rows = await db.assessmentQuestion.findMany({ where: { assessmentId: input.assessmentId }, orderBy: { position: 'asc' } });
  await db.$transaction(rows.map((row, position) => db.assessmentQuestion.update({
    where: { assessmentId_questionId: { assessmentId: row.assessmentId, questionId: row.questionId } },
    data: { position },
  })));
  revalidatePath('/admin/assessments');
}

export async function toggleAssessmentPublished(form: FormData) {
  const user = await requirePermission('course:edit');
  const id = z.string().parse(form.get('assessmentId'));
  const assessment = await db.assessment.findUniqueOrThrow({ where: { id }, include: { questions: true } });
  if (!assessment.published && assessment.questions.length === 0) throw new Error('ASSESSMENT_HAS_NO_QUESTIONS');
  await db.assessment.update({ where: { id }, data: { published: !assessment.published } });
  await db.auditLog.create({ data: { actorId: user.id, action: assessment.published ? 'ASSESSMENT_UNPUBLISHED' : 'ASSESSMENT_PUBLISHED', entityType: 'Assessment', entityId: id } });
  revalidatePath('/admin/assessments');
  revalidatePath('/practice');
}
