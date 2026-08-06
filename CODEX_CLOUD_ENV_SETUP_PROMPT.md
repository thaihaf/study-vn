# Codex cloud environment audit and reconfiguration runbook

Read `AGENTS.md` and `PROJECT_TRACE.md` first. Update the trace before and after every meaningful task. Never record secrets or mark work `DONE` without command/test evidence.

## Required work

1. Audit the complete repository before changing architecture: package manifest and every lockfile; framework configuration; Prisma/ORM schema and migrations; Supabase clients; authentication; environment files and every `process.env` consumer; Vercel and StackBlitz configuration; scripts, tests, API routes, server actions, and middleware.
2. Detect the package manager, install dependencies, and resolve conflicts with compatible versions. Never use `npm install --force` or `npm install --legacy-peer-deps`.
3. Detect authentication and choose exactly one database strategy that fits the repository: Supabase Data API/Auth, Prisma with Supabase PostgreSQL, or the existing PostgreSQL client. Do not add a competing data layer.
4. For Prisma with Supabase, use `DATABASE_URL` for pooled serverless runtime access and `DIRECT_URL` for migrations/introspection where supported; preserve migration history; never run production migrations in Vercel builds. For Supabase clients, separate browser/server clients, keep service-role/secret keys server-only, preserve RLS, and never expose secrets through `NEXT_PUBLIC_*`.
5. Map environment variables and consumers. Create/update `.env.example`, create an ignored `.env.local` containing placeholders only, and add typed server/client validation.
6. Configure/document StackBlitz development, Supabase connectivity, and Vercel Development/Preview/Production.
7. Add a safe `check:env` script, safe read-only `check:db` script, and a redacted health endpoint.
8. Review migration history without destructive commands. Never run production migrations without explicit approval.
9. Create/update `docs/REPOSITORY_AUDIT.md`, `docs/ENVIRONMENT_SETUP.md`, and `docs/VERCEL_DEPLOYMENT.md`.
10. Run all applicable checks: dependency installation, formatting/lint, TypeScript typecheck, unit tests, ORM schema validation and client generation, environment validation, safe database connectivity when credentials exist, end-to-end smoke tests when supported, and production build.

## Missing credentials

Never fabricate or expose credentials. Mark credential-dependent validation `BLOCKED`, continue independent work, and record the exact environment variable and manual action needed. Do not execute destructive database commands or production migrations.

## Required handoff

Report detected architecture, selected database strategy, files changed, commands/results, blocked tasks, exact Supabase values required, exact Vercel steps, exact StackBlitz steps, and the migration command awaiting explicit approval.

