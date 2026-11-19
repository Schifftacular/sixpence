# Sixpence

The wedding planner that's on your side: free forever, no ads, no vendor spam, and it keeps the money calm.

## Run it locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key.
3. Apply `supabase/migrations/*` to the project (Supabase CLI `supabase db push`, or the SQL editor), and `supabase/seed.sql` for local fictional data.
4. In Supabase Auth, enable the **Google** provider and add `http://localhost:3000/auth/callback` (and your Vercel URL) to the redirect URLs.
5. `npm run dev`

See `docs/architecture.md` for the design and build plan, and `CLAUDE.md` for the rules (especially: no real wedding data in the repo).
