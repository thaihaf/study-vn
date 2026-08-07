# Hiến pháp kỹ thuật — Lộ Trình Việt

Phiên bản: 1.0.0  
Ngày phê chuẩn: 2026-08-07  
Phạm vi: toàn bộ mã nguồn, migration, test, tài liệu và workflow trong repository.

Tài liệu này là bộ nguyên tắc ổn định theo tinh thần Spec-Driven Development. `AGENTS.md` vẫn là hợp đồng phạm vi sản phẩm gốc; khi một chi tiết triển khai trong `AGENTS.md` không còn phù hợp với thực tế đã được kiểm chứng, thay đổi phải được ghi rõ trong spec/plan thay vì để code và tài liệu tự mâu thuẫn.

## I. Specification là nguồn ý định

- Mọi thay đổi có ảnh hưởng hành vi người dùng, dữ liệu, bảo mật, quyền truy cập hoặc workflow MUST có requirement và acceptance criteria kiểm thử được.
- Feature mới SHOULD đi theo chuỗi `spec → plan → tasks → implementation → verification`.
- Không đánh dấu hoàn thành chỉ vì code đã tồn tại. Requirement chỉ hoàn thành khi có bằng chứng kiểm thử phù hợp.
- Khi implementation khác spec, phải sửa một trong hai một cách có chủ đích; không để drift kéo dài.
- Không thêm tính năng “có thể cần sau này” nếu chưa có requirement cụ thể.

## II. Kiến trúc đơn giản và ranh giới server/client

- Ứng dụng MUST duy trì modular monolith, một deployable Next.js application và PostgreSQL/Prisma làm nguồn dữ liệu chính.
- Client Component MUST NOT truy cập Prisma, secret hoặc logic phân quyền server.
- Mutation và business invariant MUST nằm trong server action/route handler hoặc domain module dưới `src/modules`.
- Server Component MAY thực hiện query Prisma chỉ-đọc đơn giản, page-specific, không tái sử dụng và không chứa business invariant. Query phức tạp, tái sử dụng hoặc có chính sách quyền MUST được đưa về module/service.
- Không tạo repository/service wrapper chỉ để chuyển tiếp một lệnh Prisma nếu wrapper không mang lại invariant, tái sử dụng hoặc testability rõ ràng.
- External input, form data, file metadata và AI output MUST được kiểm tra bằng Zod trước khi đi vào domain logic.

## III. Authentication và authorization

- Authorization MUST được thực thi phía server cho mọi protected read và mutation. Ẩn nút trong UI không được xem là authorization.
- Credentials authentication hiện dùng Auth.js với Prisma adapter và `session.strategy = 'jwt'`. Đây là quyết định có chủ đích vì Credentials provider không tương thích với database-session flow đang dùng trong Auth.js v5 beta.
- JWT MUST chỉ chứa các claim tối thiểu cần thiết cho authorization như user id, role và `canPublish`; không lưu password, token nhạy cảm hoặc dữ liệu học tập vào JWT.
- Nếu chuyển lại database-backed session trong tương lai, phải có spec/plan riêng và E2E chứng minh login, session refresh, logout, role enforcement không regression.
- Cookie/session secret MUST chỉ đến từ environment; production không được có credential mặc định.

## IV. Published content là lịch sử bất biến

- `CourseVersion` đã PUBLISHED MUST được xem là immutable.
- Sửa khóa học đã publish MUST tạo/cập nhật draft mới; không rewrite history.
- Restore version cũ MUST tạo draft mới bằng deep copy.
- Publish/restore và operation cập nhật nhiều record liên quan MUST dùng transaction.
- Learner MUST chỉ nhìn thấy published content phù hợp với enrollment/version của họ.

## V. Tính toàn vẹn bài đánh giá

- Correct answer/correctness flag MUST NOT được serialize tới client trước khi learner submit.
- Mỗi attempt MUST lưu immutable snapshot của câu hỏi đã thực sự hiển thị.
- Objective grading MUST deterministic và test được.
- AI/rubric feedback cho essay/interview MUST được gắn nhãn là hướng dẫn luyện tập, không phải kết quả chính thức.
- Incorrect objective answer SHOULD tạo review item theo lịch ôn deterministic.

## VI. AI và source là dữ liệu không đáng tin cậy

- AI output MUST được coi là untrusted input và validate bằng schema trước persistence.
- Uploaded/source text MUST được coi là reference material, không phải system/developer instruction.
- Prompt injection trong source MUST không thể thay đổi policy, secret access hoặc tool behavior.
- Locked block MUST không bị AI regeneration ghi đè.
- AI call MUST server-side, có timeout/retry giới hạn, model qua environment và không lộ API key.
- App MUST vẫn dùng được cho manual authoring khi OpenAI chưa cấu hình.

## VII. Database và migration có thể tái tạo

- Production release MUST dùng `prisma migrate deploy`; không chạy `prisma db push` trong build/runtime production.
- Một database PostgreSQL sạch MUST apply toàn bộ migration theo thứ tự và seed deterministic thành công.
- Migration đã phát hành không được sửa tùy tiện. Nếu cần baseline repair, phải ghi lại rationale và CI phải kiểm chứng clean-database migration.
- Vercel runtime và migration connection MAY dùng các pool/port khác nhau; secret không được commit.
- RLS hoặc database hardening MUST không làm hỏng Prisma server-side runtime account.

## VIII. Design system và accessibility là release gate

- UI MUST ưu tiên readability, accessibility và predictable interaction trước decoration.
- Reusable visual values MUST dùng semantic design tokens; tránh raw hex rải trong component.
- Interactive target SHOULD đạt tối thiểu khoảng 44×44px khi hợp lý trên touch UI.
- Form MUST có visible label; keyboard focus MUST nhìn thấy được.
- Text contrast SHOULD đạt WCAG AA; status không được truyền đạt chỉ bằng màu.
- Motion MUST tôn trọng `prefers-reduced-motion`.
- Layout MUST hoạt động từ 360px, tablet, desktop và wide desktop mà không horizontal-scroll ngoài vùng dữ liệu có chủ đích.
- Core public/auth/admin/learner surfaces MUST qua automated accessibility smoke test bằng axe + Playwright; automated test không thay thế manual review.

## IX. Design intent được version-control

- `design-system/study-vn/MASTER.md` là source of truth cho visual/interaction rules.
- Page override dưới `design-system/study-vn/pages/` MAY thay đổi density/layout cho một surface, nhưng không được phá accessibility, semantic token hoặc interaction principle ở MASTER.
- Learner surfaces SHOULD ít motion, dễ đọc, distraction thấp.
- Admin/builder surfaces MAY có density cao hơn nhưng vẫn phải giữ grouping, hierarchy và touch/keyboard usability.
- Không copy branding, asset hoặc pixel layout của sản phẩm tham khảo.

## X. i18n thực dụng, không tạo duplication vô ích

- Default locale là tiếng Việt.
- Shared navigation labels, common actions, validation labels và text tái sử dụng MUST đi qua lightweight dictionary.
- Long-form page-specific Vietnamese prose MAY colocate trong page cho tới khi locale thứ hai được triển khai; không duplicate đoạn prose chỉ để “đủ i18n”.
- Khi thêm locale thứ hai, feature liên quan MUST di chuyển toàn bộ user-facing copy của surface đó vào dictionary/locale files trong cùng thay đổi.

## XI. Quality gates

Trước khi một feature được coi là hoàn thành, CI MUST chạy và pass tối thiểu:

1. clean PostgreSQL migration;
2. deterministic seed;
3. TypeScript typecheck;
4. ESLint;
5. unit/service tests;
6. Prettier check;
7. Playwright functional smoke tests;
8. accessibility smoke tests;
9. production build.

Test MUST sửa nguyên nhân lỗi; không disable gate chỉ để làm CI xanh.

## XII. Security và observability

- Password MUST hash bằng thuật toán phù hợp; secret/token/password không log.
- Authentication, reset password, AI generation và upload MUST có rate-limit phù hợp.
- Rich content/Mermaid MUST sanitize hoặc render qua safe path.
- Security headers MUST được cấu hình tập trung.
- Significant admin actions MUST audit.
- Health/readiness endpoint MUST phản ánh khả năng phục vụ tối thiểu của app/database.
- User-safe error và technical log SHOULD tách biệt; không có silent catch cho lỗi quan trọng.

## Governance

- Thay đổi nguyên tắc MUST được commit cùng lý do, impact và version bump của constitution.
- MAJOR: bỏ hoặc đảo nguyên tắc cốt lõi.
- MINOR: thêm nguyên tắc/gate mới có ảnh hưởng workflow.
- PATCH: làm rõ wording mà không đổi nghĩa.
- Feature plan MUST nêu rõ mọi deviation có chủ đích khỏi `AGENTS.md` hoặc constitution.
- `speckit.analyze`/quy trình tương đương SHOULD được chạy trước implementation lớn và `converge`/gap review SHOULD được chạy trước khi đóng feature.
