import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';

import {
  hasUnsafeContent,
  validateBlock,
  type BlockKind,
} from '@/modules/content/blocks';
import { slugify } from '@/lib/utils';

export const builderBlockTypes = [
  'HEADING',
  'PARAGRAPH',
  'CALLOUT',
  'EXAMPLE',
  'CODE',
  'DIAGRAM',
  'TABLE',
  'IMAGE',
  'QUIZ_EMBED',
  'FLASHCARD_SET',
  'SCENARIO',
  'ESSAY_PROMPT',
  'INTERVIEW_QUESTION',
  'SOURCE_REFERENCE',
  'SUMMARY',
] as const;

const builderBlockSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1),
  type: z.enum(builderBlockTypes),
  contentJson: z.unknown(),
  isLocked: z.boolean().default(false),
  generatedByAI: z.boolean().default(false),
});

const builderLessonSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1),
  title: z.string().min(1).max(240),
  slug: z.string().max(240).optional().default(''),
  description: z.string().max(5000).default(''),
  estimatedMinutes: z.number().int().positive().nullable().default(null),
  learningObjectives: z.array(z.string().min(1).max(500)).max(30).default([]),
  blocks: z.array(builderBlockSchema).min(1).max(200),
});

const builderModuleSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1),
  title: z.string().min(1).max(240),
  description: z.string().max(5000).default(''),
  estimatedMinutes: z.number().int().positive().nullable().default(null),
  learningObjectives: z.array(z.string().min(1).max(500)).max(30).default([]),
  lessons: z.array(builderLessonSchema).min(1).max(100),
});

export const courseBuilderSchema = z.object({
  courseId: z.string().min(1),
  versionId: z.string().min(1),
  revision: z.number().int().positive(),
  title: z.string().min(3).max(240),
  shortDescription: z.string().min(10).max(5000),
  category: z.string().min(1).max(120),
  level: z.string().min(1).max(120),
  language: z.string().min(2).max(20).default('vi'),
  estimatedMinutes: z.number().int().positive().nullable().default(null),
  coverImageUrl: z.string().url().nullable().default(null),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('PRIVATE'),
  changeSummary: z.string().max(2000).default(''),
  modules: z.array(builderModuleSchema).min(1).max(50),
});

export type CourseBuilderInput = z.input<typeof courseBuilderSchema>;
export type CourseBuilderState = z.output<typeof courseBuilderSchema>;

type FullVersion = Prisma.CourseVersionGetPayload<{
  include: {
    course: true;
    modules: {
      orderBy: { position: 'asc' };
      include: {
        lessons: {
          orderBy: { position: 'asc' };
          include: {
            blocks: { orderBy: { position: 'asc' } };
          };
        };
      };
    };
  };
}>;

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function normalizeCover(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stateFromVersion(version: FullVersion): CourseBuilderState {
  return {
    courseId: version.courseId,
    versionId: version.id,
    revision: version.revision,
    title: version.course.title,
    shortDescription: version.course.shortDescription,
    category: version.course.category,
    level: version.course.level,
    language: version.course.language,
    estimatedMinutes: version.course.estimatedMinutes,
    coverImageUrl: version.course.coverImageUrl,
    visibility: version.course.visibility,
    changeSummary: version.changeSummary ?? '',
    modules: version.modules.map((courseModule) => ({
      id: courseModule.id,
      clientId: courseModule.id,
      title: courseModule.title,
      description: courseModule.description,
      estimatedMinutes: courseModule.estimatedMinutes,
      learningObjectives: Array.isArray(courseModule.learningObjectives)
        ? courseModule.learningObjectives.map(String)
        : [],
      lessons: courseModule.lessons.map((lesson) => ({
        id: lesson.id,
        clientId: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        estimatedMinutes: lesson.estimatedMinutes,
        learningObjectives: Array.isArray(lesson.learningObjectives)
          ? lesson.learningObjectives.map(String)
          : [],
        blocks: lesson.blocks.map((block) => ({
          id: block.id,
          clientId: block.id,
          type: block.type,
          contentJson: block.contentJson,
          isLocked: block.isLocked,
          generatedByAI: block.generatedByAI,
        })),
      })),
    })),
  };
}

export async function getCourseBuilderState(
  db: PrismaClient,
  courseId: string,
): Promise<CourseBuilderState | null> {
  const draft = await db.courseVersion.findFirst({
    where: { courseId, status: 'DRAFT' },
    orderBy: { versionNumber: 'desc' },
    include: {
      course: true,
      modules: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
            include: { blocks: { orderBy: { position: 'asc' } } },
          },
        },
      },
    },
  });

  return draft ? stateFromVersion(draft) : null;
}

function validateBlocks(input: CourseBuilderState) {
  for (const courseModule of input.modules) {
    for (const lesson of courseModule.lessons) {
      for (const block of lesson.blocks) {
        validateBlock(block.type as BlockKind, block.contentJson);
        if (hasUnsafeContent(block.contentJson)) {
          throw new Error('UNSAFE_BLOCK_CONTENT');
        }
      }
    }
  }
}

function lessonSlug(title: string, requested: string, used: Set<string>) {
  const base = slugify(requested || title) || 'bai-hoc';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export async function persistCourseBuilder(
  db: PrismaClient,
  actorId: string,
  rawInput: CourseBuilderInput,
) {
  const input = courseBuilderSchema.parse({
    ...rawInput,
    coverImageUrl: normalizeCover(rawInput.coverImageUrl),
  });
  validateBlocks(input);

  await db.$transaction(async (transaction) => {
    const existing = await transaction.courseVersion.findFirst({
      where: {
        id: input.versionId,
        courseId: input.courseId,
        status: 'DRAFT',
      },
      include: {
        modules: {
          include: {
            lessons: { include: { blocks: true } },
          },
        },
      },
    });

    if (!existing) throw new Error('DRAFT_NOT_FOUND');
    if (existing.revision !== input.revision) throw new Error('CONFLICT');

    const existingModules = new Map(existing.modules.map((item) => [item.id, item]));
    const inputModuleIds = new Set(input.modules.flatMap((item) => (item.id ? [item.id] : [])));

    for (const id of inputModuleIds) {
      if (!existingModules.has(id)) throw new Error('INVALID_MODULE');
    }

    // Move old positions away first so swaps do not violate composite unique keys.
    await transaction.module.updateMany({
      where: { versionId: existing.id },
      data: { position: { increment: 10000 } },
    });
    for (const courseModule of existing.modules) {
      await transaction.lesson.updateMany({
        where: { moduleId: courseModule.id },
        data: { position: { increment: 10000 } },
      });
      for (const lesson of courseModule.lessons) {
        await transaction.lessonBlock.updateMany({
          where: { lessonId: lesson.id },
          data: { position: { increment: 10000 } },
        });
      }
    }

    for (const oldModule of existing.modules) {
      if (!inputModuleIds.has(oldModule.id)) {
        await transaction.module.delete({ where: { id: oldModule.id } });
      }
    }

    for (const [modulePosition, courseModule] of input.modules.entries()) {
      let moduleId = courseModule.id;
      const oldModule = moduleId ? existingModules.get(moduleId) : undefined;

      if (oldModule) {
        await transaction.module.update({
          where: { id: oldModule.id },
          data: {
            title: courseModule.title,
            description: courseModule.description,
            estimatedMinutes: courseModule.estimatedMinutes,
            learningObjectives: asInputJson(courseModule.learningObjectives),
            position: modulePosition,
          },
        });
      } else {
        const created = await transaction.module.create({
          data: {
            versionId: existing.id,
            title: courseModule.title,
            description: courseModule.description,
            estimatedMinutes: courseModule.estimatedMinutes,
            learningObjectives: asInputJson(courseModule.learningObjectives),
            position: modulePosition,
          },
        });
        moduleId = created.id;
      }

      if (!moduleId) throw new Error('MODULE_CREATE_FAILED');

      const oldLessons = oldModule?.lessons ?? [];
      const oldLessonMap = new Map(oldLessons.map((item) => [item.id, item]));
      const inputLessonIds = new Set(courseModule.lessons.flatMap((item) => (item.id ? [item.id] : [])));
      for (const id of inputLessonIds) {
        if (!oldLessonMap.has(id)) throw new Error('INVALID_LESSON');
      }
      for (const oldLesson of oldLessons) {
        if (!inputLessonIds.has(oldLesson.id)) {
          await transaction.lesson.delete({ where: { id: oldLesson.id } });
        }
      }

      const usedSlugs = new Set<string>();
      for (const [lessonPosition, lesson] of courseModule.lessons.entries()) {
        const oldLesson = lesson.id ? oldLessonMap.get(lesson.id) : undefined;
        const slug = lessonSlug(lesson.title, lesson.slug, usedSlugs);
        let lessonId = oldLesson?.id;

        if (oldLesson) {
          await transaction.lesson.update({
            where: { id: oldLesson.id },
            data: {
              moduleId,
              title: lesson.title,
              slug,
              description: lesson.description,
              estimatedMinutes: lesson.estimatedMinutes,
              learningObjectives: asInputJson(lesson.learningObjectives),
              position: lessonPosition,
            },
          });
        } else {
          const created = await transaction.lesson.create({
            data: {
              moduleId,
              title: lesson.title,
              slug,
              description: lesson.description,
              estimatedMinutes: lesson.estimatedMinutes,
              learningObjectives: asInputJson(lesson.learningObjectives),
              position: lessonPosition,
            },
          });
          lessonId = created.id;
        }

        if (!lessonId) throw new Error('LESSON_CREATE_FAILED');

        const oldBlocks = oldLesson?.blocks ?? [];
        const oldBlockMap = new Map(oldBlocks.map((item) => [item.id, item]));
        const inputBlockIds = new Set(lesson.blocks.flatMap((item) => (item.id ? [item.id] : [])));
        for (const id of inputBlockIds) {
          if (!oldBlockMap.has(id)) throw new Error('INVALID_BLOCK');
        }
        for (const oldBlock of oldBlocks) {
          if (!inputBlockIds.has(oldBlock.id)) {
            await transaction.lessonBlock.delete({ where: { id: oldBlock.id } });
          }
        }

        for (const [blockPosition, block] of lesson.blocks.entries()) {
          const oldBlock = block.id ? oldBlockMap.get(block.id) : undefined;
          let blockId = oldBlock?.id;
          const data = {
            lessonId,
            type: block.type,
            position: blockPosition,
            contentJson: asInputJson(block.contentJson),
            isLocked: block.isLocked,
            generatedByAI: block.generatedByAI,
            updatedById: actorId,
          } satisfies Prisma.LessonBlockUncheckedUpdateInput;

          if (oldBlock) {
            await transaction.lessonBlock.update({
              where: { id: oldBlock.id },
              data,
            });
          } else {
            const created = await transaction.lessonBlock.create({
              data: {
                ...data,
                createdById: actorId,
              } as Prisma.LessonBlockUncheckedCreateInput,
            });
            blockId = created.id;
          }

          if (!blockId) throw new Error('BLOCK_CREATE_FAILED');

          await transaction.blockCitation.deleteMany({ where: { blockId } });
          if (
            block.type === 'SOURCE_REFERENCE' &&
            typeof block.contentJson === 'object' &&
            block.contentJson !== null &&
            'chunkIds' in block.contentJson &&
            Array.isArray((block.contentJson as { chunkIds?: unknown }).chunkIds)
          ) {
            const requested = (block.contentJson as { chunkIds: unknown[] }).chunkIds.filter(
              (value): value is string => typeof value === 'string',
            );
            if (requested.length) {
              const valid = await transaction.sourceChunk.findMany({
                where: { id: { in: requested } },
                select: { id: true },
              });
              if (valid.length !== new Set(requested).size) {
                throw new Error('INVALID_SOURCE_REFERENCE');
              }
              await transaction.blockCitation.createMany({
                data: valid.map((chunk) => ({ blockId, chunkId: chunk.id })),
                skipDuplicates: true,
              });
            }
          }
        }
      }
    }

    await transaction.course.update({
      where: { id: input.courseId },
      data: {
        title: input.title,
        shortDescription: input.shortDescription,
        category: input.category,
        level: input.level,
        language: input.language,
        estimatedMinutes: input.estimatedMinutes,
        coverImageUrl: input.coverImageUrl,
        visibility: input.visibility,
      },
    });

    const updated = await transaction.courseVersion.updateMany({
      where: { id: input.versionId, revision: input.revision, status: 'DRAFT' },
      data: {
        changeSummary: input.changeSummary || null,
        revision: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new Error('CONFLICT');

    await transaction.auditLog.create({
      data: {
        actorId,
        action: 'COURSE_DRAFT_SAVED',
        entityType: 'CourseVersion',
        entityId: input.versionId,
        metadata: { revision: input.revision + 1 },
      },
    });
  });

  const state = await getCourseBuilderState(db, input.courseId);
  if (!state) throw new Error('DRAFT_NOT_FOUND');
  return state;
}
