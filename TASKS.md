# Kế hoạch triển khai

## MVP product scope

- [x] M1 — Nền tảng Next.js, Tailwind, Prisma/PostgreSQL, Docker, kiểm thử và tài liệu.
- [x] M2 — Auth.js credentials, đặt lại mật khẩu, RBAC phía server và quản lý người dùng.
- [x] M3 — CMS khóa học dạng block, sắp xếp, autosave, review/publish/archive/restore và audit.
- [x] M4 — Khám phá, ghi danh, trình đọc bài, tiến độ, ghi chú, đánh dấu và dashboard.
- [x] M5 — Ngân hàng câu hỏi, bài thi, chấm điểm, ôn lỗi, bài luận và phỏng vấn văn bản.
- [x] M6 — Tải nguồn an toàn, trích xuất/chunk, retrieval và citation.
- [x] M7 — AI provider OpenAI/fake, job idempotent và structured generation.
- [x] M8 — Vietnamese-first UI, responsive/a11y baseline, security, observability, test/build infrastructure.

> Các checkbox trên chỉ mô tả **product scope đã có implementation**; chúng không thay thế quality verification của feature đang mở.

## Feature đang hardening

- [ ] **001 — MVP hardening / Spec-driven governance / Design system / Accessibility CI**

Checklist traceable và trạng thái verification chi tiết nằm tại:

`specs/001-mvp-hardening/tasks.md`

Feature chỉ được coi là DONE khi clean migration, seed, typecheck, lint, unit, formatting, functional Playwright, axe accessibility và production build cùng pass.

## Sau MVP (chỉ khi có requirement cụ thể)

- Vector search.
- Transactional email.
- Object storage cloud.
- Background worker chuyên dụng.
- OpenTelemetry/metrics nâng cao.
