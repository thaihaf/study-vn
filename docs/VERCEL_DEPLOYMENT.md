# Vercel deployment

## Project settings

- Framework preset: Next.js.
- Install command: `corepack enable && pnpm install --frozen-lockfile` (after a lockfile has been generated and committed).
- Build command: `pnpm build`.
- Do **not** add `prisma migrate deploy` to install, build, or start commands.
- Node.js: 20.x or a later version supported by the pinned Next.js release.

## Environment scopes

Add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `AUTH_TRUST_HOST=true` separately to **Development**, **Preview**, and **Production**. Use isolated databases or Supabase branches for Preview; never point untrusted previews at production. Add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `AI_PROVIDER=openai` only in scopes that require AI. `UPLOAD_DIR` requires durable external storage before uploads can be relied upon in serverless production.

After setting variables, redeploy each scope because environment changes do not alter an already-built deployment. Run `pnpm check:env` locally or in a controlled CI validation job with the matching scoped values.

## Release migrations

Use a protected, one-at-a-time release job with `DIRECT_URL` targeting the reviewed environment:

```bash
pnpm prisma migrate deploy
```

This command is awaiting explicit approval for every shared/production target. Back up first, review pending SQL, prevent concurrent release jobs, run it before traffic reaches code that requires the schema, then verify `/api/health`. Roll application artifacts back independently; use forward-fix migrations rather than editing applied history.

## Manual deployment checklist

1. Restore package-registry access, generate/commit `pnpm-lock.yaml`, and verify a frozen install.
2. Create/connect the Vercel project and select the repository root.
3. Populate each environment scope with its own pooled/direct Supabase URLs and Auth secret.
4. Confirm Preview uses non-production data and restrict access to preview deployments.
5. Run the protected migration release job only after explicit approval.
6. Deploy, call `/api/health`, inspect redacted server logs, and run Playwright smoke tests against the deployment.
7. Configure log retention, alerting, backups, and secret rotation.
