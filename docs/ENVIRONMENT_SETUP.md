# Environment setup

## Selected strategy

The application uses **Prisma with Supabase PostgreSQL** and Auth.js database sessions. It does not use Supabase Auth or the Supabase Data API. This preserves the existing single data-access strategy.

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env.local
# Replace placeholders locally; never commit .env.local.
docker compose up -d
pnpm check:env
pnpm db:generate
pnpm check:db
# Only against the intended local/non-production database:
pnpm db:migrate
pnpm dev
```

For local Docker, set both `DATABASE_URL` and `DIRECT_URL` to `postgresql://study:study@localhost:5432/study_vn?schema=public`. Generate `AUTH_SECRET` with `openssl rand -base64 32`.

## Supabase values required

Obtain these from the Supabase project's **Connect** panel and store them only in environment secret storage:

- `DATABASE_URL`: transaction/session pooler connection string suitable for serverless runtime (normally pooler port 6543). Include the real database password and Prisma pool parameters.
- `DIRECT_URL`: direct database connection string (normally port 5432), for Prisma CLI migrations and introspection. If IPv6 direct access is unavailable, use the provider's session pooler/migration-compatible endpoint as documented by Supabase.
- `AUTH_SECRET`: an independent random value of at least 32 characters; this is not a Supabase key.

No Supabase anon key, service-role key, project URL, or `NEXT_PUBLIC_SUPABASE_*` variable is needed by this architecture. Preserve any database RLS policies managed outside Prisma and review migrations for policy changes; Prisma connections commonly operate as a database role, not as an end-user JWT.

## Validation behavior

- `pnpm check:env` validates names/types and redacts values in errors.
- `pnpm check:db` validates URL presence then performs only `SELECT 1`; it never migrates or writes.
- `GET /api/health` returns only overall/readiness status and a request ID header.
- `.env.local` is ignored and must remain local. `.env.example` contains placeholders, not credentials.

## StackBlitz

1. Import the repository and allow Corepack/pnpm.
2. In StackBlitz project variables/secrets, add `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`; add optional AI variables only when needed.
3. Use a dedicated development Supabase project/branch. StackBlitz cannot reach the repository's Docker Compose database.
4. Run `pnpm install`, `pnpm check:env`, `pnpm db:generate`, `pnpm check:db`, then `pnpm dev`.
5. Do not run `pnpm db:migrate` from StackBlitz unless the target is confirmed non-production and the migration was explicitly approved.

## Missing credentials

Credential-dependent database validation remains blocked until valid `DATABASE_URL` and `DIRECT_URL` are supplied manually. Never paste their values into issue text, logs, or `PROJECT_TRACE.md`.
