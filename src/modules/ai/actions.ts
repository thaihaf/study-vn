'use server';

import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { getAIProvider } from '@/modules/ai/provider';
import { blueprintSchema, lessonSchema } from '@/modules/ai/schemas';
import {
  essaySetSchema,
  interviewSetSchema,
  questionsSchema,
} from '@/modules/ai/output-schemas';
import { requirePermission } from '@/modules/auth/session';
import { publishVersion } from '@/modules/publishing/service';

const generationInput = z.object({
  prompt: z.string().min(10).max(8000),
  courseTitle: z.string().max(240).default(''),
  targetAudience: z.string().max(1000).default(''),
  currentLevel: z.string().max(500).default(''),
  outcome: z.string().max(1500).default(''),
  duration: z.string().max(500).default(''),
  language: z.string().min(2).max(20).default('vi'),
  tone: z.string().max(500).default('Rõ ràng, thực tế'),
  mode: z.enum(['BLUEPRINT', 'FULL_COURSE', 'LESSON', 'QUESTIONS', 'ESSAY_SET', 'INTERVIEW_SET']),
  targetCourseId: z.string().optional(),
  targetLessonId: z.string().optional(),
  outputAction: z.enum(['PREVIEW', 'SAVE_DRAFT', 'SUBMIT_REVIEW', 'PUBLISH']).default('PREVIEW'),
});

type GenerationSettings = z.infer<typeof generationInput> & { sourceIds: string[] };

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function loadSources(sourceIds: string[]) {
  if (!sourceIds.length) return [];
  const chunks = await db.sourceChunk.findMany({
    where: { sourceId: { in: sourceIds }, source: { processingStatus: 'READY', archivedAt: null } },
    orderBy: [{ sourceId: 'asc' }, { position: 'asc' }],
    take: 80,
  });
  return chunks.map((chunk) => ({ id: chunk.id, text: chunk.text }));
}

function expandedPrompt(input: z.infer<typeof generationInput>) {
  return [
    input.prompt,
    input.courseTitle && `Tên khóa học mong muốn: ${input.courseTitle}`,
    input.targetAudience && `Đối tượng: ${input.targetAudience}`,
    input.currentLevel && `Trình độ hiện tại: ${input.currentLevel}`,
    input.outcome && `Kết quả mong muốn: ${input.outcome}`,
    input.duration && `Thời lượng/quy mô: ${input.duration}`,
    input.tone && `Giọng điệu: ${input.tone}`,
  ].filter(Boolean).join('\n');
}

async function generateOutput(settings: GenerationSettings) {
  const provider = getAIProvider();
  const sources = await loadSources(settings.sourceIds);
  const context = { prompt: expandedPrompt(settings), language: settings.language, sources };
  if (settings.mode === 'BLUEPRINT') return provider.generateCourseBlueprint(context);
  if (settings.mode === 'LESSON') return provider.generateLesson(context);
  if (settings.mode === 'QUESTIONS') return provider.generateQuestions(context);
  if (settings.mode === 'ESSAY_SET') return provider.generateEssaySet(context);
  if (settings.mode === 'INTERVIEW_SET') return provider.generateInterviewSet(context);

  const blueprint = await provider.generateCourseBlueprint(context);
  const modules = [];
  for (const courseModule of blueprint.modules) {
    const lessons = [];
    for (const lesson of courseModule.lessons) {
      const generated = await provider.generateLesson({
        ...context,
        prompt: `${context.prompt}\n\nTạo nội dung cho bài: ${lesson.title}\nMục tiêu: ${lesson.objectives.join('; ')}`,
      });
      lessons.push({ ...lesson, generated });
    }
    modules.push({ ...courseModule, lessons });
  }
  return { ...blueprint, modules };
}

export async function runGeneration(form: FormData) {
  const user = await requirePermission('ai:generate');
  const input = generationInput.parse(Object.fromEntries(form));
  const sourceIds = form.getAll('sourceIds').filter((value): value is string => typeof value === 'string');
  const settings: GenerationSettings = { ...input, sourceIds };
  const key = crypto.createHash('sha256').update(`${user.id}:${JSON.stringify(settings)}`).digest('hex');

  const existing = await db.generationJob.findUnique({ where: { idempotencyKey: key } });
  if (existing?.status === 'SUCCEEDED') redirect(`/admin/generation-jobs?job=${existing.id}`);

  const job = await db.generationJob.upsert({
    where: { idempotencyKey: key },
    create: {
      idempotencyKey: key,
      userId: user.id,
      kind: input.mode,
      userPrompt: input.prompt,
      settingsJson: json(settings),
      provider: process.env.AI_PROVIDER ?? 'openai',
      model: process.env.OPENAI_MODEL ?? (process.env.AI_PROVIDER === 'fake' ? 'fake' : 'not-configured'),
      inputSourceIds: json(sourceIds),
      targetEntityId: input.targetLessonId || input.targetCourseId || null,
      status: 'RUNNING',
      startedAt: new Date(),
    },
    update: {
      retryCount: { increment: 1 },
      status: 'RUNNING',
      errorCode: null,
      errorMessage: null,
      startedAt: new Date(),
      endedAt: null,
    },
  });

  try {
    const output = await generateOutput(settings);
    await db.$transaction([
      db.generationJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', outputSnapshot: json(output), endedAt: new Date() },
      }),
      db.generationArtifact.create({
        data: { jobId: job.id, kind: input.mode, payload: json(output) },
      }),
    ]);
  } catch (error) {
    await db.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        errorMessage: error instanceof Error ? error.message : 'Không thể tạo nội dung.',
        endedAt: new Date(),
      },
    });
  }
  revalidatePath('/admin/generation-jobs');
  redirect(`/admin/generation-jobs?job=${job.id}`);
}

async function createCourseFromOutput(userId: string, jobId: string, output: unknown, full: boolean) {
  const blueprint = blueprintSchema.parse(output);
  const slug = `${slugify(blueprint.title)}-${crypto.randomBytes(3).toString('hex')}`;
  return db.course.create({
    data: {
      title: blueprint.title,
      slug,
      shortDescription: blueprint.shortDescription,
      category: blueprint.category,
      level: blueprint.level,
      language: blueprint.language,
      ownerId: userId,
      versions: {
        create: {
          versionNumber: 1,
          createdById: userId,
          changeSummary: 'Bản nháp tạo từ AI',
          modules: {
            create: blueprint.modules.map((courseModule, modulePosition) => ({
              title: courseModule.title,
              description: courseModule.description,
              position: modulePosition,
              lessons: {
                create: courseModule.lessons.map((lesson, lessonPosition) => {
                  const rawGenerated = full && 'generated' in lesson ? lesson.generated : null;
                  const generated = rawGenerated ? lessonSchema.parse(rawGenerated) : null;
                  const blocks = generated?.blocks ?? [
                    { type: 'HEADING' as const, content: { text: 'Mục tiêu', level: 2 } },
                    { type: 'SUMMARY' as const, content: { items: lesson.objectives.length ? lesson.objectives : ['Bổ sung nội dung bài học'] } },
                  ];
                  return {
                    title: lesson.title,
                    slug: lesson.slug,
                    position: lessonPosition,
                    learningObjectives: json(lesson.objectives),
                    blocks: {
                      create: blocks.map((block, blockPosition) => ({
                        type: block.type,
                        position: blockPosition,
                        contentJson: json(block.content),
                        generatedByAI: true,
                        generationJobId: jobId,
                        createdById: userId,
                        updatedById: userId,
                      })),
                    },
                  };
                }),
              },
            })),
          },
        },
      },
    },
    include: { versions: true },
  });
}

async function applyQuestionSet(userId: string, output: unknown, label: string) {
  const generated = questionsSchema.parse(output);
  const bank = await db.questionBank.create({ data: { title: label } });
  for (const item of generated.questions) {
    let topic = await db.topic.findFirst({ where: { name: item.topic } });
    if (!topic) {
      let candidate = slugify(item.topic) || 'tong-quat';
      let suffix = 2;
      while (await db.topic.findUnique({ where: { slug: candidate } })) {
        candidate = `${slugify(item.topic) || 'tong-quat'}-${suffix++}`;
      }
      topic = await db.topic.create({ data: { name: item.topic, slug: candidate } });
    }
    await db.question.create({
      data: {
        bankId: bank.id,
        topicId: topic.id,
        prompt: item.prompt,
        type: item.type,
        difficulty: item.difficulty,
        explanation: item.explanation || null,
        referenceAnswer: item.referenceAnswer || null,
        rubricJson: item.rubric.length ? json({ criteria: item.rubric }) : undefined,
        status: 'DRAFT',
        authorId: userId,
        choices: item.choices.length ? { create: item.choices.map((choice, position) => ({ ...choice, position })) } : undefined,
      },
    });
  }
  return bank.id;
}

async function applyEssaySet(userId: string, output: unknown, label: string) {
  const generated = essaySetSchema.parse(output);
  const bank = await db.questionBank.create({ data: { title: `Bài luận · ${label}` } });
  const assessment = await db.assessment.create({ data: { title: label, type: 'QUIZ', description: 'Bộ bài tự luận luyện tập', feedbackMode: 'AFTER_SUBMISSION' } });
  for (const [position, item] of generated.items.entries()) {
    const question = await db.question.create({
      data: {
        bankId: bank.id,
        prompt: item.prompt,
        type: 'ESSAY',
        difficulty: 3,
        explanation: `Gợi ý dàn ý: ${item.suggestedOutline.join(' · ')}\nLỗi thường gặp: ${item.commonMistakes.join(' · ')}`,
        referenceAnswer: item.referenceAnswer,
        rubricJson: json({ title: item.title, suggestedMinutes: item.suggestedMinutes, requiredConcepts: item.requiredConcepts, criteria: item.rubric }),
        status: 'PUBLISHED',
        authorId: userId,
      },
    });
    await db.assessmentQuestion.create({ data: { assessmentId: assessment.id, questionId: question.id, position } });
  }
  return assessment.id;
}

async function applyInterviewSet(userId: string, output: unknown, label: string) {
  const generated = interviewSetSchema.parse(output);
  const bank = await db.questionBank.create({ data: { title: `Phỏng vấn · ${label}` } });
  const assessment = await db.assessment.create({ data: { title: label, type: 'QUIZ', description: 'Bộ câu hỏi phỏng vấn văn bản', feedbackMode: 'AFTER_SUBMISSION' } });
  for (const [position, item] of generated.items.entries()) {
    const question = await db.question.create({
      data: {
        bankId: bank.id,
        prompt: item.mainQuestion,
        type: 'SCENARIO',
        difficulty: item.difficulty,
        explanation: `Mục đích: ${item.purpose}\nCâu hỏi tiếp: ${item.followUpQuestions.join(' · ')}\nĐiểm yếu thường gặp: ${item.commonWeakAnswers.join(' · ')}`,
        referenceAnswer: item.referenceAnswer,
        rubricJson: json({ expectedAnswerStructure: item.expectedAnswerStructure, criteria: item.evaluationRubric, topic: item.topic }),
        status: 'PUBLISHED',
        authorId: userId,
      },
    });
    await db.assessmentQuestion.create({ data: { assessmentId: assessment.id, questionId: question.id, position } });
  }
  return assessment.id;
}

export async function applyGenerationJob(form: FormData) {
  const user = await requirePermission('ai:generate');
  const jobId = z.string().parse(form.get('jobId'));
  const job = await db.generationJob.findFirstOrThrow({ where: { id: jobId, status: 'SUCCEEDED' } });
  if (!job.outputSnapshot) throw new Error('GENERATION_HAS_NO_OUTPUT');
  if (job.targetEntityId && job.kind !== 'LESSON') throw new Error('GENERATION_ALREADY_APPLIED');
  const settings = generationInput.parse(job.settingsJson);
  let entityId = '';

  if (job.kind === 'BLUEPRINT' || job.kind === 'FULL_COURSE') {
    const course = await createCourseFromOutput(user.id, job.id, job.outputSnapshot, job.kind === 'FULL_COURSE');
    entityId = course.id;
    const draft = course.versions[0];
    if (settings.outputAction === 'SUBMIT_REVIEW') {
      await db.courseVersion.update({ where: { id: draft.id }, data: { status: 'IN_REVIEW', submittedAt: new Date() } });
    }
    if (settings.outputAction === 'PUBLISH') {
      await requirePermission('course:publish');
      await publishVersion(db, draft.id, user.id);
    }
  } else if (job.kind === 'QUESTIONS') {
    entityId = await applyQuestionSet(user.id, job.outputSnapshot, settings.courseTitle || 'Bộ câu hỏi AI');
  } else if (job.kind === 'ESSAY_SET') {
    entityId = await applyEssaySet(user.id, job.outputSnapshot, settings.courseTitle || 'Bài luận luyện tập');
  } else if (job.kind === 'INTERVIEW_SET') {
    entityId = await applyInterviewSet(user.id, job.outputSnapshot, settings.courseTitle || 'Phỏng vấn luyện tập');
  } else {
    throw new Error('LESSON_APPLY_REQUIRES_EDITOR');
  }

  await db.$transaction([
    db.generationJob.update({ where: { id: job.id }, data: { targetEntityId: entityId } }),
    db.auditLog.create({ data: { actorId: user.id, action: 'AI_OUTPUT_APPLIED', entityType: job.kind, entityId, metadata: { jobId: job.id } } }),
  ]);
  revalidatePath('/admin');
  revalidatePath('/admin/courses');
  revalidatePath('/admin/questions');
  revalidatePath('/admin/assessments');
  revalidatePath('/admin/interviews');
  redirect(job.kind === 'BLUEPRINT' || job.kind === 'FULL_COURSE' ? `/admin/courses/${entityId}/edit` : '/admin/generation-jobs');
}
