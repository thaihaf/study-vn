-- Initial PostgreSQL schema generated from prisma/schema.prisma.

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CONTENT_ADMIN', 'REVIEWER', 'INSTRUCTOR', 'LEARNER');

CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

CREATE TYPE "BlockType" AS ENUM ('HEADING', 'PARAGRAPH', 'CALLOUT', 'EXAMPLE', 'CODE', 'DIAGRAM', 'TABLE', 'IMAGE', 'QUIZ_EMBED', 'FLASHCARD_SET', 'SCENARIO', 'ESSAY_PROMPT', 'INTERVIEW_QUESTION', 'SOURCE_REFERENCE', 'SUMMARY');

CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_TEXT', 'ESSAY', 'CODE_REVIEW', 'SCENARIO');

CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'MOCK_EXAM');

CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_DOCUMENT', 'OFFICIAL_PUBLICATION', 'THIRD_PARTY_MATERIAL', 'ADMIN_WRITTEN', 'WEB_REFERENCE', 'OTHER');

CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'COMMENT');

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMP(3),
  "passwordHash" TEXT,
  "role" "Role" DEFAULT 'LEARNER' NOT NULL,
  "canPublish" BOOLEAN DEFAULT FALSE NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP(3) NOT NULL,
  UNIQUE ("identifier", "token")
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL
);

CREATE TABLE "Course" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "shortDescription" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "category" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "estimatedMinutes" INTEGER,
  "language" TEXT DEFAULT 'vi' NOT NULL,
  "visibility" "Visibility" DEFAULT 'PRIVATE' NOT NULL,
  "ownerId" TEXT NOT NULL,
  "currentPublishedVersionId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE "CourseVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "VersionStatus" DEFAULT 'DRAFT' NOT NULL,
  "changeSummary" TEXT,
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "publishedById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "revision" INTEGER DEFAULT 1 NOT NULL,
  UNIQUE ("courseId", "versionNumber")
);

CREATE TABLE "Module" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "versionId" TEXT NOT NULL,
  "stableId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT DEFAULT '' NOT NULL,
  "position" INTEGER NOT NULL,
  "estimatedMinutes" INTEGER,
  "learningObjectives" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("versionId", "position")
);

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "moduleId" TEXT NOT NULL,
  "stableId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT DEFAULT '' NOT NULL,
  "position" INTEGER NOT NULL,
  "estimatedMinutes" INTEGER,
  "learningObjectives" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("moduleId", "slug"),
  UNIQUE ("moduleId", "position")
);

CREATE TABLE "LessonBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "type" "BlockType" NOT NULL,
  "position" INTEGER NOT NULL,
  "contentJson" JSONB NOT NULL,
  "isLocked" BOOLEAN DEFAULT FALSE NOT NULL,
  "generatedByAI" BOOLEAN DEFAULT FALSE NOT NULL,
  "generationJobId" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  UNIQUE ("lessonId", "position")
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "versionId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" "ReviewDecision" NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL
);

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "enrolledAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  UNIQUE ("userId", "courseId")
);

CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "interactionSeconds" INTEGER DEFAULT 0 NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("userId", "lessonId")
);

CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "blockId" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  UNIQUE ("userId", "lessonId", "blockId")
);

CREATE TABLE "UserNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "blockId" TEXT,
  "content" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL
);

CREATE TABLE "QuestionBank" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT DEFAULT '' NOT NULL
);

CREATE TABLE "Topic" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE
);

CREATE TABLE "Question" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bankId" TEXT NOT NULL,
  "topicId" TEXT,
  "prompt" TEXT NOT NULL,
  "type" "QuestionType" NOT NULL,
  "difficulty" INTEGER DEFAULT 1 NOT NULL,
  "explanation" TEXT,
  "referenceAnswer" TEXT,
  "rubricJson" JSONB,
  "status" "ContentStatus" DEFAULT 'DRAFT' NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "QuestionChoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "position" INTEGER NOT NULL,
  UNIQUE ("questionId", "position")
);

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT DEFAULT '' NOT NULL,
  "type" "AssessmentType" NOT NULL,
  "timeLimitMinutes" INTEGER,
  "passScore" INTEGER DEFAULT 70 NOT NULL,
  "randomizeQuestions" BOOLEAN DEFAULT FALSE NOT NULL,
  "randomizeChoices" BOOLEAN DEFAULT FALSE NOT NULL,
  "feedbackMode" TEXT DEFAULT 'AFTER_SUBMISSION' NOT NULL,
  "maximumAttempts" INTEGER,
  "published" BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE "AssessmentQuestion" (
  "assessmentId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "points" INTEGER DEFAULT 1 NOT NULL PRIMARY KEY,
  PRIMARY KEY ("assessmentId", "questionId")
);

CREATE TABLE "AssessmentAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assessmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AttemptStatus" DEFAULT 'IN_PROGRESS' NOT NULL,
  "score" DOUBLE PRECISION,
  "startedAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "submittedAt" TIMESTAMP(3)
);

CREATE TABLE "AttemptQuestionSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "type" "QuestionType" NOT NULL,
  "choicesJson" JSONB NOT NULL,
  "rubricJson" JSONB,
  "explanation" TEXT,
  "correctAnswerJson" JSONB NOT NULL,
  "position" INTEGER NOT NULL
);

CREATE TABLE "AttemptAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "answerJson" JSONB NOT NULL,
  "isCorrect" BOOLEAN,
  "pointsAwarded" DOUBLE PRECISION,
  "feedbackJson" JSONB,
  UNIQUE ("attemptId", "snapshotId")
);

CREATE TABLE "TopicProficiency" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "correct" INTEGER DEFAULT 0 NOT NULL,
  "total" INTEGER DEFAULT 0 NOT NULL,
  "score" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  UNIQUE ("userId", "topicId")
);

CREATE TABLE "ReviewItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "intervalDays" INTEGER DEFAULT 1 NOT NULL,
  "ease" DOUBLE PRECISION DEFAULT 2.5 NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  UNIQUE ("userId", "questionId")
);

CREATE TABLE "Source" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "author" TEXT,
  "publisher" TEXT,
  "sourceType" "SourceType" NOT NULL,
  "reliabilityLevel" INTEGER DEFAULT 3 NOT NULL,
  "copyrightNote" TEXT,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL UNIQUE,
  "processingStatus" "ProcessingStatus" DEFAULT 'PENDING' NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE "SourceChunk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "section" TEXT,
  UNIQUE ("sourceId", "position")
);

CREATE TABLE "BlockCitation" (
  "blockId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "label" TEXT PRIMARY KEY,
  PRIMARY KEY ("blockId", "chunkId")
);

CREATE TABLE "QuestionCitation" (
  "questionId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL PRIMARY KEY,
  PRIMARY KEY ("questionId", "chunkId")
);

CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "status" "JobStatus" DEFAULT 'QUEUED' NOT NULL,
  "kind" TEXT NOT NULL,
  "userPrompt" TEXT NOT NULL,
  "settingsJson" JSONB NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputSourceIds" JSONB NOT NULL,
  "targetEntityId" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "usageJson" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "retryCount" INTEGER DEFAULT 0 NOT NULL,
  "outputSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL
);

CREATE TABLE "GenerationArtifact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT 'now(' NOT NULL
);
