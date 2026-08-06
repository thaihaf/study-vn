'use server';

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { signIn, signOut } from '@/auth';
import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { getAIProvider } from '@/modules/ai/provider';
import { requirePermission, requireUser } from '@/modules/auth/session';
import {
  publishVersion,
  restoreVersion,
} from '@/modules/publishing/service';
import { chunks, uploadMetadata } from '@/modules/sources/service';

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function login(form: FormData) {
  const input = credentials.parse(Object.fromEntries(form));
  await signIn('credentials', { ...input, redirectTo: '/dashboard' });
}

export async function logout() {
  await signOut({ redirectTo: '/' });
}

export async function register(form: FormData) {
  const input = credentials
    .extend({ name: z.string().min(2).max(100) })
    .parse(Object.fromEntries(form));
  const email = input.email.toLowerCase();

  await db.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });

  await signIn('credentials', {
    email,
    password: input.password,
    redirectTo: '/dashboard',
  });
}

export async function requestPasswordReset(form: FormData) {
  const email = z.string().email().parse(form.get('email')).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      JSON.stringify({
        event: 'password_reset_requested',
        userId: user.id,
        developmentResetToken: token,
      }),
    );
  }
}

export async function createCourse(form: FormData) {
  const user = await requirePermission('course:edit');
  const input = z
    .object({
      title: z.string().min(3),
      description: z.string().min(10),
      category: z.string().min(1),
      level: z.string().min(1),
    })
    .parse(Object.fromEntries(form));
  const slug = `${slugify(input.title)}-${crypto.randomBytes(3).toString('hex')}`;

  const course = await db.course.create({
    data: {
      title: input.title,
      slug,
      shortDescription: input.description,
      category: input.category,
      level: input.level,
      ownerId: user.id,
      versions: {
        create: {
          versionNumber: 1,
          createdById: user.id,
          modules: {
            create: {
              title: 'Mô-đun 1',
              description: '',
              position: 0,
              lessons: {
                create: {
                  title: 'Bài học 1',
                  slug: 'bai-hoc-1',
                  description: '',
                  position: 0,
                  blocks: {
                    create: {
                      type: 'PARAGRAPH',
                      position: 0,
                      contentJson: {
                        html: 'Nhập nội dung bài học tại đây.',
                      },
                      createdById: user.id,
                      updatedById: user.id,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  redirect(`/admin/courses/${course.id}/edit`);
}

export async function updateCourse(form: FormData) {
  const user = await requirePermission('course:edit');
  const input = z
    .object({
      courseId: z.string(),
      title: z.string().min(3),
      description: z.string().min(10),
      revision: z.coerce.number().int(),
      lessonId: z.string(),
      lessonTitle: z.string().min(1),
      content: z.string().min(1),
    })
    .parse(Object.fromEntries(form));

  const version = await db.courseVersion.findFirstOrThrow({
    where: { courseId: input.courseId, status: 'DRAFT' },
    include: {
      modules: {
        include: {
          lessons: {
            where: { id: input.lessonId },
            include: { blocks: true },
          },
        },
      },
    },
  });

  if (version.revision !== input.revision) throw new Error('CONFLICT');

  const lesson = version.modules.flatMap((module) => module.lessons)[0];
  if (!lesson?.blocks[0]) throw new Error('LESSON_BLOCK_NOT_FOUND');

  await db.$transaction([
    db.course.update({
      where: { id: input.courseId },
      data: { title: input.title, shortDescription: input.description },
    }),
    db.lesson.update({
      where: { id: lesson.id },
      data: { title: input.lessonTitle },
    }),
    db.lessonBlock.update({
      where: { id: lesson.blocks[0].id },
      data: {
        contentJson: { html: input.content },
        updatedById: user.id,
      },
    }),
    db.courseVersion.update({
      where: { id: version.id },
      data: { revision: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/admin/courses/${input.courseId}/edit`);
}

export async function submitReview(form: FormData) {
  const user = await requirePermission('course:edit');
  const id = z.string().parse(form.get('versionId'));

  await db.courseVersion.update({
    where: { id, status: 'DRAFT' },
    data: { status: 'IN_REVIEW', submittedAt: new Date() },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'COURSE_SUBMITTED',
      entityType: 'CourseVersion',
      entityId: id,
    },
  });
  revalidatePath('/admin/reviews');
}

export async function reviewVersion(form: FormData) {
  const user = await requirePermission('review');
  const input = z
    .object({
      versionId: z.string(),
      decision: z.enum(['APPROVED', 'REJECTED']),
      comment: z.string().max(2000),
    })
    .parse(Object.fromEntries(form));

  await db.$transaction([
    db.review.create({ data: { ...input, reviewerId: user.id } }),
    db.courseVersion.update({
      where: { id: input.versionId, status: 'IN_REVIEW' },
      data: {
        status: input.decision === 'REJECTED' ? 'DRAFT' : 'IN_REVIEW',
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: `COURSE_${input.decision}`,
        entityType: 'CourseVersion',
        entityId: input.versionId,
      },
    }),
  ]);

  revalidatePath('/admin/reviews');
}

export async function publish(form: FormData) {
  const user = await requirePermission('course:publish');
  await publishVersion(
    db,
    z.string().parse(form.get('versionId')),
    user.id,
  );
  revalidatePath('/explore');
}

export async function restore(form: FormData) {
  const user = await requirePermission('course:edit');
  await restoreVersion(
    db,
    z.string().parse(form.get('versionId')),
    user.id,
  );
  revalidatePath('/admin/courses');
}

export async function enroll(form: FormData) {
  const user = await requireUser();
  const courseId = z.string().parse(form.get('courseId'));
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId } });

  if (!course.currentPublishedVersionId) throw new Error('NOT_PUBLISHED');

  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: {
      userId: user.id,
      courseId,
      versionId: course.currentPublishedVersionId,
    },
    update: {},
  });
  revalidatePath('/dashboard');
}

export async function lessonInteraction(form: FormData) {
  const user = await requireUser();
  const input = z
    .object({
      lessonId: z.string(),
      versionId: z.string(),
      intent: z.enum(['complete', 'bookmark', 'note']),
      content: z.string().optional(),
    })
    .parse(Object.fromEntries(form));

  const enrolled = await db.enrollment.findFirst({
    where: { userId: user.id, versionId: input.versionId },
  });
  if (!enrolled) throw new Error('FORBIDDEN');

  if (input.intent === 'complete') {
    await db.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: user.id, lessonId: input.lessonId },
      },
      create: {
        userId: user.id,
        lessonId: input.lessonId,
        versionId: input.versionId,
        completedAt: new Date(),
        interactionSeconds: 30,
      },
      update: {
        completedAt: new Date(),
        interactionSeconds: { increment: 30 },
      },
    });
  }

  if (input.intent === 'bookmark') {
    const existingBookmark = await db.bookmark.findFirst({
      where: {
        userId: user.id,
        lessonId: input.lessonId,
        blockId: null,
      },
      select: { id: true },
    });

    if (!existingBookmark) {
      await db.bookmark.create({
        data: { userId: user.id, lessonId: input.lessonId },
      });
    }
  }

  if (input.intent === 'note' && input.content) {
    await db.userNote.create({
      data: {
        userId: user.id,
        lessonId: input.lessonId,
        content: input.content,
      },
    });
  }

  revalidatePath('/dashboard');
}

export async function generateBlueprint(form: FormData) {
  const user = await requirePermission('ai:generate');
  const prompt = z.string().min(10).max(5000).parse(form.get('prompt'));
  const key = crypto
    .createHash('sha256')
    .update(`${user.id}:${prompt}`)
    .digest('hex');
  const existing = await db.generationJob.findUnique({
    where: { idempotencyKey: key },
  });

  if (existing?.status === 'SUCCEEDED') return;

  const job = await db.generationJob.upsert({
    where: { idempotencyKey: key },
    create: {
      idempotencyKey: key,
      userId: user.id,
      kind: 'BLUEPRINT',
      userPrompt: prompt,
      settingsJson: { language: 'vi' },
      provider: process.env.AI_PROVIDER ?? 'openai',
      model: process.env.OPENAI_MODEL ?? 'not-configured',
      inputSourceIds: [],
      status: 'RUNNING',
      startedAt: new Date(),
    },
    update: {
      retryCount: { increment: 1 },
      status: 'RUNNING',
      errorMessage: null,
    },
  });

  try {
    const output = await getAIProvider().generateCourseBlueprint({
      prompt,
      language: 'vi',
      sources: [],
    });
    await db.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCEEDED',
        outputSnapshot: output,
        endedAt: new Date(),
      },
    });
  } catch (error) {
    await db.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorCode: error instanceof Error ? error.message : 'UNKNOWN',
        errorMessage: 'Không thể tạo nội dung. Kiểm tra cấu hình hoặc thử lại.',
        endedAt: new Date(),
      },
    });
  }

  revalidatePath('/admin/generation-jobs');
}

export async function uploadTextSource(form: FormData) {
  const user = await requirePermission('source:manage');
  const file = z.instanceof(File).parse(form.get('file'));
  const metadata = uploadMetadata.parse({
    title: form.get('title'),
    sourceType: form.get('sourceType'),
    filename: file.name,
    mimeType: file.type || 'text/plain',
    size: file.size,
  });
  const text = await file.text();
  const storageKey = crypto.randomUUID();

  await db.source.create({
    data: {
      title: metadata.title,
      sourceType: metadata.sourceType,
      originalFilename: metadata.filename,
      mimeType: metadata.mimeType,
      size: metadata.size,
      storageKey,
      processingStatus: 'READY',
      uploadedById: user.id,
      chunks: {
        create: chunks(text).map((chunkText, position) => ({
          text: chunkText,
          position,
        })),
      },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'SOURCE_UPLOADED',
      entityType: 'Source',
      entityId: storageKey,
    },
  });
  revalidatePath('/admin/sources');
}

export async function startAssessment(form: FormData) {
  const user = await requireUser();
  const id = z.string().parse(form.get('assessmentId'));
  const assessment = await db.assessment.findFirst({
    where: { id, published: true },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: { question: { include: { choices: true } } },
      },
    },
  });

  if (!assessment) throw new Error('NOT_FOUND');

  const count = await db.assessmentAttempt.count({
    where: { userId: user.id, assessmentId: id },
  });
  if (assessment.maximumAttempts && count >= assessment.maximumAttempts) {
    throw new Error('MAX_ATTEMPTS');
  }

  const attempt = await db.assessmentAttempt.create({
    data: {
      assessmentId: id,
      userId: user.id,
      snapshots: {
        create: assessment.questions.map((assessmentQuestion) => {
          const question = assessmentQuestion.question;
          const correctAnswer =
            question.type === 'MULTIPLE_CHOICE'
              ? question.choices
                  .filter((choice) => choice.isCorrect)
                  .map((choice) => choice.id)
              : question.type === 'SHORT_TEXT'
                ? question.referenceAnswer
                : question.choices.find((choice) => choice.isCorrect)?.id;

          return {
            questionId: question.id,
            prompt: question.prompt,
            type: question.type,
            choicesJson: question.choices.map((choice) => ({
              id: choice.id,
              text: choice.text,
            })),
            rubricJson: question.rubricJson ?? undefined,
            explanation: question.explanation,
            correctAnswerJson: correctAnswer ?? '',
            position: assessmentQuestion.position,
          };
        }),
      },
    },
  });

  redirect(`/assessments/${id}?attempt=${attempt.id}`);
}

export async function submitAssessment(form: FormData) {
  const user = await requireUser();
  const attemptId = z.string().parse(form.get('attemptId'));
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: 'IN_PROGRESS' },
    include: { snapshots: true },
  });

  if (!attempt) throw new Error('NOT_FOUND');

  let correct = 0;
  let graded = 0;

  await db.$transaction(async (transaction) => {
    for (const snapshot of attempt.snapshots) {
      const raw = form.get(`answer_${snapshot.id}`);
      const answer =
        snapshot.type === 'MULTIPLE_CHOICE'
          ? form.getAll(`answer_${snapshot.id}`)
          : raw;
      const { grade } = await import('@/modules/assessments/grading');
      const result = grade(
        {
          type: snapshot.type,
          correctAnswerJson: snapshot.correctAnswerJson,
        },
        answer,
      );

      if (result !== null) {
        graded += 1;
        if (result) correct += 1;
      }

      await transaction.attemptAnswer.create({
        data: {
          attemptId,
          snapshotId: snapshot.id,
          answerJson: answer ?? '',
          isCorrect: result,
          pointsAwarded: result === true ? 1 : 0,
        },
      });
    }

    await transaction.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'GRADED',
        score: graded ? Math.round((correct / graded) * 100) : 0,
        submittedAt: new Date(),
      },
    });
  });

  redirect(`/attempts/${attemptId}/result`);
}
