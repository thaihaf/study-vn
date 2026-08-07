# Lộ Trình Việt

Nền tảng học tập tiếng Việt theo roadmap, gồm learner site và admin CMS trong một Next.js modular monolith. Schema/nghiệp vụ trung lập theo lĩnh vực; nội dung chuyên môn được admin tạo sau bằng tay, AI hoặc source-grounded generation.

## Baseline hiện tại

- Next.js App Router + React + TypeScript strict + Tailwind CSS.
- PostgreSQL + Prisma; migration có thể chạy từ database sạch bằng `prisma migrate deploy`.
- Auth.js Credentials + Prisma adapter. **Session hiện dùng JWT strategy** vì Credentials flow trên Auth.js v5 beta không tương thích với database-session strategy đã thử trước đó. JWT chỉ mang `id`, `role`, `canPublish`; mọi authorization quan trọng vẫn được kiểm tra server-side.
- 5 vai trò: `SUPER_ADMIN`, `CONTENT_ADMIN`, `REVIEWER`, `INSTRUCTOR`, `LEARNER`.
- CMS Course → immutable CourseVersion → Module → Lesson → typed LessonBlock; draft/review/publish/archive/restore, builder, validation, revision protection và audit log.
- Learner: explore, enroll, lesson reader, progress, note/bookmark, question bank, quiz/mock exam, attempt snapshot, incorrect-review queue, essay và text interview practice.
- Sources: TXT/Markdown/PDF/DOCX extraction path, chunking/retrieval/citation model và source authorization.
- AI: `AIProvider` abstraction với fake deterministic provider cho test và OpenAI Responses/Structured Outputs cho production; output Zod-validated, job metadata/idempotency và locked-block protection.
- Light/dark, semantic design tokens, reduced motion, responsive reader/admin/builder và Vietnamese-first lightweight i18n.

## Spec-driven development

Repository dùng artifact theo tinh thần [GitHub Spec Kit](https://github.com/github/spec-kit):

```text
.specify/memory/constitution.md
specs/<feature>/spec.md
specs/<feature>/plan.md
specs/<feature>/tasks.md
specs/<feature>/research.md
specs/<feature>/quickstart.md
```

`AGENTS.md` giữ vai trò build contract/phạm vi sản phẩm gốc. Constitution chứa invariant ổn định; từng feature spec ghi requirement/acceptance criteria; plan ghi HOW; tasks map implementation với requirement. Khi implementation phải khác contract cũ, deviation được ghi rõ trong spec/plan thay vì để documentation drift.

Feature baseline hiện tại: `specs/001-mvp-hardening/`.

## Design system

Visual source of truth nằm ở:

```text
design-system/study-vn/MASTER.md
design-system/study-vn/pages/
```

Pattern Master + page override tham khảo UI/UX Pro Max nhưng được điều chỉnh cho product này: **Accessible Soft Minimal**, ưu tiên long-session readability, accessibility, touch interaction, responsive và performance trước decoration. Learner surface ít motion/density thấp; admin/course builder density cao hơn nhưng vẫn dùng cùng semantic tokens.

Các reference repo và adoption policy được ghi tại `docs/reference-patterns.md`. Không copy branding/pixel layout của sản phẩm khác.

## Chạy local từ đầu

Yêu cầu Node.js 20+, npm hoặc pnpm và Docker.

```bash
cp .env.example .env
# Điền AUTH_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`. Health endpoint: `GET /api/health`.

Project vẫn khai báo `pnpm@10.14.0`; các script tương đương có thể chạy bằng `pnpm`. GitHub CI hiện dùng npm để phù hợp lockfile/browser CI hiện tại.

### Seed admin

`npm run db:seed` idempotent, tạo/cập nhật super admin từ `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` (tối thiểu 12 ký tự). Không có production credential mặc định. `SEED_LEARNER_*` chỉ dành cho local/CI fixture.

## Biến môi trường

| Biến                                          |        Bắt buộc | Ý nghĩa                                                    |
| --------------------------------------------- | --------------: | ---------------------------------------------------------- |
| `DATABASE_URL`                                |              Có | PostgreSQL connection URL                                  |
| `AUTH_SECRET`                                 |              Có | Secret ký session, production dùng giá trị ngẫu nhiên mạnh |
| `AUTH_TRUST_HOST`                             |      Prod/proxy | Cho Auth.js tin cậy host do proxy cung cấp                 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`     |        Khi seed | Super admin ban đầu                                        |
| `SEED_LEARNER_EMAIL`, `SEED_LEARNER_PASSWORD` |        Local/CI | Learner fixture tùy chọn                                   |
| `OPENAI_API_KEY`                              |           Không | Thiếu key, manual CMS vẫn hoạt động                        |
| `OPENAI_MODEL`                                | Khi dùng OpenAI | Model hỗ trợ Responses + Structured Outputs                |
| `AI_PROVIDER`                                 |           Không | `openai` hoặc `fake`; CI dùng `fake`                       |
| `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`              |           Không | Private upload storage và giới hạn file                    |

## Data-access boundary

- Client Component không được truy cập Prisma, secret hoặc server authorization logic.
- Server Component **có thể** gọi Prisma cho page-local, read-only query đơn giản.
- Query tái sử dụng/phức tạp/có policy và mọi mutation/business invariant phải nằm dưới `src/modules` qua service/server action/route handler phù hợp.
- Quy tắc này tránh cả hai cực: nhét business logic vào page hoặc tạo service wrapper hình thức cho mọi `findMany`.

## Authentication / authorization

Credentials login dùng JWT session; Prisma adapter vẫn quản lý user/account data. Server-side RBAC là source of truth. UI visibility chỉ là trải nghiệm, không phải authorization.

Nếu sau này chuyển lại database-backed session, thay đổi đó cần feature spec riêng và E2E chứng minh login/session refresh/logout/role enforcement không regression.

## Kiểm tra trước merge

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
npx playwright install chromium
npm run test:e2e -- --project=chromium
npm run build
```

CI còn chạy:

- PostgreSQL 17 sạch → toàn bộ migration → deterministic seed;
- functional Playwright smoke;
- `@axe-core/playwright` accessibility smoke trên public/auth/admin/learner core surfaces;
- production build với `AI_PROVIDER=fake`, không cần OpenAI key.

Trong thời gian Vercel preview bị build-rate-limit, GitHub Actions là code-level verification chính; không bỏ quality gate và không spam redeploy chỉ để lấy preview status.

## Deployment

Kiến trúc vendor-neutral. Một production release nên:

1. cài dependency + build artifact;
2. chạy `npm run db:migrate` bằng migration connection có quyền phù hợp;
3. start app bằng runtime DB connection;
4. kiểm tra `/api/health` trước khi nhận traffic.

Vercel + Supabase là một deployment hiện tại, không phải ràng buộc kiến trúc. Với Supabase pooler, runtime và migration connection có thể dùng endpoint/port khác nhau; secrets nằm trong environment, không commit.

**Không chạy `prisma db push` trong Vercel build/runtime production.**

## Backup / restore / rollback

- Backup PostgreSQL định kỳ bằng `pg_dump -Fc`, mã hóa và test restore vào database tạm.
- Backup private source storage cùng thời điểm với DB để citation của published content vẫn hợp lệ.
- Rollback app về artifact trước khi can thiệp dữ liệu; migration nên forward-compatible.
- Khi bắt buộc data restore: dừng ghi, snapshot trạng thái hiện tại, restore backup đã kiểm chứng rồi chạy health + smoke suite.

## Reference và hướng mở rộng

Sau MVP có thể bổ sung object storage S3-compatible, transactional email, background worker, vector retrieval và OpenTelemetry. Các nâng cấp này không được đưa vào chỉ vì “có thể cần”; chúng cần requirement/acceptance criteria cụ thể theo workflow trong `specs/`.
