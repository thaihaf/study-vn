import { Prisma, type PrismaClient } from '@prisma/client';

import {
  hasUnsafeContent,
  validateBlock,
  type BlockKind,
} from '@/modules/content/blocks';

type DB = PrismaClient | Prisma.TransactionClient;

export type Validation = {
  errors: string[];
  warnings: string[];
};

function optionalJsonInput(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | undefined {
  return value === null ? undefined : value;
}

function requiredJsonInput(
  value: Prisma.JsonValue,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

export async function validateVersion(
  db: DB,
  id: string,
): Promise<Validation> {
  const version = await db.courseVersion.findUnique({
    where: { id },
    include: {
      course: true,
      modules: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
            include: {
              blocks: {
                orderBy: { position: 'asc' },
                include: { citations: { include: { chunk: true } } },
              },
            },
          },
        },
      },
    },
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  if (!version) return { errors: ['Không tìm thấy phiên bản'], warnings };

  if (!version.course.title.trim() || !version.course.shortDescription.trim()) {
    errors.push('Thiếu metadata bắt buộc');
  }
  if (!version.course.coverImageUrl) warnings.push('Chưa có ảnh bìa');
  if (!version.course.estimatedMinutes) warnings.push('Chưa có thời lượng');
  if (!version.modules.length) errors.push('Khóa học chưa có mô-đun');

  for (const [moduleIndex, courseModule] of version.modules.entries()) {
    if (courseModule.position !== moduleIndex) {
      errors.push('Thứ tự mô-đun không hợp lệ');
    }
    if (!courseModule.lessons.length) {
      errors.push(`Mô-đun “${courseModule.title}” chưa có bài học`);
    }

    for (const [lessonIndex, lesson] of courseModule.lessons.entries()) {
      if (lesson.position !== lessonIndex) {
        errors.push(`Thứ tự bài “${lesson.title}” không hợp lệ`);
      }
      if (!lesson.blocks.length) {
        errors.push(`Bài “${lesson.title}” chưa có nội dung`);
      }

      for (const [blockIndex, block] of lesson.blocks.entries()) {
        if (block.position !== blockIndex) {
          errors.push(`Thứ tự block trong bài “${lesson.title}” không hợp lệ`);
        }
        try {
          validateBlock(block.type as BlockKind, block.contentJson);
        } catch {
          errors.push(`Block ${block.id} không đúng schema`);
        }
        if (hasUnsafeContent(block.contentJson)) {
          errors.push(`Block ${block.id} chứa nội dung không an toàn`);
        }
        if (/\{\{[^}]+\}\}|\[TODO\]/i.test(JSON.stringify(block.contentJson))) {
          errors.push(`Block ${block.id} còn placeholder`);
        }
        if (block.citations.some((citation) => !citation.chunk)) {
          errors.push(`Block ${block.id} có trích dẫn hỏng`);
        }
      }
    }
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export async function publishVersion(
  db: PrismaClient,
  versionId: string,
  actorId: string,
) {
  return db.$transaction(async (transaction) => {
    const version = await transaction.courseVersion.findUnique({
      where: { id: versionId },
      include: { course: true },
    });
    if (!version) throw new Error('VERSION_NOT_FOUND');
    if (
      version.status === 'PUBLISHED' &&
      version.course.currentPublishedVersionId === version.id
    ) {
      return version;
    }
    if (version.status === 'PUBLISHED' || version.status === 'ARCHIVED') {
      throw new Error('VERSION_IMMUTABLE');
    }

    const validation = await validateVersion(transaction, versionId);
    if (validation.errors.length) {
      throw new Error(`PUBLISH_INVALID:${validation.errors.join('|')}`);
    }

    await transaction.courseVersion.updateMany({
      where: { courseId: version.courseId, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    });
    const published = await transaction.courseVersion.update({
      where: { id: versionId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: actorId,
      },
    });
    await transaction.course.update({
      where: { id: version.courseId },
      data: {
        currentPublishedVersionId: versionId,
        visibility: 'PUBLIC',
        archivedAt: null,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: 'COURSE_PUBLISHED',
        entityType: 'CourseVersion',
        entityId: versionId,
      },
    });
    return published;
  });
}

export async function restoreVersion(
  db: PrismaClient,
  sourceId: string,
  actorId: string,
) {
  return db.$transaction(async (transaction) => {
    const source = await transaction.courseVersion.findUniqueOrThrow({
      where: { id: sourceId },
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: {
                blocks: {
                  orderBy: { position: 'asc' },
                  include: { citations: true },
                },
              },
            },
          },
        },
      },
    });
    const maximum = await transaction.courseVersion.aggregate({
      where: { courseId: source.courseId },
      _max: { versionNumber: true },
    });

    // Keep exactly one active draft. Existing unsent drafts are archived rather
    // than overwritten, so their history remains inspectable.
    await transaction.courseVersion.updateMany({
      where: {
        courseId: source.courseId,
        status: 'DRAFT',
        id: { not: source.id },
      },
      data: { status: 'ARCHIVED' },
    });

    const modules: Prisma.ModuleCreateWithoutVersionInput[] = source.modules.map(
      (courseModule) => {
        const lessons: Prisma.LessonCreateWithoutModuleInput[] =
          courseModule.lessons.map((lesson) => {
            const blocks: Prisma.LessonBlockCreateWithoutLessonInput[] =
              lesson.blocks.map((block) => ({
                type: block.type,
                position: block.position,
                contentJson: requiredJsonInput(block.contentJson),
                isLocked: block.isLocked,
                generatedByAI: block.generatedByAI,
                createdById: actorId,
                updatedById: actorId,
                citations: block.citations.length
                  ? {
                      create: block.citations.map((citation) => ({
                        chunkId: citation.chunkId,
                      })),
                    }
                  : undefined,
              }));

            return {
              stableId: lesson.stableId,
              title: lesson.title,
              slug: lesson.slug,
              description: lesson.description,
              position: lesson.position,
              estimatedMinutes: lesson.estimatedMinutes,
              learningObjectives: optionalJsonInput(lesson.learningObjectives),
              blocks: { create: blocks },
            };
          });

        return {
          stableId: courseModule.stableId,
          title: courseModule.title,
          description: courseModule.description,
          position: courseModule.position,
          estimatedMinutes: courseModule.estimatedMinutes,
          learningObjectives: optionalJsonInput(courseModule.learningObjectives),
          lessons: { create: lessons },
        };
      },
    );

    const restored = await transaction.courseVersion.create({
      data: {
        courseId: source.courseId,
        versionNumber: (maximum._max.versionNumber ?? 0) + 1,
        status: 'DRAFT',
        changeSummary: `Khôi phục từ phiên bản ${source.versionNumber}`,
        createdById: actorId,
        modules: { create: modules },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: 'COURSE_VERSION_RESTORED',
        entityType: 'CourseVersion',
        entityId: restored.id,
        metadata: { sourceVersionId: source.id },
      },
    });
    return restored;
  });
}
