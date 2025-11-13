## BDT Golf League App

Private league HQ for results, rosters, analytics, and commissioner tooling. This repository contains the front-end scaffolding aligned with the implementation plan in `docs/implementation-plan.md`.

### What's in place today

- App shell with authentication route group (`/login`, `/otp`, `/reset-password`) and protected league workspace (`/app/**`).
- Supabase-backed dashboard, match entry, teams, players, analytics, and commissioner views (`src/lib/queries.ts` centralises data access).
- Commissioner console with OTP invites, roster assignments, season activation, and match corrections powered by service-role APIs plus audit logging.
- Match correction workflows (void/restore) with audit logging, timeline updates, and commissioner-only audit viewer.
- Shared UI kit (`Button`, `Card`, `Badge`, `Input`, etc.), layout (`AppShell`), domain types, and Supabase client helpers.
- Living data dictionary for key tables and analytics views (`docs/data-dictionary.md`).

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
SUPABASE_SERVICE_ROLE_KEY=...
```

These power the Supabase client helpers used across the app. Ensure matching values are configured in your Supabase project.
The service role key stays on the server—never expose it to the browser.

### Project structure (selected)

- `src/app/(auth)` - public auth routes (OTP onboarding, password reset).
- `src/app/(app)/app` - authenticated app workspace (dashboard, match entry, teams, players, analytics, commissioner tools).
- `src/components` - layout primitives and UI kit used throughout the app.
- `src/lib` - domain types, Supabase helpers, query layer (`queries.ts`), and utilities.

### Auth smoke test

Follow this checklist after configuring Supabase to verify the onboarding flow end to end:

1. Run `node scripts/bootstrap-commissioner.mjs` with real Supabase credentials to create an initial commissioner and OTP.
2. Deploy the `redeem-otp` edge function (`supabase functions deploy redeem-otp`) so the frontend can exchange OTPs for passwords.
3. Visit `/otp`, submit the seeded username + OTP, and set a permanent password.
4. Confirm the app redirects to `/login`, then sign in with the new password and land on `/app`.
5. Inspect the Supabase tables: the OTP row should have `consumed_at` populated and the user should now authenticate without the one-time code.

Additional detail lives in `docs/auth.md`.

### Commissioner invite QA

1. Sign in as a commissioner and open `/app/commissioner/invites`.
2. Use **Create invite** to issue a new OTP; selecting a team should assign the member immediately.
3. After creation, confirm the success banner appears and the table refreshes with the new invite and OTP code.
4. Test **Resend** to invalidate the prior code and verify a fresh invite is inserted at the top of the table.
5. Use **Revoke** on an open invite and confirm its status switches to Redeemed while remaining entries stay untouched.

### Match correction QA

1. Sign in as a commissioner and navigate to `/app/commissioner`.
2. In **Match corrections**, choose a recent match and void it with a reason; standings and analytics should update on refresh.
3. Restore the same match to `submitted` (or `validated`) status and ensure points flow back into the views.
4. Check the timeline to confirm a system event was recorded for each adjustment.

### Roster management QA

1. Open `/app/commissioner` and locate **Team management**.
2. Create a new team via the admin-backed form and confirm the success toast plus updated team list.
3. Assign a player to a team, then remove them; verify both actions show success messages and the roster lists refresh.
4. Inspect the timeline and audit log to confirm roster moves are recorded.

### Record a test match

1. Create an active season and assign players to teams in Supabase (or via commissioner tools once wired).
2. Sign in as any league member and open `/app/matches/new`.
3. Select participants, enter per-player points, and submit. The client will call `POST /api/matches`, which invokes the `record_match` RPC to insert into `matches`, `match_participants`, and `timeline_events`.
4. Refresh `/app` to confirm the timeline and standings include the new result.

### Timeline feed QA

1. Visit `/app` and toggle between **All activity**, **My matches**, and (if assigned) **My team** to ensure the filter buttons hit `GET /api/timeline`.
2. Scroll or use **Load more** to paginate; the client should request the next page with a `cursor` query parameter and append results.
3. Record another match and verify that refreshing `/app` shows the new entry without a full reload.

### Teams surfaces QA

1. Open `/app/teams` and switch among seasons; each change should call `GET /api/teams?seasonId=<id>` and refresh the grid with skeleton states in between.
2. Navigate into a team card and confirm `/app/teams/:id` loads via `GET /api/teams/:id?seasonId=<id>`, showing roster, season snapshot, and match history.
3. Use the season selector inside the detail page to pivot between historical seasons; verify missing seasons show a friendly message and that the **Jump to active season** action recovers.

### Players surfaces QA

1. Visit `/app/players` and change seasons; the client should refetch via `GET /api/players?seasonId=<id>` and display skeleton placeholders before the new data appears.
2. Open a player detail page and confirm `/api/players/:id?seasonId=<id>` supplies contact details, season stats, and match history.
3. Use the season selector on the detail view to jump between seasons and ensure the “Jump to active season” control re-centres the experience if a player is missing for that season.

### Analytics QA

1. Open `/app/analytics`; the player leaderboard should load via `GET /api/analytics/players`.
2. Adjust the season, minimum matches, and team filters—each change should refetch and update the table, and the CSV export should download the filtered view.
3. Switch to the Team and Participation tabs and confirm `GET /api/analytics/teams` and `GET /api/analytics/participation` power those panels with loading and empty states.
4. If signed in as a commissioner, toggle the **Head-to-head (Beta)** control. The view should materialize comparison stats via `GET /api/analytics/head-to-head`, swap controls should update both selects, and the browser console logs a warning if any analytics request exceeds ~500 ms.

### Next steps

1. **Supabase schema + RLS** - ensure the tables described in `docs/implementation-plan.md` exist and have policies aligned with the league's roles.
2. **Match entry polish** - layer in duplicate detection, commissioner overrides, and scoring presets on top of the new `/api/matches` submission.
3. **Timeline & detail views** - implement paginated timeline, team, and player surfaces per Phase 3 of the implementation plan.
4. **Deployment** - configure a static export (`next build && next export`) for GitHub Pages once client-side Supabase calls cover all dynamic data.
5. **Testing** - add unit tests for derived stats plus integration tests for match submission, invite issuance, and commissioner edits.

### Audit log QA

1. Perform commissioner actions (invite issuance, roster move, match correction, announcement publishing).
2. Visit `/app/commissioner/audit` and filter by entity type or date range to find the new events.
3. Confirm the summary card on `/app/commissioner` links to the full history and that non-commissioners still receive 403s when calling `/api/admin` endpoints.

Refer back to the implementation plan for deeper architecture notes and follow-up tasks such as season rollover, analytics materialization, and RLS policy details.
