'use server';

import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { getAIProvider } from '@/modules/ai/provider';
import { blueprintSchema, lessonSchema } from '@/modules/ai/schemas';
import { requirePermission } from '@/modules/auth/session';
import { extractTextFromUpload } from '@/modules/sources/extract';
import { chunks, uploadMetadata } from '@/modules/sources/service';

const inputSchema = z.object({
  title: z.string().min(3).max(240),
  description: z.string().min(10).max(3000),
  category: z.string().min(1).max(120),
  level: z.string().min(1).max(120),
  audience: z.string().max(1000).default(''),
  outcome: z.string().max(1500).default(''),
  duration: z.string().max(500).default(''),
});

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export async function createCourseFromDocuments(form: FormData) {
  const user = await requirePermission('course:edit');
  await requirePermission('ai:generate');
  await requirePermission('source:manage');

  const input = inputSchema.parse(Object.fromEntries(form));
  const files = form
    .getAll('files')
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) throw new Error('COURSE_SOURCE_REQUIRED');
  if (files.length > 3) throw new Error('TOO_MANY_COURSE_SOURCES');
  if (files.reduce((sum, file) => sum + file.size, 0) > 5 * 1024 * 1024) {
    throw new Error('COURSE_SOURCES_TOO_LARGE');
  }

  const sourceIds: string[] = [];
  const sourceContext: Array<{ id: string; text: string }> = [];

  for (const file of files) {
    const metadata = uploadMetadata.parse({
      title: file.name.replace(/\.[^.]+$/, '') || file.name,
      sourceType: 'THIRD_PARTY_MATERIAL',
      filename: file.name,
      mimeType: file.type || 'text/plain',
      size: file.size,
    });
    const text = (await extractTextFromUpload(file))
      .replace(/\0/g, '')
      .trim();
    if (!text) throw new Error(`SOURCE_HAS_NO_TEXT:${file.name}`);
    const parts = chunks(text);

    const source = await db.source.create({
      data: {
        title: metadata.title,
        sourceType: metadata.sourceType,
        originalFilename: metadata.filename,
        mimeType: metadata.mimeType,
        size: metadata.size,
        storageKey: crypto.randomUUID(),
        processingStatus: 'READY',
        uploadedById: user.id,
        chunks: {
          create: parts.map((chunkText, position) => ({
            text: chunkText,
            position,
          })),
        },
      },
      include: { chunks: { orderBy: { position: 'asc' } } },
    });

    sourceIds.push(source.id);
    sourceContext.push(
      ...source.chunks.map((chunk) => ({ id: chunk.id, text: chunk.text })),
    );
  }

  const prompt = [
    'Nghiên cứu kỹ tài liệu nguồn rồi xây dựng khóa học dựa trên kiến thức trong tài liệu.',
    `Tên khóa học: ${input.title}`,
    `Mục tiêu và mô tả: ${input.description}`,
    `Danh mục: ${input.category}`,
    `Trình độ: ${input.level}`,
    input.audience && `Đối tượng học: ${input.audience}`,
    input.outcome && `Kết quả mong muốn: ${input.outcome}`,
    input.duration && `Thời lượng hoặc số bài: ${input.duration}`,
    'Ưu tiên nội dung có căn cứ trong nguồn và sắp xếp bài học theo thứ tự hợp lý.',
  ]
    .filter(Boolean)
    .join('\n');

  const job = await db.generationJob.create({
    data: {
      idempotencyKey: crypto.randomUUID(),
      userId: user.id,
      kind: 'FULL_COURSE',
      userPrompt: prompt,
      settingsJson: toJson({ ...input, sourceIds, language: 'vi' }),
      provider: process.env.AI_PROVIDER ?? 'openai',
      model:
        process.env.OPENAI_MODEL ??
        (process.env.AI_PROVIDER === 'fake' ? 'fake' : 'not-configured'),
      inputSourceIds: toJson(sourceIds),
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  let courseId = '';
  try {
    const context = {
      prompt,
      language: 'vi',
      sources: sourceContext.slice(0, 80),
    };
    const provider = getAIProvider();
    const blueprint = blueprintSchema.parse(
      await provider.generateCourseBlueprint(context),
    );

    const moduleData = [];
    for (const [modulePosition, courseModule] of blueprint.modules.entries()) {
      const lessonData = [];
      for (const [lessonPosition, lesson] of courseModule.lessons.entries()) {
        const generated = lessonSchema.parse(
          await provider.generateLesson({
            ...context,
            prompt: `${prompt}\n\nViết bài học "${lesson.title}". Mục tiêu: ${lesson.objectives.join('; ')}`,
          }),
        );
        lessonData.push({ lesson, generated, lessonPosition });
      }
      moduleData.push({ courseModule, modulePosition, lessonData });
    }

    const course = await db.course.create({
      data: {
        title: input.title,
        slug: `${slugify(input.title)}-${crypto.randomBytes(3).toString('hex')}`,
        shortDescription: input.description,
        category: input.category,
        level: input.level,
        language: 'vi',
        ownerId: user.id,
        versions: {
          create: {
            versionNumber: 1,
            createdById: user.id,
            changeSummary: 'Bản nháp AI tạo từ tài liệu nguồn',
            modules: {
              create: moduleData.map(
                ({ courseModule, modulePosition, lessonData }) => ({
                  title: courseModule.title,
                  description: courseModule.description,
                  position: modulePosition,
                  lessons: {
                    create: lessonData.map(
                      ({ lesson, generated, lessonPosition }) => ({
                        title: lesson.title,
                        slug: lesson.slug,
                        description: '',
                        position: lessonPosition,
                        learningObjectives: toJson(lesson.objectives),
                        blocks: {
                          create: generated.blocks.map(
                            (block, blockPosition) => ({
                              type: block.type,
                              position: blockPosition,
                              contentJson: toJson(block.content),
                              generatedByAI: true,
                              generationJobId: job.id,
                              createdById: user.id,
                              updatedById: user.id,
                            }),
                          ),
                        },
                      }),
                    ),
                  },
                }),
              ),
            },
          },
        },
      },
    });
    courseId = course.id;

    await db.$transaction([
      db.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCEEDED',
          outputSnapshot: toJson(blueprint),
          targetEntityId: course.id,
          endedAt: new Date(),
        },
      }),
      db.auditLog.create({
        data: {
          actorId: user.id,
          action: 'COURSE_CREATED_FROM_SOURCES',
          entityType: 'Course',
          entityId: course.id,
          metadata: { sourceIds, generationJobId: job.id },
        },
      }),
    ]);
  } catch (error) {
    await db.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        errorMessage:
          error instanceof Error ? error.message : 'Không thể tạo khóa học.',
        endedAt: new Date(),
      },
    });
    throw error;
  }

  redirect(`/admin/courses/${courseId}/edit`);
}
