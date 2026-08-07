# Tasks — 001 MVP hardening

Mỗi task map tới requirement trong `spec.md`. Không đánh dấu done trước khi verification tương ứng pass.

## Phase A — Governance / specification

- [x] **T001 [FR-001, FR-002]** Tạo `.specify/memory/constitution.md` với invariant và quality gates.
- [x] **T002 [FR-002, FR-009, FR-010]** Tạo spec/plan/research/quickstart cho baseline hardening và ghi rõ deliberate deviations.
- [x] **T003 [SC-004]** Cập nhật README để mô tả đúng JWT session, data-access rule và verification workflow.

## Phase B — Design system

- [x] **T010 [FR-003, FR-004, FR-005]** Tạo `design-system/study-vn/MASTER.md` với semantic tokens, accessibility, motion và responsive rules.
- [x] **T011 [FR-003]** Tạo override cho landing, learner dashboard, lesson reader, admin và course builder.
- [ ] **T012 [FR-003, FR-004, FR-005]** Refactor `globals.css`/`mvp.css` sang semantic token + touch/focus/disabled/hover states, giữ alias tương thích.
- [ ] **T013 [FR-003]** Thêm component primitives nhỏ dưới `src/components/ui` và áp dụng vào surface cốt lõi.

## Phase C — Accessibility / E2E

- [ ] **T020 [FR-006, NFR-001]** Thêm `@axe-core/playwright` và accessibility helper/suite.
- [ ] **T021 [FR-007]** Sửa Playwright locator ambiguous ở question management flow.
- [ ] **T022 [FR-006, FR-008]** Đưa accessibility suite vào CI cùng functional E2E.
- [ ] **T023 [FR-004, FR-005]** Sửa violation/accessibility regression phát hiện bởi axe hoặc manual review cốt lõi.

## Phase D — Documentation / reference discipline

- [x] **T030 [FR-011]** Ghi rõ những pattern tham khảo từ UI/UX Pro Max, Spec Kit, shadcn/ui, axe-core, Formbricks và Vercel Chatbot; không copy code/layout không cần thiết.
- [ ] **T031 [FR-009, FR-010, SC-004]** Reconcile README/code wording cho auth/data access/i18n.

## Phase E — Verification

- [ ] **T040 [FR-008, SC-001]** Clean PostgreSQL migrations pass.
- [ ] **T041 [FR-008, SC-001]** Seed pass.
- [ ] **T042 [FR-008, SC-001]** Typecheck + lint + unit tests pass.
- [ ] **T043 [FR-008, SC-001]** Prettier check pass không cần CI auto-rewrite file.
- [ ] **T044 [FR-006, FR-007, SC-001, SC-002]** Functional Playwright + axe Playwright pass.
- [ ] **T045 [FR-008, FR-012, SC-001]** Production build pass với `AI_PROVIDER=fake` và không cần OpenAI key.
- [ ] **T046 [SC-003, SC-004, SC-005]** Review final diff cho design-system alignment, docs drift và unfinished placeholder.

## Completion rule

Feature chỉ chuyển sang DONE khi T040–T046 đều hoàn thành. Vercel preview đang rate-limit không phải lý do bỏ qua CI; deployment verification cuối cùng được thực hiện khi quota Vercel cho phép.
