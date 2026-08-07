# Quickstart verification — 001 MVP hardening

Mục tiêu của quickstart là cho developer/AI agent một đường kiểm tra ngắn sau mỗi thay đổi mà không cần phụ thuộc Vercel preview.

## Local/CI environment

```bash
npm install
npx prisma generate
npm run db:migrate
npm run db:seed
```

CI dùng PostgreSQL 17 sạch, `AI_PROVIDER=fake`, admin/learner seed deterministic và không gọi OpenAI thật.

## Static quality

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
```

## Browser verification

```bash
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Expected core journeys:

1. Public landing → Explore → health endpoint.
2. Super admin login → admin dashboard.
3. Tạo course draft → publish.
4. Tạo question + assessment → publish.
5. Learner register → enroll → lesson → note/bookmark/complete.
6. Learner làm assessment → result + incorrect-review behavior.
7. Axe scan core public/auth/admin/learner surfaces không có serious/critical violation.

## Production build

```bash
AI_PROVIDER=fake npm run build
```

Build phải thành công khi không có `OPENAI_API_KEY`; AI UI được phép hiển thị trạng thái chưa cấu hình nhưng manual authoring vẫn hoạt động.

## Deployment note

Trong thời gian Vercel báo build-rate-limit, GitHub Actions là bằng chứng code-level chính. Không spam redeploy chỉ để lấy status xanh. Khi quota phục hồi, chạy một preview/production deploy cuối và smoke `/`, `/login`, `/admin`, `/api/health`.
