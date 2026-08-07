AGENTS.md — Build Contract for the AI Learning Platform

0. Primary instruction

Build the complete production-ready MVP described in this file.

Do not stop after planning, scaffolding, creating documentation, or implementing only one screen. Continue milestone by milestone until the acceptance checklist is satisfied. Work autonomously, make reasonable implementation decisions, and document assumptions. Ask the user only when a missing secret, unavailable external service, or destructive decision makes progress impossible.

Before coding:

Inspect the repository.

Create a concise implementation checklist in TASKS.md.

Choose compatible stable package versions.

Start implementation immediately.

During implementation:

Keep TASKS.md updated.

Run formatting, lint, typecheck, unit tests, integration tests, and end-to-end smoke tests.

Fix failures rather than disabling checks.

Review the final diff for security, regressions, unfinished placeholders, and inconsistent UX.

Do not claim completion while critical flows are mocked, broken, or untested.

The repository may initially be empty. Initialize it when necessary.

1. Product mission

Create a generic Vietnamese-first learning platform inspired by the broad idea of roadmap-based online learning, but do not copy LearningVN or any other product’s branding, text, illustrations, assets, source code, page layout, or pixel-level visual design.

The platform must support two experiences in one codebase:

Learner site

Browse published courses.

Enroll and follow structured learning roadmaps.

Study lessons.

Take quizzes and mock exams.

Practice essays and text-based interviews.

Track progress, mistakes, notes, bookmarks, and weak topics.

Admin site

Manage users and roles.

Create courses manually.

Prompt AI directly from the admin interface to generate a course outline, modules, lessons, questions, essays, and interview sets.

Upload source documents and generate source-grounded content.

Edit generated content.

Save as draft, submit for review, or publish immediately when authorized.

Version, preview, archive, and restore content.

The application must be domain-neutral. Do not hardcode Agribank, banking, programming, or any other specific subject into the schema or business logic. Courses for Agribank preparation will be created later by an admin using the finished platform.

2. MVP scope

Required in the MVP

Responsive public landing page.

Authentication with email and password.

Password reset flow suitable for local development and production integration.

Server-side role-based authorization.

Learner dashboard.

Course discovery and course detail pages.

Enrollment.

Roadmap navigation: Course → Version → Module → Lesson → Lesson blocks.

Lesson completion and course progress.

Private bookmarks and notes.

Question banks.

Quizzes and mock exams.

Attempt history and review of incorrect answers.

Essay practice.

Text-based mock interview practice.

Admin dashboard.

Course builder with manual editing and reordering.

AI course generation from an admin prompt.

Source document upload and extraction.

Citations linking generated content to source chunks.

Draft, review, publish, archive, version, and restore workflows.

Audit logs for important admin actions.

Vietnamese default UI with i18n-ready implementation.

Accessibility basics and keyboard navigation.

Automated tests and production build.

Docker-based local PostgreSQL setup.

Deployment and environment documentation.

Explicitly out of scope

Do not implement these in the MVP:

Native mobile apps.

Payment or subscriptions.

Social feed, chat, group learning, or public comments.

Voice interview.

Video hosting.

Certificates.

Competitive coding.

Execution of arbitrary learner code.

Complex recommendation ML.

Full vector database infrastructure.

Multi-tenant organizations.

SCORM.

Real-time collaborative editing.

Design extension points for these features, but do not spend MVP time implementing them.

3. Technology decisions

Use a modular monolith.

Required stack

Next.js App Router.

TypeScript with strict mode.

React.

PostgreSQL.

Prisma ORM.

pnpm.

Tailwind CSS.

shadcn/ui or equivalent accessible headless components.

Zod for all external, form, API, file metadata, and AI-output validation.

Auth.js with database-backed sessions and Prisma adapter. If the current stable Auth.js release is incompatible, use a maintained equivalent and document the reason.

React Hook Form for complex forms.

TipTap for rich text editing, while storing course content as typed blocks rather than one HTML document.

dnd-kit for drag-and-drop reordering.

Vitest for unit and service tests.

Playwright for end-to-end tests.

Docker Compose for PostgreSQL.

Official OpenAI JavaScript SDK for AI generation.

OpenAI Responses API with Structured Outputs / JSON schema.

Model selected through OPENAI_MODEL; never hardcode a model as the only supported option.

Mermaid for diagrams rendered in lessons.

A safe HTML sanitizer before rendering rich content.

Architecture rules

One deployable application.

Use route groups to separate public, learner, authentication, and admin areas.

Put domain logic under src/modules.

Page components must not contain database or complex business logic.

Server-side authorization is mandatory for every admin mutation and protected read.

Prefer Server Components for read-heavy pages.

Use Client Components only where interaction requires them.

Use Server Actions or typed route handlers consistently; do not mix patterns randomly.

Abstract the AI provider behind an interface.

Abstract source retrieval so database text search can later be replaced by vector search.

Use a database-backed job table for AI generation; Redis is not required in the MVP.

Use transactions for publish/version operations and grading operations that update multiple records.

Suggested structure:

src/
app/
(public)/
(auth)/
(learner)/
admin/
api/
components/
ui/
shared/
modules/
auth/
users/
courses/
content/
sources/
ai/
assessments/
progress/
interviews/
publishing/
audit/
lib/
server/
prisma/
tests/

4. Roles and permissions

Use these roles:

SUPER_ADMIN

CONTENT_ADMIN

REVIEWER

INSTRUCTOR

LEARNER

Permissions:

SUPER_ADMIN

Full system access.

Manage roles.

Manage system AI settings.

Publish, archive, restore, and delete where allowed.

View audit logs.

CONTENT_ADMIN

Create and edit courses.

Upload sources.

Run AI generation.

Manage questions and assessments.

Save draft.

Submit for review.

Publish only when granted explicit publishing permission or when the role policy allows it.

REVIEWER

View drafts submitted for review.

Add review comments.

Approve or reject.

Cannot silently modify published content.

INSTRUCTOR

View course and learner aggregate progress.

Create or edit assigned content only if assignment support is implemented.

No user-role administration.

LEARNER

Access only published content.

Enroll, study, take assessments, create private notes, and view own progress.

All authorization must be enforced on the server. UI visibility is not authorization.

Seed:

One super admin from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.

One optional learner for local development only.

Do not seed subject-matter courses.

Never run unsafe default credentials automatically in production.

5. Content model

Content hierarchy:

Course
└── CourseVersion
└── Module
└── Lesson
└── LessonBlock

Course

Fields should include:

id

title

slug

shortDescription

coverImageUrl

category

level

estimatedMinutes

language

visibility

ownerId

currentPublishedVersionId

createdAt

updatedAt

archivedAt

CourseVersion

Statuses:

DRAFT

IN_REVIEW

PUBLISHED

ARCHIVED

Fields:

id

courseId

versionNumber

status

changeSummary

createdById

reviewedById

publishedById

submittedAt

reviewedAt

publishedAt

createdAt

Published versions are immutable. Editing a published course must create or update a draft version. Restoring an old version creates a new draft copied from that version; never rewrite history.

Module and Lesson

Both need:

title

description

position

estimatedMinutes

learningObjectives where appropriate

stable IDs within a version

createdAt / updatedAt

LessonBlock

Supported types:

HEADING

PARAGRAPH

CALLOUT

EXAMPLE

CODE

DIAGRAM

TABLE

IMAGE

QUIZ_EMBED

FLASHCARD_SET

SCENARIO

ESSAY_PROMPT

INTERVIEW_QUESTION

SOURCE_REFERENCE

SUMMARY

Fields:

id

lessonId

type

position

contentJson

isLocked

generatedByAI

generationJobId

createdById

updatedById

createdAt

updatedAt

Validate contentJson by a specific Zod schema per block type.

Locked blocks must never be overwritten by AI regeneration.

6. Learner experience

Public routes

/

/explore

/courses/[slug]

/login

/register

/forgot-password

Learner routes

/dashboard

/learn/[courseSlug]/[lessonSlug]

/practice

/assessments/[id]

/attempts/[id]/result

/interviews

/interviews/[id]

/bookmarks

/notes

/profile

Landing page

Create an original, calm, modern design. Include:

Clear product value.

Featured published courses.

How the learning workflow works.

Admin-created structured learning as a concept.

Sign-in and explore calls to action.

Do not imitate LearningVN’s exact appearance.

Course detail

Show:

Title, description, level, language, estimated time.

Roadmap/module summary.

Number of lessons and assessments.

Enrollment or continue button.

Progress when enrolled.

Only published version content.

Learning page layout

Desktop:

Left sidebar: course modules and lessons.

Center: lesson content.

Right area or floating controls: table of contents, notes, bookmark.

Mobile:

Collapsible course navigation.

Readable single-column lesson layout.

Persistent previous/next controls without covering content.

Features:

Mark complete.

Automatic completion option only after meaningful interaction, not merely page load.

Previous/next lesson.

Bookmark.

Private note.

Progress indicator.

Render Mermaid safely.

Render code blocks with syntax highlighting.

Never expose draft content.

Learner dashboard

Show:

Continue learning.

Enrolled courses.

Overall progress.

Recent assessment attempts.

Incorrect-question review queue.

Weak topics.

Recent bookmarks.

A simple daily target.

Avoid manipulative engagement mechanics.

7. Question banks, quizzes, and mock exams

Question types:

SINGLE_CHOICE

MULTIPLE_CHOICE

TRUE_FALSE

SHORT_TEXT

ESSAY

CODE_REVIEW

SCENARIO

Entities:

QuestionBank

Topic

Question

QuestionChoice

Assessment

AssessmentQuestion

AssessmentAttempt

AttemptQuestionSnapshot

AttemptAnswer

Question fields:

prompt

type

difficulty

topicId

explanation

referenceAnswer where appropriate

rubricJson where appropriate

source citations

status

authorId

Assessment fields:

title

description

type: quiz or mock exam

timeLimitMinutes

passScore

randomizeQuestions

randomizeChoices

feedbackMode

maximumAttempts

published status

Rules:

A single-choice question has exactly one correct choice.

A multiple-choice question has one or more correct choices.

Do not send answer keys or correctness flags to the client before submission.

Store an immutable snapshot of every question shown in an attempt.

Auto-grade objective questions.

For short text, use configurable normalized exact-match rules only when appropriate.

Essays and scenarios must use rubric-based feedback. Do not present AI feedback as an official or deterministic score.

Show explanations only according to assessment feedback settings.

Allow learners to review incorrect answers.

Track performance by topic.

8. Essay and text interview practice

Essay practice

Each prompt supports:

title

prompt

suggestedMinutes

requiredConcepts

suggestedOutline

rubric

referenceAnswer

commonMistakes

source citations

Learners can:

write an answer

save draft

submit

self-review against rubric

optionally request AI feedback

retry

compare attempts

AI feedback categories:

factual correctness

relevance

structure

completeness

clarity

missing concepts

Interview practice

Each question supports:

mainQuestion

purpose

expectedAnswerStructure

evaluationRubric

followUpQuestions

commonWeakAnswers

referenceAnswer

topic

difficulty

Learners answer in text. Store the rubric snapshot used for feedback. Clearly label AI feedback as practice guidance, not an official hiring result.

9. Admin experience

Admin routes:

/admin

/admin/courses

/admin/courses/new

/admin/courses/[id]/edit

/admin/courses/[id]/preview

/admin/generate

/admin/generation-jobs

/admin/sources

/admin/questions

/admin/assessments

/admin/interviews

/admin/reviews

/admin/users

/admin/audit-logs

/admin/settings

Admin dashboard

Show:

course counts by status

pending reviews

recent AI jobs

failed generation jobs

recent publish events

source processing status

basic learner activity summaries

Course builder

Must support:

Create metadata.

Add, edit, duplicate, delete, and reorder modules.

Add, edit, duplicate, delete, and reorder lessons.

Add, edit, duplicate, delete, and reorder typed blocks.

Autosave with visible save status.

Manual save.

Lock/unlock generated blocks.

Preview learner view.

Validation panel.

Version history.

Diff summary before publication.

Submit for review.

Publish now when authorized.

Archive.

Restore previous version into a new draft.

Confirmation for destructive operations.

Optimistic concurrency or version checks to prevent accidental overwrite.

Review workflow

Content admin submits a draft.

Reviewer sees validation results and change summary.

Reviewer can comment, approve, or reject.

Rejection returns it to draft with comments.

Approval records reviewer and timestamp.

Publishing is a separate audited action unless role policy allows approval-and-publish.

10. AI content generation

Admin workflow

The admin generation screen must let an admin configure:

free-form prompt

course title

target audience

current learner level

desired outcome

duration or lesson count

language

tone

selected source documents

desired content types

generation mode:

outline only

selected modules

selected lessons

full course

questions only

essay set

interview set

output action:

save as draft

submit for review

publish after successful validation when authorized

Recommended flow:

Generate course blueprint.

Admin edits the blueprint.

Generate selected lesson content.

Validate.

Show editable preview.

Save or publish.

Do not generate a large course in one uncontrolled request. Split work into jobs, usually one lesson or one bounded group of questions per AI call.

AI architecture

Create an AIProvider interface with methods such as:

generateCourseBlueprint

generateLesson

generateQuestions

generateEssaySet

generateInterviewSet

evaluateEssay

evaluateInterviewAnswer

Use the official OpenAI SDK implementation behind the interface.

Use:

Responses API

server-side requests

Structured Outputs with JSON Schema

store: false by default for course-generation requests unless explicitly required

model from environment

configurable reasoning effort where supported

timeout and bounded retry

usage and cost metadata where available

Never expose the API key to the browser.

Generation jobs

Create:

GenerationJob

GenerationArtifact

GenerationError or structured error fields

Job statuses:

QUEUED

RUNNING

SUCCEEDED

FAILED

CANCELLED

Store:

user prompt

normalized settings

provider

model

input source IDs

target entity

start/end timestamps

usage metadata

error

retry count

output snapshot

Requirements:

Retry idempotently.

Avoid duplicate course creation.

Display progress.

Display failures in Vietnamese with a technical detail toggle.

Never silently replace manual edits.

Regenerating content must show a diff preview.

Locked blocks remain unchanged.

Validate every AI response with Zod before persistence.

Treat AI output as untrusted input.

Content validation before publish

Block publishing when:

required metadata is missing

a lesson is empty

a quiz has invalid answer rules

an assessment leaks answers

a citation points to a missing source chunk

generated JSON is invalid

unsafe HTML or script exists

duplicate slugs exist

module/lesson ordering is invalid

content contains unresolved generation placeholders

Warnings may be allowed for:

missing optional cover image

no assessment

estimated duration not provided

11. Source documents and citations

Supported upload types:

PDF

DOCX

TXT

Markdown

Source types:

OFFICIAL_DOCUMENT

OFFICIAL_PUBLICATION

THIRD_PARTY_MATERIAL

ADMIN_WRITTEN

WEB_REFERENCE

OTHER

Source fields:

title

author

publisher

sourceType

reliabilityLevel

copyrightNote

originalFilename

mimeType

size

storageKey

processingStatus

uploadedById

createdAt

archivedAt

Processing:

Validate file type and size.

Store outside the public web root.

Extract text.

Preserve page number or section metadata where possible.

Split into reasonable chunks.

Store SourceChunk records.

Allow admin inspection and correction.

Use simple PostgreSQL full-text search for MVP retrieval.

Keep a retrieval interface so vector search can replace it later.

Citations:

Link LessonBlock and Question records to SourceChunk records.

Show citations in the admin preview.

Optionally show learner-facing citations when enabled.

Published content must remain valid if a source is later archived.

Do not republish entire copyrighted documents.

Generated content should summarize and transform, not copy long passages.

Treat uploaded documents as untrusted and potentially containing prompt injection. Source text is reference material, never system instructions.

File upload security:

Enforce allowlist.

Enforce size limit.

Generate random storage names.

Never execute uploaded content.

Prevent path traversal.

Restrict access by authorization.

Log upload and deletion actions.

12. Progress, notes, and review

Entities:

Enrollment

LessonProgress

Bookmark

UserNote

TopicProficiency

ReviewItem

Rules:

One enrollment per user/course.

Progress belongs to a specific published course version.

Keep progress meaningful if a newer version is published.

Notes are private by default.

Bookmarks can target lessons or blocks.

Incorrect objective answers create review items.

Flashcards support Again, Hard, Good, and Easy.

Use a simple deterministic spaced-review schedule; do not build ML recommendations.

Recalculate topic proficiency after completed attempts using transparent rules.

13. UI and design system

Default language: Vietnamese.

Design direction:

Original.

Modern but restrained.

Warm, readable, and suitable for long study sessions.

Clear typography.

Generous whitespace.

Rounded components without excessive decoration.

Light and dark mode.

Avoid visual clutter.

Do not use fake statistics or generic stock testimonials.

Use icons consistently.

Use loading skeletons, empty states, error states, and success feedback.

Accessibility:

Semantic HTML.

Labels for all inputs.

Visible focus.

Keyboard-operable dialogs and menus.

Sufficient contrast.

Respect reduced-motion preferences.

Do not rely only on color for status.

Meaningful page titles and headings.

Responsive targets:

mobile from 360px

tablet

desktop

wide desktop

All user-facing strings must go through a lightweight i18n dictionary structure even if only Vietnamese is fully populated in the MVP.

14. Security requirements

Hash passwords using an appropriate modern password hash supported by the auth library.

Secure, HttpOnly, SameSite cookies.

CSRF protections appropriate to the chosen action/API pattern.

Rate-limit authentication, password reset, AI generation, and file upload actions.

Validate all input with Zod.

Parameterized database access through Prisma.

Sanitize rich text and Mermaid input.

Never render arbitrary scripts.

Prevent IDOR by checking ownership/role on server reads and writes.

Never expose drafts to learners.

Never expose correct answers before assessment submission.

Never log passwords, tokens, API keys, full sensitive documents, or learner answers unnecessarily.

Keep secrets in environment variables.

Include .env.example, never real secrets.

Add audit logs for:

login-sensitive admin events where appropriate

role changes

source upload/archive/delete

course submit/approve/reject/publish/archive/restore

destructive actions

AI publish-now actions

Handle prompt injection from source files by separating trusted developer instructions from untrusted source text.

Add security headers.

Provide safe file-size defaults.

Do not implement arbitrary code execution.

15. Reliability and observability

Structured server logging.

Request or correlation IDs for significant operations.

User-safe error messages plus server-side technical logs.

Health endpoint.

Database readiness check.

AI timeout and retry.

Idempotency for generation retry and publish actions.

Transactional publishing.

Graceful empty states when AI is not configured.

App remains usable for manual course creation without an OpenAI API key.

AI screens clearly explain missing configuration.

No silent catch blocks.

16. Testing requirements

Unit/service tests

Cover at minimum:

role authorization

course-version immutability

restore creates new draft

block schema validation

publish validation

single/multiple choice rules

grading

answer-key secrecy serialization

enrollment uniqueness

progress calculation

review scheduling

AI structured-output validation

locked-block regeneration

idempotent generation retry

source citation integrity

End-to-end tests

Cover at minimum:

Register/login learner.

Super admin login.

Admin manually creates a draft course.

Admin adds module, lesson, and content blocks.

Admin publishes.

Learner discovers and enrolls.

Learner studies and marks lesson complete.

Learner takes quiz and views result.

Learner creates note and bookmark.

Admin uploads a text source and sees extracted chunks.

AI flow using a fake provider creates an editable draft.

Learner cannot access draft routes or answer keys.

Reviewer approves/rejects workflow.

Restore old version creates a new draft.

Tests must not call the real OpenAI API. Use a deterministic fake provider.

Before completion run:

format check

lint

TypeScript typecheck

unit tests

Playwright smoke suite

production build

17. Local development and deployment

Create:

docker-compose.yml for PostgreSQL.

.env.example.

Prisma migrations.

idempotent seed script.

README with exact setup commands.

production deployment guidance.

backup/restore notes.

rollback notes.

Expected local commands should be simple, for example:

pnpm install
docker compose up -d
pnpm prisma:migrate
pnpm db:seed
pnpm dev

Add scripts with clear names:

dev

build

start

lint

typecheck

test

test:e2e

format

format:check

db:migrate

db:seed

Deployment must be vendor-neutral. It may include one concrete example, but do not bind the architecture to one vendor.

18. Implementation milestones

Complete these in order, but continue autonomously through all of them:

Milestone 1 — Foundation

Initialize app.

Configure TypeScript, styling, database, Docker, test frameworks.

Create layouts and navigation.

Create README and environment template.

Milestone 2 — Auth and RBAC

Authentication.

Session management.

Protected learner/admin routes.

User and role management.

Seed super admin.

Authorization tests.

Milestone 3 — Manual content CMS

Data model and migrations.

Course/module/lesson/block CRUD.

Reordering.

Autosave.

Draft/review/publish/archive/version/restore.

Preview.

Audit logs.

Milestone 4 — Learner site

Explore.

Course detail.

Enrollment.

Lesson reader.

Progress.

Notes and bookmarks.

Dashboard.

Milestone 5 — Assessments

Question banks.

Quiz/mock exam builder.

Learner attempts.

Grading.

Results and incorrect review.

Essay and interview practice.

Milestone 6 — Sources

Secure upload.

Extraction.

Chunk inspection.

Search.

Citation links.

Milestone 7 — AI generation

Provider adapter.

Fake provider.

OpenAI provider using Responses API and Structured Outputs.

Admin prompt form.

Blueprint generation.

Lesson/question/essay/interview generation.

Jobs, progress, retry, validation, diff, lock handling.

Draft/review/publish actions.

Milestone 8 — Hardening

Accessibility pass.

Responsive pass.

Security review.

Error handling.

Observability.

Performance improvements.

Complete tests.

Production build and deployment docs.

Do not create subject-specific course content. The finished platform should initially be empty except for users, configuration, and optional non-subject demo data used only in development/test.

19. Definition of done

The MVP is complete only when all conditions below are true:

A new learner can register, log in, browse published courses, enroll, study, save notes/bookmarks, complete a quiz, and view progress.

A super admin can manage roles.

A content admin can create a full course manually without code changes.

An admin can enter one prompt and generate an editable course blueprint.

An admin can generate selected lessons and question sets.

An admin can upload a source document and inspect extracted chunks.

Generated blocks can show source citations.

AI content can be saved as draft.

Authorized users can submit, review, publish, archive, and restore.

Published content is immutable.

Learners cannot see drafts.

Correct answers are not leaked before submission.

Locked blocks are not overwritten.

Manual editing works even without an AI API key.

Vietnamese UI is complete for critical flows.

Responsive learner and admin pages work at mobile and desktop widths.

Accessibility basics are verified.

All migrations and seed scripts work from a clean database.

Formatting, lint, typecheck, unit tests, e2e smoke tests, and production build pass.

No critical TODO, placeholder screen, fake success flow, or unhandled security issue remains.

README explains setup, architecture overview, environment variables, tests, and deployment.

TASKS.md shows every MVP milestone completed and notes any genuinely optional post-MVP work.

At final handoff, provide:

A concise feature summary.

Exact local startup commands.

Seed admin instructions.

Required environment variables.

Test/build results.

Known non-critical limitations.

A list of suggested post-MVP improvements.

Start now and continue until the definition of done is met.
