# Plan — 001 MVP hardening

## Kiến trúc hiện tại

- Next.js App Router + React Server Components/Server Actions.
- TypeScript strict, Prisma/PostgreSQL, Auth.js, Tailwind CSS 4.
- Modular monolith: route UI trong `src/app`, domain logic trong `src/modules`.
- Vitest + Playwright; GitHub Actions cung cấp PostgreSQL sạch cho CI.

## Quyết định kỹ thuật

### 1. Governance theo Spec-Driven Development

Không vendor toàn bộ Spec Kit runtime/CLI vào application dependency. Repository lưu các artifact tương thích với workflow Spec Kit: constitution + `spec/plan/tasks/research/quickstart`. Khi developer có `specify-cli`, có thể dùng command chính thức để tạo feature mới; app runtime không phụ thuộc Python/uv.

### 2. Design system theo master + page overrides

Áp dụng pattern của UI/UX Pro Max: một MASTER chứa design language ổn định, page override chỉ thay đổi density/layout. Không copy database/tooling của repo vào production bundle.

Product match gần nhất là Online Course/E-learning. Recommendation gốc thiên về playful/clay/vibrant; contract của Lộ Trình Việt yêu cầu restrained, warm, long-session readability, nên style được điều chỉnh thành **Accessible Soft Minimal** với teal/green progress cues và warm neutral surfaces.

### 3. Semantic CSS tokens, compatibility-first

`globals.css` sẽ định nghĩa token semantic (`--background`, `--surface`, `--primary`, `--accent`, `--success`, `--danger`, `--border`, `--focus-ring`, spacing/radius/shadow). Alias cũ `--bg`, `--card`, `--brand`, `--brand2`, `--line` được giữ để không bắt buộc refactor mọi component trong một lần.

Reusable UI primitive nhỏ sẽ được thêm dưới `src/components/ui`; chỉ refactor các surface cốt lõi trong feature này để tránh big-bang UI rewrite.

### 4. Accessibility verification

Thêm `@axe-core/playwright` vào dev dependency và một E2E accessibility suite. Scope ban đầu: `/`, `/explore`, `/login`, `/register`, `/admin` sau login và learner dashboard/surface có thể truy cập ổn định trong fixture.

Gate fail khi axe trả violation mức `serious` hoặc `critical`; violation thấp hơn vẫn được report để review nhưng không chặn ngay trong baseline đầu tiên. Khi baseline sạch hơn, threshold có thể siết bằng feature riêng.

### 5. Auth strategy được document đúng

Giữ Credentials + JWT session đang chạy. Không rewrite auth chỉ để khớp một câu cũ trong build contract. Session callback chỉ expose `id`, `role`, `canPublish`; server-side RBAC là source of truth.

### 6. Server Component data access

Không tạo hàng loạt service wrapper hình thức. Server Component read-only query đơn giản được cho phép. Query có invariant/reuse/policy hoặc mutation phải ở module. Đây là cân bằng giữa Next.js RSC idiom và modular monolith.

### 7. CI là verification source khi Vercel rate-limit

Mọi commit feature vẫn chạy GitHub CI với PostgreSQL sạch. Vercel status có thể failure do build-rate-limit và không được diễn giải thành code failure nếu GitHub CI đã chứng minh build pass. Khi quota phục hồi, một production/preview deploy cuối cùng sẽ là deployment verification.

## File changes dự kiến

- `.specify/memory/constitution.md`
- `specs/001-mvp-hardening/*`
- `design-system/study-vn/*`
- `docs/reference-patterns.md`
- `src/app/globals.css`, `src/app/mvp.css`
- `src/components/ui/*`
- critical surface pages/header/auth submit UI
- `tests/e2e/smoke.spec.ts`, `tests/e2e/accessibility.spec.ts`
- `package.json` (+ lockfile khi dependency install đồng bộ)
- `.github/workflows/ci.yml`
- `README.md`, `next.config.ts`

## Verification order

1. clean migration + seed;
2. typecheck;
3. lint;
4. unit tests;
5. format check;
6. Playwright functional + accessibility;
7. production build;
8. PR diff review for security/spec drift.

## Rollback

Toàn bộ thay đổi nằm trong một PR. Nếu design refactor gây regression, revert UI commit mà vẫn giữ governance artifacts. Không cần database migration cho feature hardening này.
