# 001 — MVP hardening và chuẩn hóa quy trình

## Mục tiêu

Đưa codebase hiện tại về một baseline có thể tiếp tục phát triển bằng AI mà không để specification drift, UI drift hoặc quality gate drift tích lũy. Feature này không mở rộng phạm vi nghiệp vụ mới; nó chuẩn hóa governance, design system, accessibility verification và documentation để những feature sau có đầu vào/đầu ra rõ ràng.

## Bối cảnh

Codebase đã triển khai phần lớn MVP nhưng đã xuất hiện một số lệch giữa contract và implementation: Auth.js dùng JWT session trong khi tài liệu cũ mô tả database session; một số Server Component query Prisma trực tiếp dù contract ban đầu cấm tuyệt đối; i18n dictionary tồn tại nhưng page prose vẫn colocate; UI dùng token/class tự phát chưa có design source of truth; CI có functional E2E nhưng chưa có accessibility gate.

## User stories

### US-001 — Developer/AI agent biết chính xác luật nào không được phá

Khi bắt đầu một feature, developer hoặc coding agent đọc constitution và feature spec để biết security, publish immutability, assessment secrecy, AI/source trust boundary, migration policy và UI quality gates trước khi viết code.

**Acceptance**

- Có `.specify/memory/constitution.md` được version-control.
- Feature plan nêu deviation có chủ đích thay vì để tài liệu và code mâu thuẫn.

### US-002 — UI có một design language thống nhất

Khi tạo/refactor page, developer có thể lấy semantic token, spacing, interaction rule và page density từ `design-system/study-vn` thay vì chọn style riêng cho từng màn hình.

**Acceptance**

- Có MASTER design system và page overrides cho landing, learner dashboard, lesson reader, admin và course builder.
- CSS runtime dùng semantic tokens và giữ alias tương thích cho code cũ.
- Touch target, visible focus, reduced motion và responsive rule được mã hóa trong CSS.

### US-003 — Accessibility là gate tự động

Khi CI chạy, lỗi accessibility nghiêm trọng trên các surface cốt lõi phải làm test fail giống functional regression.

**Acceptance**

- Playwright có axe scan cho public/auth và ít nhất một authenticated surface.
- CI không bỏ qua accessibility suite.
- Test output liệt kê violation đủ để debug.

### US-004 — Tài liệu phản ánh implementation thật

Developer đọc README/spec sẽ không bị hướng dẫn sai về auth/session, data-access boundary hoặc cách verify build.

**Acceptance**

- README ghi rõ Credentials + JWT session hiện tại và lý do.
- Quy tắc Server Component read-only query được ghi rõ.
- CI là source of verification khi Vercel preview tạm thời không khả dụng.

## Functional requirements

- **FR-001** Repository MUST có constitution chứa các invariant kỹ thuật và quality gates.
- **FR-002** Repository MUST có feature artifacts `spec.md`, `plan.md`, `tasks.md`; các requirement quan trọng MUST map tới task.
- **FR-003** Design system MUST dùng semantic tokens; component không nên cần biết màu hex cụ thể cho common state.
- **FR-004** Public/auth/learner/admin interaction MUST có visible keyboard focus và meaningful hover/pressed/disabled feedback.
- **FR-005** Common control MUST có min-height phù hợp touch (~44px) trừ control compact có lý do rõ ràng.
- **FR-006** Core Playwright suite MUST chạy axe accessibility analysis.
- **FR-007** Existing functional E2E MUST được sửa để selector deterministic, không phụ thuộc locator ambiguous.
- **FR-008** GitHub CI MUST tiếp tục chạy clean migration, seed, typecheck, lint, unit, formatting, Playwright và production build.
- **FR-009** Auth documentation MUST phản ánh JWT session strategy hiện tại; không claim database session khi code không dùng.
- **FR-010** Data-access guideline MUST cho phép simple read-only page-local Prisma query trong Server Component nhưng cấm Client Component access và giữ business invariant/mutation trong modules.
- **FR-011** UI changes MUST không copy pixel-level design/branding của repository tham khảo.
- **FR-012** App MUST vẫn build và dùng được khi `OPENAI_API_KEY` không có.

## Non-functional requirements

- **NFR-001 Accessibility:** automated axe scan không có violation mức serious/critical trên surface được kiểm tra; color contrast và target-size vẫn cần manual/visual review khi automation không kết luận chắc chắn.
- **NFR-002 Performance:** không thêm animation hoặc UI library nặng chỉ để trang trí; reuse CSS/components hiện có.
- **NFR-003 Maintainability:** design token và common component API phải nhỏ, dễ đọc; tránh abstraction chỉ chuyển tiếp props không tạo giá trị.
- **NFR-004 Reliability:** verification không phụ thuộc Vercel preview; GitHub Actions phải đủ để chứng minh migration/test/build trong thời gian Vercel bị rate-limit.
- **NFR-005 Security:** không nới RBAC, CSP, answer-key secrecy, source trust boundary hoặc secret handling trong quá trình UI hardening.

## Deliberate deviations khỏi contract cũ

1. **Auth session:** Credentials flow dùng JWT session thay vì database session vì strategy hiện tại đã được xác nhận chạy ổn với Auth.js v5 beta. Prisma adapter vẫn quản lý user/account data.
2. **Server Component read queries:** simple page-local read MAY gọi Prisma trực tiếp. Business invariant, reusable query và mọi mutation vẫn ở `src/modules`.
3. **i18n:** shared/repeated labels MUST qua dictionary; long-form prose MAY colocate trong page cho tới khi có locale thứ hai để tránh dictionary duplication vô ích.

## Out of scope

- Redesign toàn bộ sản phẩm theo một template bên ngoài.
- Thêm payment/social/mobile app.
- Chuyển AI architecture sang Vercel AI SDK/Gateway.
- Chuyển database khỏi Prisma/PostgreSQL.
- Backfill mọi feature cũ thành hàng chục spec riêng; feature này tạo baseline để feature sau tuân theo SDD.

## Success criteria

- **SC-001** CI đạt clean migration + seed + typecheck + lint + unit + format + Playwright + build.
- **SC-002** Core a11y suite pass trên Chromium trong CI.
- **SC-003** `design-system/study-vn/MASTER.md` và page override tồn tại, được code/CSS hiện tại phản ánh.
- **SC-004** README, constitution, spec và code không còn mâu thuẫn về auth strategy/data-access rule đã nêu.
- **SC-005** PR có checklist traceable thay vì chỉ `[x]` milestone tổng quát.
