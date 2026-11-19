# Sixpence

Free, couple-first wedding planner. Architecture and build plan: `docs/architecture.md` (source copy lives in the project's `architecture/` folder; keep them in sync).

@AGENTS.md

## Stack
Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4 with Sixpence tokens (`src/styles/tokens.css`), Supabase (Postgres + PostGIS, Auth with Google only, Storage, Realtime). Hosting: Vercel. Migrations: `supabase/migrations/`.

## Rules that matter
- **Real wedding data never enters the repo.** This app is built on the founder's real wedding. No real names, guests, vendors, amounts, documents, screenshots or exports in code, seeds, fixtures, tests, PR text or commit messages. Use the synthetic twin or the fictional sample wedding (`supabase/seed.sql`).
- **Every write goes through a typed server action** in `src/actions/` (zod schema, permission check, `activity` row). The future agent planner reuses these.
- **RLS is the security boundary.** New tables enable RLS in the same migration, with policies built on `is_member()` / `can_edit()`.
- **Nothing extracted from documents is saved without a person confirming it.** Extraction writes only to staging tables.
- **Outbound email and public RSVP stay off** unless `APP_ENV=production` and `wedding.outbound_enabled`.
- **Brand name comes from `src/lib/brand.ts`**, colors and type from tokens. Money is never shown in red (`over-plan` is brass).
- **Never put Claude subscription credentials in deployed code.** The local extraction worker uses the Agent SDK with the developer's own sign-in on their own machine; cloud workers use an API key.

## Commands
- `npm run dev` · `npm run lint` · `npm run typecheck` · `npm run build`
