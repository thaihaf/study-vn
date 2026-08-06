# Repository architecture audit

Audit date: 2026-08-06. Commands used included `find` inventories, `rg process.env`, direct inspection of manifests/configuration/routes/actions/tests, and Prisma CLI validation where available. No secrets are recorded here.

## Detected architecture

- **Application:** one Next.js 15.4 App Router modular monolith on React 19 and strict TypeScript. Public, authentication, learner, admin, and API routes live under `src/app`; domain logic lives under `src/modules`.
- **Package manager:** `packageManager` pins pnpm 10.14.0. No lockfile existed at audit start. Dependency installation is currently limited by the environment's registry proxy and must not be bypassed with force flags.
- **Persistence:** Prisma 6.13 targets PostgreSQL. There is no Supabase JavaScript client, Data API client, or second ORM. The selected strategy is therefore **Prisma with Supabase PostgreSQL**. `DATABASE_URL` is the pooled runtime connection and `DIRECT_URL` is the direct migration/introspection connection.
- **Authentication:** Auth.js v5 beta with the Prisma adapter, database sessions, a credentials provider, bcrypt password hashes, and server-side permission checks. Supabase Auth is not in use and should not be introduced alongside Auth.js.
- **AI:** the official OpenAI SDK is server-only, optional, and selected using `AI_PROVIDER`/`OPENAI_MODEL`. No browser API key is present.
- **Tests:** Vitest domain tests and Playwright desktop/mobile smoke tests. Playwright starts the development server and accepts a healthy or degraded redacted health response.
- **Deployment:** no pre-existing Vercel configuration or build-time migration hook was found. Docker Compose supplies local PostgreSQL. StackBlitz had no configuration before this audit.

## Environment consumers

| Variable | Consumer | Exposure | Requirement |
|---|---|---|---|
| `DATABASE_URL` | Prisma runtime/client | Server only | Required at runtime |
| `DIRECT_URL` | Prisma migration/introspection | Server/CLI only | Required for schema tools |
| `AUTH_SECRET`, `AUTH_TRUST_HOST` | Auth.js convention | Server only | Required; secret >= 32 chars |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER` | AI provider and admin status UI | Server only | API key optional; fake provider for tests |
| `UPLOAD_DIR`, `MAX_UPLOAD_BYTES` | Source upload configuration | Server only | Optional defaults |
| `SEED_ADMIN_*`, `SEED_LEARNER_*` | Prisma seed | Server/CLI only | Required only for requested seed operations |
| `NODE_ENV` | Prisma logging, reset behavior, seed guard | Server/build | Platform supplied |
| `CI` | Playwright server reuse | Test runner | CI supplied |

There are intentionally no `NEXT_PUBLIC_*` variables. The browser environment schema is empty.

## Routing, actions, and authorization findings

- `/api/auth/[...nextauth]` delegates to Auth.js. Admin layout and mutations use server-side user/permission helpers.
- Mutations use Server Actions in `src/app/actions.ts`; external inputs are generally validated by Zod.
- `/api/health` performs only `SELECT 1`, disables caching, returns a correlation ID, and does not return URLs, credentials, error messages, versions, or latency details.
- No middleware file exists; route layouts and server actions perform protection. This is a valid strategy as long as every protected read and mutation continues using those guards.

## Migration review

One baseline migration exists: `prisma/migrations/20260806000000_init/migration.sql`. History was preserved and not edited. Production migrations must be an explicit release step, never part of `pnpm build` or Vercel's build command.

The hand-authored baseline uses suspicious SQL defaults such as `DEFAULT 'now('`. A clean disposable PostgreSQL application test is required before production use; if it fails, create a forward/corrected baseline only after reviewing deployed database state. Do not rewrite a migration already applied to any shared environment.

## Risks and recommendations

1. The missing lockfile prevents fully reproducible installs until registry access is restored and `pnpm install` succeeds.
2. Database and end-to-end validation require valid non-production PostgreSQL credentials.
3. Auth.js is a beta version; it matches the existing implementation, but upgrades should be tested deliberately rather than mixed into environment configuration.
4. StackBlitz cannot host Docker Compose; it needs externally reachable development Supabase URLs.
5. Keep runtime and migration database credentials distinct when the provider permits it.
