# Lộ Trình Việt

Nền tảng học tập tiếng Việt theo roadmap, gồm một ứng dụng Next.js modular-monolith cho người học và quản trị nội dung. Schema và nghiệp vụ hoàn toàn trung lập theo lĩnh vực.

## Tính năng MVP

- Auth.js session lưu PostgreSQL, credentials bcrypt, đăng ký/đăng nhập/reset adapter-ready và RBAC server-side cho 5 vai trò.
- CMS Course → immutable CourseVersion → Module → Lesson → typed LessonBlock; draft, review, publish transaction, archive và restore-copy; validation, revision chống ghi đè và audit log.
- Trang khám phá, ghi danh theo đúng published version, trình đọc responsive, tiến độ, ghi chú/đánh dấu riêng và dashboard.
- Question bank, snapshot bất biến khi làm bài, giấu answer key, chấm câu khách quan, kết quả/ôn lỗi; mô hình rubric cho luận và phỏng vấn.
- Upload TXT/Markdown có allowlist/kích thước/tên an toàn, chunk inspection và citation model. Schema mở rộng PDF/DOCX; production nên nối extractor cô lập (xem giới hạn).
- `AIProvider` với fake deterministic và OpenAI Responses API Structured Outputs (`store: false`), model qua môi trường, job idempotent, retry metadata, lỗi tiếng Việt, schema Zod và giữ block đã khóa.
- i18n dictionary tiếng Việt, light/dark theo hệ thống, focus/reduced-motion, security headers, health/readiness và structured logging.

## Chạy local từ đầu

Yêu cầu Node.js 20+, pnpm 10+, Docker.

```bash
cp .env.example .env
# Thay AUTH_SECRET, SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD trong .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Mở <http://localhost:3000>. Health endpoint: `GET /api/health`.

### Seed admin

`pnpm db:seed` idempotent, chỉ tạo/cập nhật super admin từ `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` (tối thiểu 12 ký tự). Script từ chối thiếu/mật khẩu yếu; không có credential mặc định. `SEED_LEARNER_*` chỉ được dùng ngoài production.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---:|---|
| `DATABASE_URL` | Có | PostgreSQL connection URL |
| `AUTH_SECRET` | Có | Bí mật ký session, ngẫu nhiên >= 32 byte |
| `AUTH_TRUST_HOST` | Prod/proxy | Cho Auth.js tin cậy host do proxy cung cấp |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Khi seed | Super admin ban đầu |
| `OPENAI_API_KEY` | Không | Thiếu biến này, CMS thủ công vẫn dùng được |
| `OPENAI_MODEL` | Khi dùng AI | Model hỗ trợ Responses + Structured Outputs |
| `AI_PROVIDER` | Không | `openai` (mặc định) hoặc `fake` trong test |
| `UPLOAD_DIR`, `MAX_UPLOAD_BYTES` | Không | Storage private và giới hạn upload (5 MiB mặc định) |

## Kiến trúc

- `src/app`: App Router, route group public/auth/learner và admin; mutation dùng Server Actions nhất quán.
- `src/modules`: auth, content, assessment, progress, source retrieval, publishing và AI domain services. UI không quyết định authorization.
- `prisma`: schema, migration ban đầu và seed. Published version không được sửa; restore deep-copy thành draft mới.
- `tests`: Vitest domain/service và Playwright smoke desktop/mobile. Real OpenAI không bao giờ được test gọi.

## Kiểm tra

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

E2E cần PostgreSQL đã migrate. Có thể đặt `AI_PROVIDER=fake`; không cần OpenAI key.

## Triển khai vendor-neutral

1. Build image/application với Node 20, `pnpm install --frozen-lockfile && pnpm build`.
2. Cấp PostgreSQL managed, HTTPS reverse proxy, persistent private object volume/storage và các secrets ở trên.
3. Chạy `pnpm db:migrate` như release job duy nhất, sau đó `pnpm start`; kiểm tra `/api/health` trước khi nhận traffic.
4. Tách quyền DB migration/runtime, giới hạn egress, rotate secrets, theo dõi structured logs và alert job `FAILED`.

### Backup, restore và rollback

- Lịch `pg_dump -Fc "$DATABASE_URL" > backup.dump`, mã hóa và kiểm tra restore định kỳ bằng `pg_restore --clean --if-exists` vào DB tạm.
- Backup storage nguồn cùng thời điểm với DB. Nguồn archived vẫn phải tồn tại để citation bản published hợp lệ.
- Rollback ứng dụng về artifact trước; migration schema phải forward-compatible. Khi buộc phục hồi dữ liệu, dừng ghi, snapshot DB hiện tại, restore backup đã kiểm chứng rồi chạy health/smoke.

## Giới hạn không критич (MVP)

- UI builder hiện tập trung vào luồng block văn bản đầu-cuối; schema/service đã hỗ trợ toàn bộ block và dnd-kit/TipTap đã được pin để nâng editor nhiều block mà không đổi dữ liệu.
- TXT/Markdown được trích xuất trực tiếp. PDF/DOCX đã có allowlist/schema nhưng cần worker extractor sandboxed trước khi bật trên UI production.
- Reset mật khẩu local phát token trong structured server log; production cần email transactional và trang consume-token theo nhà cung cấp email.
- Full-text retrieval interface đã tách; tìm kiếm vector, object storage cloud, worker queue và email là các nâng cấp hậu MVP.

## Nâng cấp đề xuất

Editor TipTap/dnd-kit đa block hoàn chỉnh; PostgreSQL FTS ranking; extractor PDF/DOCX cô lập; S3-compatible storage; transactional email; background worker; test E2E đầy đủ theo vai trò với database fixture; CSP nonce thay cho inline development allowances; metrics/tracing OpenTelemetry.

## Cloud environment runbooks

The repository/environment audit is in [`docs/REPOSITORY_AUDIT.md`](docs/REPOSITORY_AUDIT.md). Follow [`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md) for local, StackBlitz, and Supabase configuration and [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) for environment scoping and protected release migrations. Never run production migrations as part of a Vercel build.
