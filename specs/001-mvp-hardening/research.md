# Research — 001 MVP hardening

## 1. GitHub Spec Kit

**Áp dụng:** specification-first workflow, constitution, feature spec, plan, tasks, analyze/converge mindset và traceability giữa requirement ↔ task ↔ verification.

**Không áp dụng vào runtime:** `specify-cli` là developer tooling Python/uv, không phải dependency của Next.js production app. Repository lưu artifact tương thích để agent/developer có thể dùng CLI khi môi trường hỗ trợ.

**Lý do:** codebase phát triển nhanh bằng AI đã xuất hiện documentation/spec drift. Một contract dài duy nhất không đủ để phân biệt invariant, feature requirement và implementation decision.

## 2. UI/UX Pro Max Skill

**Áp dụng:** Master + page override design-system pattern; accessibility/touch/performance ưu tiên trước decoration; semantic color/typography/layout rules; density khác nhau giữa learner và admin.

Product match tham khảo gần nhất: **Educational App** và **Online Course/E-learning**. Recommendation nguồn thiên về Claymorphism/vibrant; palette e-learning dùng progress teal và warm achievement accent.

**Điều chỉnh theo product contract:** Lộ Trình Việt phục vụ long study sessions nên không dùng clay/vibrant quá mức. Chọn hướng **Accessible Soft Minimal**: warm neutral background, white/near-black surfaces, deep green/teal primary, orange chỉ làm accent, shadow rất nhẹ, motion thấp.

## 3. shadcn/ui

**Áp dụng:** tư duy open-code component primitives thay vì UI framework black-box. Component local có className override, semantic variants và accessible HTML.

**Không làm:** không import toàn bộ registry/component set trong một PR. Chỉ thêm primitives thực sự dùng; dialog/menu phức tạp sẽ dùng headless primitive khi feature cần.

## 4. axe-core / @axe-core/playwright

**Áp dụng:** automated accessibility smoke trong Playwright, chạy cùng functional tests.

**Policy baseline:** fail serious/critical violations ở core surfaces, report violation chi tiết. Automated axe chỉ bắt được một phần WCAG; keyboard flow, content quality và visual hierarchy vẫn cần manual review.

## 5. Formbricks

**Tham khảo:** production Next.js + TypeScript + Tailwind + Prisma + Auth.js + Zod + Vitest architecture, complex admin/product UI và self-hosting discipline.

**Không copy code:** repository tham khảo có license AGPL; project chỉ học pattern/organization, không vendor implementation.

## 6. Vercel Chatbot

**Tham khảo:** App Router, RSC/Server Actions, Auth.js, shadcn-style primitives, loading/streaming UX và production environment organization.

**Không chuyển AI stack:** Lộ Trình Việt tiếp tục dùng official OpenAI SDK + project `AIProvider` abstraction + bounded generation jobs theo build contract; không buộc kiến trúc vào Vercel AI Gateway.

## 7. Auth.js Credentials session decision

Implementation đã chứng minh Credentials login tạo session cookie và JWT strategy hoạt động; database strategy trước đó gây `UnsupportedStrategy` trong flow hiện tại. Vì vậy baseline giữ JWT và document rõ thay vì ép code quay về một architecture không chạy.

Security invariant vẫn là server-side RBAC. JWT chỉ mang claim tối thiểu; authorization không dựa vào việc UI có/không có menu.

## 8. Server Component data access decision

Cấm mọi `db.*` trong page tạo nhiều wrapper không có giá trị và đi ngược lợi thế Server Component cho read-heavy pages. Quy tắc mới phân biệt:

- page-local/simple/read-only: MAY query Prisma trong Server Component;
- reusable/complex/policy-bearing query: module/service;
- mutation/business invariant: module/server action;
- Client Component: không Prisma/secret.

Quy tắc này giảm abstraction ceremony nhưng vẫn bảo vệ domain boundary.

## 9. Design token decision

Giữ deep green hiện tại làm brand vì contrast tốt trên white/warm backgrounds. Lấy ý tưởng progress teal + achievement orange từ e-learning palette nhưng dùng tone tối hơn cho text/button contrast:

- primary/deep green: `#176B52`;
- progress teal: `#0F766E`;
- accent orange: `#C2410C`;
- warm background: `#FBFAF7`;
- destructive: `#B42318`/dark equivalent.

Raw values chỉ nằm trong token layer; feature component dùng semantic variable.
