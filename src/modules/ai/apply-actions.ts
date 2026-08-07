'use server';

import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import {
  essaySetSchema,
  interviewSetSchema,
  questionsSchema,
} from '@/modules/ai/output-schemas';
import { blueprintSchema, lessonSchema } from '@/modules/ai/schemas';
import { requirePermission } from '@/modules/auth/session';
import { publishVersion } from '@/modules/publishing/service';

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

const fullCourseOutputSchema = z.object({
  title: z.string().min(3),
  shortDescription: z.string().min(10),
  category: z.string().min(1),
  level: z.string(),
  language: z.string(),
  modules: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      lessons: z.array(
        z.object({
          title: z.string().min(1),
          slug: z.string(),
          objectives: z.array(z.string()),
          generated: lessonSchema,
        }),
      ),
    }),
  ),
});

function sourceIdsFromJob(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

async function citationChunkIds(sourceIds: string[], limit = 5) {
  if (!sourceIds.length) return [];
  const rows = await db.sourceChunk.findMany({
    where: {
      sourceId: { in: sourceIds },
      source: { processingStatus: 'READY' },
    },
    orderBy: [{ sourceId: 'asc' }, { position: 'asc' }],
    take: limit,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function createGeneratedCourse({
  userId,
  jobId,
  output,
  full,
  sourceIds,
}: {
  userId: string;
  jobId: string;
  output: unknown;
  full: boolean;
  sourceIds: string[];
}) {
  const blueprint = full
    ? fullCourseOutputSchema.parse(output)
    : blueprintSchema.parse(output);
  const citations = await citationChunkIds(sourceIds);
  const slug = `${slugify(blueprint.title)}-${crypto.randomBytes(3).toString('hex')}`;

  return db.$transaction(async (transaction) => {
    const course = await transaction.course.create({
      data: {
        title: blueprint.title,
        slug,
        shortDescription: blueprint.shortDescription,
        category: blueprint.category,
        level: blueprint.level,
        language: blueprint.language,
        ownerId: userId,
      },
    });
    const version = await transaction.courseVersion.create({
      data: {
        courseId: course.id,
        versionNumber: 1,
        createdById: userId,
        changeSummary: full
          ? 'Khóa học đầy đủ tạo từ AI'
          : 'Blueprint tạo từ AI',
      },
    });

    for (const [modulePosition, courseModule] of blueprint.modules.entries()) {
      const moduleRow = await transaction.module.create({
        data: {
          versionId: version.id,
          title: courseModule.title,
          description: courseModule.description,
          position: modulePosition,
        },
      });

      for (const [lessonPosition, lesson] of courseModule.lessons.entries()) {
        const lessonRow = await transaction.lesson.create({
          data: {
            moduleId: moduleRow.id,
            title: lesson.title,
            slug: lesson.slug,
            position: lessonPosition,
            learningObjectives: asJson(lesson.objectives),
          },
        });
        const generated =
          full && 'generated' in lesson
            ? lessonSchema.parse(lesson.generated)
            : null;
        const blocks = generated?.blocks ?? [
          {
            type: 'HEADING' as const,
            content: { text: 'Mục tiêu', level: 2 },
          },
          {
            type: 'SUMMARY' as const,
            content: {
              items: lesson.objectives.length
                ? lesson.objectives
                : ['Bổ sung nội dung bài học'],
            },
          },
        ];

        let position = 0;
        for (const block of blocks) {
          await transaction.lessonBlock.create({
            data: {
              lessonId: lessonRow.id,
              type: block.type,
              position,
              contentJson: asJson(block.content),
              generatedByAI: true,
              generationJobId: jobId,
              createdById: userId,
              updatedById: userId,
            },
          });
          position += 1;
        }

        if (citations.length) {
          const reference = await transaction.lessonBlock.create({
            data: {
              lessonId: lessonRow.id,
              type: 'SOURCE_REFERENCE',
              position,
              contentJson: asJson({ chunkIds: citations }),
              generatedByAI: true,
              generationJobId: jobId,
              createdById: userId,
              updatedById: userId,
            },
          });
          await transaction.blockCitation.createMany({
            data: citations.map((chunkId) => ({
              blockId: reference.id,
              chunkId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    return { course, version };
  });
}

async function createQuestionSet({
  userId,
  output,
  label,
  sourceIds,
}: {
  userId: string;
  output: unknown;
  label: string;
  sourceIds: string[];
}) {
  const generated = questionsSchema.parse(output);
  const citations = await citationChunkIds(sourceIds, 3);
  const bank = await db.questionBank.create({ data: { title: label } });

  for (const item of generated.questions) {
    let topic = await db.topic.findFirst({ where: { name: item.topic } });
    if (!topic) {
      const base = slugify(item.topic) || 'tong-quat';
      let candidate = base;
      let suffix = 2;
      while (await db.topic.findUnique({ where: { slug: candidate } })) {
        candidate = `${base}-${suffix++}`;
      }
      topic = await db.topic.create({
        data: { name: item.topic, slug: candidate },
      });
    }

    const question = await db.question.create({
      data: {
        bankId: bank.id,
        topicId: topic.id,
        prompt: item.prompt,
        type: item.type,
        difficulty: item.difficulty,
        explanation: item.explanation || null,
        referenceAnswer: item.referenceAnswer || null,
        rubricJson: item.rubric.length
          ? asJson({ criteria: item.rubric })
          : undefined,
        status: 'DRAFT',
        authorId: userId,
        choices: item.choices.length
          ? {
              create: item.choices.map((choice, position) => ({
                ...choice,
                position,
              })),
            }
          : undefined,
      },
    });
    if (citations.length) {
      await db.questionCitation.createMany({
        data: citations.map((chunkId) => ({
          questionId: question.id,
          chunkId,
        })),
        skipDuplicates: true,
      });
    }
  }
  return bank.id;
}

async function createEssaySet(userId: string, output: unknown, label: string) {
  const generated = essaySetSchema.parse(output);
  const bank = await db.questionBank.create({
    data: { title: `Bài luận · ${label}` },
  });
  const assessment = await db.assessment.create({
    data: {
      title: label,
      type: 'QUIZ',
      description: 'Bộ bài tự luận luyện tập',
      feedbackMode: 'AFTER_SUBMISSION',
    },
  });
  for (const [position, item] of generated.items.entries()) {
    const question = await db.question.create({
      data: {
        bankId: bank.id,
        prompt: item.prompt,
        type: 'ESSAY',
        difficulty: 3,
        explanation: `Gợi ý dàn ý: ${item.suggestedOutline.join(' · ')}\nLỗi thường gặp: ${item.commonMistakes.join(' · ')}`,
        referenceAnswer: item.referenceAnswer,
        rubricJson: asJson({
          title: item.title,
          suggestedMinutes: item.suggestedMinutes,
          requiredConcepts: item.requiredConcepts,
          criteria: item.rubric,
        }),
        status: 'PUBLISHED',
        authorId: userId,
      },
    });
    await db.assessmentQuestion.create({
      data: { assessmentId: assessment.id, questionId: question.id, position },
    });
  }
  return assessment.id;
}

async function createInterviewSet(
  userId: string,
  output: unknown,
  label: string,
) {
  const generated = interviewSetSchema.parse(output);
  const bank = await db.questionBank.create({
    data: { title: `Phỏng vấn · ${label}` },
  });
  const assessment = await db.assessment.create({
    data: {
      title: label,
      type: 'QUIZ',
      description: 'Bộ câu hỏi phỏng vấn văn bản',
      feedbackMode: 'AFTER_SUBMISSION',
    },
  });
  for (const [position, item] of generated.items.entries()) {
    const question = await db.question.create({
      data: {
        bankId: bank.id,
        prompt: item.mainQuestion,
        type: 'SCENARIO',
        difficulty: item.difficulty,
        explanation: `Mục đích: ${item.purpose}\nCâu hỏi tiếp: ${item.followUpQuestions.join(' · ')}\nĐiểm yếu thường gặp: ${item.commonWeakAnswers.join(' · ')}`,
        referenceAnswer: item.referenceAnswer,
        rubricJson: asJson({
          expectedAnswerStructure: item.expectedAnswerStructure,
          criteria: item.evaluationRubric,
          topic: item.topic,
        }),
        status: 'PUBLISHED',
        authorId: userId,
      },
    });
    await db.assessmentQuestion.create({
      data: { assessmentId: assessment.id, questionId: question.id, position },
    });
  }
  return assessment.id;
}

function settingString(settings: unknown, key: string) {
  if (typeof settings !== 'object' || settings === null) return '';
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

export async function applyGenerationJob(form: FormData) {
  const user = await requirePermission('ai:generate');
  const jobId = z.string().parse(form.get('jobId'));
  const job = await db.generationJob.findFirstOrThrow({
    where: { id: jobId, status: 'SUCCEEDED' },
  });
  if (!job.outputSnapshot) throw new Error('GENERATION_HAS_NO_OUTPUT');
  if (job.targetEntityId) throw new Error('GENERATION_ALREADY_APPLIED');

  const sourceIds = sourceIdsFromJob(job.inputSourceIds);
  const outputAction =
    settingString(job.settingsJson, 'outputAction') || 'PREVIEW';
  const label =
    settingString(job.settingsJson, 'courseTitle') ||
    (job.kind === 'QUESTIONS'
      ? 'Bộ câu hỏi AI'
      : job.kind === 'ESSAY_SET'
        ? 'Bài luận luyện tập'
        : 'Phỏng vấn luyện tập');
  let entityId = '';

  if (job.kind === 'BLUEPRINT' || job.kind === 'FULL_COURSE') {
    const created = await createGeneratedCourse({
      userId: user.id,
      jobId: job.id,
      output: job.outputSnapshot,
      full: job.kind === 'FULL_COURSE',
      sourceIds,
    });
    entityId = created.course.id;
    if (outputAction === 'SUBMIT_REVIEW') {
      await db.courseVersion.update({
        where: { id: created.version.id },
        data: { status: 'IN_REVIEW', submittedAt: new Date() },
      });
    }
    if (outputAction === 'PUBLISH') {
      await requirePermission('course:publish');
      await publishVersion(db, created.version.id, user.id);
    }
  } else if (job.kind === 'QUESTIONS') {
    entityId = await createQuestionSet({
      userId: user.id,
      output: job.outputSnapshot,
      label,
      sourceIds,
    });
  } else if (job.kind === 'ESSAY_SET') {
    entityId = await createEssaySet(user.id, job.outputSnapshot, label);
  } else if (job.kind === 'INTERVIEW_SET') {
    entityId = await createInterviewSet(user.id, job.outputSnapshot, label);
  } else {
    throw new Error('UNSUPPORTED_GENERATION_APPLY');
  }

  await db.$transaction([
    db.generationJob.update({
      where: { id: job.id },
      data: { targetEntityId: entityId },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action:
          outputAction === 'PUBLISH' ? 'AI_PUBLISH_NOW' : 'AI_OUTPUT_APPLIED',
        entityType: job.kind,
        entityId,
        metadata: { jobId: job.id },
      },
    }),
  ]);

  revalidatePath('/admin');
  revalidatePath('/admin/courses');
  revalidatePath('/admin/questions');
  revalidatePath('/admin/assessments');
  revalidatePath('/admin/interviews');
  redirect(
    job.kind === 'BLUEPRINT' || job.kind === 'FULL_COURSE'
      ? `/admin/courses/${entityId}/edit`
      : '/admin/generation-jobs',
  );
}
