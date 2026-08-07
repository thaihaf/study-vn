# Reference patterns and adoption policy

Các repository dưới đây là **reference**, không phải dependency bắt buộc của runtime. Mọi thay đổi phải tuân `AGENTS.md`, constitution và license của nguồn.

## github/spec-kit

Áp dụng:
- constitution → spec → plan → tasks → implementation → convergence;
- requirement IDs, acceptance criteria và task traceability;
- analysis cho ambiguity, contradiction, coverage gap;
- feature artifacts được version-control.

Không áp dụng:
- không thêm Python/uv vào production image chỉ để chạy Spec Kit;
- không tạo hàng loạt generated docs không được dùng/review.

## nextlevelbuilder/ui-ux-pro-max-skill

Áp dụng:
- accessibility/touch/performance trước decoration;
- master design system + page overrides;
- semantic color, typography, spacing, interaction checklist;
- density khác nhau giữa marketing/learner/admin.

Không áp dụng:
- không copy style recommendation máy móc;
- không dùng claymorphism/vibrant palette nếu xung đột long-study readability;
- không vendor toàn bộ skill database/search engine vào app bundle.

## shadcn-ui/ui

Áp dụng triết lý open-code component primitives: component ở trong repo, dễ audit/customize, semantic variant, accessibility-first.

Không import một component framework khổng lồ; chỉ thêm primitive khi có use case thật.

## dequelabs/axe-core

Dùng thông qua `@axe-core/playwright` cho automated accessibility smoke. Axe không thay thế manual keyboard/visual review.

## formbricks/formbricks

Tham khảo cách tổ chức production Next.js/TypeScript/Tailwind/Prisma/Auth/Zod/Vitest và admin-heavy UI. Không copy implementation vì reference repository dùng AGPL và product domain khác.

## vercel/chatbot

Tham khảo App Router, Server Component/Server Action boundary, Auth.js và polished async UI. Không chuyển AI provider/job architecture của project sang Vercel AI Gateway chỉ vì repo tham khảo dùng nó.

## Rule khi tham khảo repo mới

1. Đọc license trước khi copy substantial code.
2. Ưu tiên học invariant/pattern hơn copy file.
3. Ghi rõ phần nào source-derived, phần nào adaptation cho Study VN.
4. Không đổi architecture đã ổn chỉ vì reference repo dùng stack khác.
5. Mọi dependency mới phải giải quyết requirement cụ thể và đi qua CI.
