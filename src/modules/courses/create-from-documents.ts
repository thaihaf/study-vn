'use server';

import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import {
  courseTemplateValues,
  learningStandardFor,
} from '@/modules/ai/course-standard';
import {
  documentCourseProviderMetadata,
  generateRichDocumentLesson,
  getDocumentCourseProvider,
  selectRelevantSources,
} from '@/modules/ai/document-course';
import { blueprintSchema } from '@/modules/ai/schemas';
import { requirePermission } from '@/modules/auth/session';
import { extractTextFromUpload } from '@/modules/sources/extract';
import { chunks, uploadMetadata } from '@/modules/sources/service';

const inputSchema = z.object({
  template: z.enum(courseTemplateValues).default('GENERAL_LEARNING'),
  guidance: z.string().max(2000).default(''),
});

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

function minimumScope(template: (typeof courseTemplateValues)[number]) {
  if (template === 'GENERAL_LEARNING') return { minModules: 2, minLessons: 6 };
  if (template === 'EXAM_PREP' || template === 'INTERVIEW_PREP') {
    return { minModules: 3, minLessons: 8 };
  }
  return { minModules: 3, minLessons: 9 };
}

function assertBlueprintScope(
  blueprint: z.infer<typeof blueprintSchema>,
  template: (typeof courseTemplateValues)[number],
) {
  const { minModules, minLessons } = minimumScope(template);
  const lessonCount = blueprint.modules.reduce(
    (total, courseModule) => total + courseModule.lessons.length,
    0,
  );
  if (blueprint.modules.length < minModules || lessonCount < minLessons) {
    throw new Error(
      `AI_COURSE_SCOPE_TOO_SMALL:${blueprint.modules.length}_modules:${lessonCount}_lessons`,
    );
  }
}

function uniqueObjectives(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 8);
}

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
    const text = (await extractTextFromUpload(file)).replace(/\0/g, '').trim();
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
    learningStandardFor(input.template),
    'YÊU CẦU TẠO KHÓA HỌC AI-FIRST',
    'Đọc kỹ toàn bộ tài liệu nguồn và tự thiết kế một khóa học hoàn chỉnh để người dùng chỉ cần review, không phải điền nốt metadata hay roadmap.',
    'Tự đặt tên khóa học rõ ràng và sát mục tiêu tài liệu.',
    'Tự viết mô tả khóa học, chọn danh mục, trình độ, số mô-đun, số bài và thứ tự học hợp lý.',
    'Mỗi mô-đun và bài học phải có mục tiêu rõ ràng. Không tạo placeholder, không tạo roadmap sơ sài.',
    'Quy mô phải đủ để bao phủ tài liệu; với khóa Học + Thi + Phỏng vấn cần tối thiểu 3 mô-đun và 9 bài.',
    input.guidance && `Ghi chú thêm của người dùng: ${input.guidance}`,
    'Ưu tiên nội dung có căn cứ trong nguồn. Phần nào là suy luận phải thể hiện thận trọng.',
  ]
    .filter(Boolean)
    .join('\n');

  const providerMetadata = documentCourseProviderMetadata();
  const job = await db.generationJob.create({
    data: {
      idempotencyKey: crypto.randomUUID(),
      userId: user.id,
      kind: 'FULL_COURSE',
      userPrompt: prompt,
      settingsJson: toJson({ ...input, sourceIds, language: 'vi' }),
      provider: providerMetadata.provider,
      model: providerMetadata.model,
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
    const provider = getDocumentCourseProvider();
    const blueprint = blueprintSchema.parse(
      await provider.generateCourseBlueprint(context),
    );
    assertBlueprintScope(blueprint, input.template);

    const moduleData = [];
    for (const [modulePosition, courseModule] of blueprint.modules.entries()) {
      const lessonData = await Promise.all(
        courseModule.lessons.map(async (lesson, lessonPosition) => {
          const lessonQuery = `${courseModule.title} ${lesson.title} ${lesson.objectives.join(' ')}`;
          const generated = await generateRichDocumentLesson({
            prompt: `${prompt}\n\nMODULE: ${courseModule.title}\nViết đầy đủ bài học "${lesson.title}". Mục tiêu: ${lesson.objectives.join('; ')}. Không dùng câu placeholder. Nội dung phải đủ để người học tự học và trả lời câu hỏi kiểm tra/phỏng vấn liên quan.`,
            language: context.language,
            sources: selectRelevantSources(sourceContext, lessonQuery),
          });
          const contentSize = JSON.stringify(generated.blocks).length;
          if (generated.blocks.length < 7 || contentSize < 1800) {
            throw new Error(`AI_LESSON_TOO_SHORT:${lesson.slug}`);
          }
          const estimatedMinutes = Math.max(
            12,
            Math.min(35, Math.round(contentSize / 500)),
          );
          const description =
            lesson.description && !lesson.description.startsWith('Bài học được xây dựng')
              ? lesson.description
              : `Học và áp dụng: ${lesson.objectives.join('; ')}`;
          return {
            lesson: { ...lesson, description, estimatedMinutes },
            generated,
            lessonPosition,
          };
        }),
      );
      const moduleObjectives = uniqueObjectives(
        courseModule.lessons.flatMap((lesson) => lesson.objectives),
      );
      const moduleMinutes = lessonData.reduce(
        (sum, item) => sum + item.lesson.estimatedMinutes,
        0,
      );
      moduleData.push({
        courseModule: {
          ...courseModule,
          estimatedMinutes: moduleMinutes,
          learningObjectives: moduleObjectives,
        },
        modulePosition,
        lessonData,
      });
    }

    const courseMinutes = moduleData.reduce(
      (sum, item) => sum + item.courseModule.estimatedMinutes,
      0,
    );

    const course = await db.course.create({
      data: {
        title: blueprint.title,
        slug: `${slugify(blueprint.title)}-${crypto.randomBytes(3).toString('hex')}`,
        shortDescription: blueprint.shortDescription,
        category: blueprint.category,
        level: blueprint.level,
        language: blueprint.language || 'vi',
        estimatedMinutes: courseMinutes,
        ownerId: user.id,
        versions: {
          create: {
            versionNumber: 1,
            createdById: user.id,
            changeSummary: 'Bản nháp hoàn chỉnh do AI tạo từ tài liệu, chờ review',
            modules: {
              create: moduleData.map(
                ({ courseModule, modulePosition, lessonData }) => ({
                  title: courseModule.title,
                  description: courseModule.description,
                  estimatedMinutes: courseModule.estimatedMinutes,
                  learningObjectives: toJson(courseModule.learningObjectives),
                  position: modulePosition,
                  lessons: {
                    create: lessonData.map(
                      ({ lesson, generated, lessonPosition }) => ({
                        title: lesson.title,
                        slug: lesson.slug,
                        description: lesson.description,
                        estimatedMinutes: lesson.estimatedMinutes,
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
