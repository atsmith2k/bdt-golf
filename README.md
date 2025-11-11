## BDT Golf League App

Private league HQ for results, rosters, analytics, and commissioner tooling. This repository contains the front-end scaffolding aligned with the implementation plan in `docs/implementation-plan.md`.

### What's in place today

- App shell with authentication route group (`/login`, `/otp`, `/reset-password`) and protected league workspace (`/app/**`).
- Supabase-backed dashboard, match entry, teams, players, analytics, and commissioner views (`src/lib/queries.ts` centralises data access).
- Commissioner console and OTP invite management reading from the `one_time_passwords` table.
- Shared UI kit (`Button`, `Card`, `Badge`, `Input`, etc.), layout (`AppShell`), domain types, and Supabase client helpers.

### Local development

```bash
npm install
cp .env.local.example .env.local  # fill in Supabase credentials
npm run dev
```

Visit `http://localhost:3000`. The root route redirects to `/login`; successful auth will forward to `/app`.

### Environment variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

These power the Supabase client helpers used across the app. Ensure matching values are configured in your Supabase project.

### Project structure (selected)

- `src/app/(auth)` - public auth routes (OTP onboarding, password reset).
- `src/app/(app)/app` - authenticated app workspace (dashboard, match entry, teams, players, analytics, commissioner tools).
- `src/components` - layout primitives and UI kit used throughout the app.
- `src/lib` - domain types, Supabase helpers, query layer (`queries.ts`), and utilities.

### Next steps

1. **Supabase schema + RLS** - ensure the tables described in `docs/implementation-plan.md` exist and have policies aligned with the league’s roles.
2. **Auth gateway** - finish the OTP-to-password onboarding flow (server action or edge function) and hook the login form to Supabase auth.
3. **Server actions / mutations** - wire the match entry form, announcement composer, and commissioner quick actions to mutations that persist via Supabase.
4. **Deployment** - configure a static export (`next build && next export`) for GitHub Pages once client-side Supabase calls cover all dynamic data.
5. **Testing** - add unit tests for derived stats plus integration tests for match submission, invite issuance, and commissioner edits.

Refer back to the implementation plan for deeper architecture notes and follow-up tasks such as season rollover, analytics materialization, and RLS policy details.
