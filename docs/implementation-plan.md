Perfect — let’s turn that into a real, usable implementation plan you could hand to yourself (or someone else) and actually build from.

I’ll lay it out like project documentation:

1. Product overview
2. Requirements (functional + non-functional)
3. System architecture (with options, since you said GitHub Pages)
4. Data model
5. Auth + onboarding flow (one-time password)
6. Core feature specs (Home feed, match entry, teams, profiles, analytics)
7. Admin/commissioner tools
8. Deployment plan (bdt.golf + GitHub Pages)
9. Maintenance / ops

You can drop this into a repo as `/docs/implementation-plan.md` and expand as you go.

---

## 1. Product Overview

**Name:** BDT Golf League App
**Domain:** `bdt.golf`
**Audience:** small, private group (your league)
**Goal:** single source of truth for your season — players, teams, matches, points, and league comms.

**Core idea:**

* Everyone logs in
* Everyone can enter match results
* The app automatically updates team totals, individual stats, and a “what just happened” timeline
* Commissioner can correct stuff

---

## 2. Requirements

### 2.1 Functional Requirements

1. **Authentication**

   * Login screen is the entry point
   * Users sign in with username + one-time password (OTP) issued by commissioner
   * On first login, user must set a permanent password
   * Only whitelisted users can log in (no public registration)

2. **User Profiles**

   * Each user has: name, username, team assignment, bio, optional handicap/index, contact info
   * Users can view their own stats
   * Users can see other league members

3. **Teams**

   * At least 2 teams (your draft-based format)
   * Each player belongs to exactly 1 active team for the season
   * Team page shows total points, W/L, recent matches, roster

4. **Matches / Results Entry**

   * Authenticated user can create a “Match Result”
   * Form should capture:

     * Date played
     * Match type (1v1, 2v2, scramble, whatever you support)
     * Players involved
     * Teams involved
     * Course (optional)
     * Points awarded (per format/scoring rules)
     * Notes
   * On submit: system recalculates team totals and individual stats

5. **Home / Timeline**

   * Landing page after login
   * Shows recent activity (new match results, upcoming scheduled matches, admin posts/announcements)
   * Think “league changelog”

6. **Analytics / Stats**

   * Per-player: matches played, total points, points per match, record vs certain opponents, form (last 5)
   * Per-team: total points, #matches, last 5 results, roster totals
   * Season summary: leaderboard (players), leaderboard (teams)

7. **Admin / Commissioner Tools**

   * Create user + OTP
   * Assign to team
   * Edit or void a match result
   * Post announcements to timeline
   * Lock season or archive

### 2.2 Non-Functional Requirements

* **Private**: no public signup
* **Simple**: small group, no massive scaling needed
* **Cheap/free hosting**: frontend on GitHub Pages
* **Single source of truth**: central database, not random spreadsheets
* **Traceable changes**: be able to fix bad match entries

---

## 3. System Architecture

You said GitHub Pages, which is static hosting. That means the frontend can be there, but you still need a backend/data store.

Let’s pick a stack that’s:

* familiar to you (you already use Supabase elsewhere)
* easy to secure
* doesn’t require you to run your own server

### 3.1 Recommended Architecture

* **Frontend:** React or Next.js static export → deployed to GitHub Pages → mapped to `bdt.golf`
* **Backend / DB:** **Supabase** (Postgres + auth + REST)

  * You get a Postgres DB
  * Row-Level Security (RLS)
  * Can store users, matches, teams
  * You can hit it directly from frontend using service role (for admin actions) via edge functions, or with per-user auth for normal stuff

This gives you:

* GitHub Pages for UI
* Supabase for data & auth
* No self-hosted servers

### 3.2 Alternative (if you truly want flatfile)

You could do GitHub Pages + GitHub Actions that write JSON to the repo on form submit → but that’s clunky, not real-time, and annoying for auth. So I’d keep that as “not recommended.”

---

## 4. Data Model

Here’s a first pass schema (Postgres/Supabase style).

### 4.1 Tables

**users**

* `id` (uuid, pk)
* `username` (text, unique)
* `password_hash` (text) — or handled by Supabase auth
* `display_name` (text)
* `bio` (text)
* `team_id` (uuid, fk → teams.id)
* `handicap` (numeric, nullable)
* `role` (enum: 'player', 'commissioner')
* `created_at` (timestamptz)

**one_time_passwords**

* `id` (uuid, pk)
* `username` (text)
* `otp` (text)
* `expires_at` (timestamptz)
* `used` (boolean)

(Alternatively: you can seed users in Supabase and force password change on first login — but keeping an OTP table in docs is helpful.)

**teams**

* `id` (uuid, pk)
* `name` (text) e.g. “BDT Black”, “BDT Gold”
* `season_id` (fk → seasons.id)
* `total_points` (numeric, computed or cached)
* `created_at`

**seasons**

* `id` (uuid, pk)
* `name` (text) e.g. “BDT 2026”
* `start_date`
* `end_date`
* `is_active` (boolean)

**matches**

* `id` (uuid, pk)
* `season_id` (fk)
* `match_date` (date)
* `match_type` (text) e.g. “stroke play”, “match play”, “2v2”
* `course` (text, nullable)
* `created_by` (fk → users.id)
* `notes` (text)
* `status` (enum: 'valid', 'void', 'pending')

**match_participants**

* `id` (uuid, pk)
* `match_id` (fk → matches.id)
* `user_id` (fk → users.id)
* `team_id` (fk → teams.id)
* `points_awarded` (numeric)
* `side` (text) — e.g. “A” vs “B” for match-play style
* (this lets you support 1v1, 2v2, weird formats)

**timeline_events**

* `id` (uuid, pk)
* `event_type` (enum: 'match_recorded', 'announcement', 'user_joined', 'match_updated')
* `payload` (jsonb)
* `created_at`
* `created_by`

This schema gives you enough flexibility to:

* record arbitrary matches
* track points per player
* roll up to teams
* show activity

---

## 5. Auth + Onboarding Flow

**Goal:** small league, no self-signup.

**Flow:**

1. Commissioner creates user in database (username + team + role).
2. Commissioner generates OTP (random 6–10 chars) and shares it privately.
3. User visits `https://bdt.golf/` → redirected to `/login`.
4. Login screen shows:

   * username
   * one-time password
5. Backend/auth layer validates:

   * OTP exists
   * OTP belongs to that username
   * Not expired
   * Not used
6. On success → force “Set New Password” page.
7. Mark OTP as used.
8. Establish normal session (JWT).
9. Next logins are username + password.

**Why document this?** Because your future self will forget whether OTPs are single-use, whether they expire, and who can generate them. Put that in `/docs/auth.md`.

---

## 6. Core Feature Specs

### 6.1 Home / Timeline

**Purpose**

- Provide members with a single stream of league activity immediately after sign-in.
- Surface commissioner announcements alongside system-generated match updates so no one misses changes.

**Primary users**

- All authenticated players checking the latest league status.
- Commissioner validating that recent submissions propagated correctly.

**Route:** `/app/home`

**Content types (newest first)**

- "Match recorded: Team A vs Team B, 3 pts to Team A".
- "Ashton posted: BDT kickoff is April 12".
- "Match scheduled: Smith vs Trevor, 6/5/2026 9:00 AM".
- Future v2: "Season archived", "Team trade executed".

**Filters**

- All: default view that lists every timeline event.
- My matches: events where the signed-in user was a participant.
- Team: events involving members of the viewer's current team.

**Data dependencies**

- `timeline_events` materialized view (or table) joined with `matches`, `match_participants`, `users`, and `announcements`.
- Derived fields required for display: `event_type`, `title`, `body`, `created_at`, optional `cta_url`.
- Every event must include a foreign key or payload so the CTA can open a match, team, or announcement detail view.

**Interactions and states**

- Initial load fetches 20 records and shows skeleton placeholders while waiting.
- "Load more" button appends the next page via cursor-based pagination.
- Empty state: "No activity yet. Record your first match to get the league moving."
- Error state: inline toast "Timeline failed to refresh" with a retry action.

**Acceptance criteria**

1. After authentication, users land on `/app/home` and events are sorted by `created_at` descending.
2. Switching timeline filters re-queries without a full page reload and preserves scroll position.
3. Clicking a match event opens the match detail route or overlay.
4. Commissioner announcements display a badge and support markdown for emphasis and links.

**API needs**

- `GET /timeline?limit=20&cursor=<timestamp>` returns `{ data: TimelineEvent[], nextCursor?: string }`.
- `POST /timeline` (commissioner only) accepts `{ title, body, category, visibility }` and writes to `timeline_events`.
- Optional: websocket or Supabase channel subscription for live updates.

---

### 6.2 Match Entry Page

**Purpose**

- Allow any active player to record match outcomes while details are fresh.
- Enforce scoring formats so team and player aggregates remain accurate.

**Route:** `/app/matches/new`

**Permissions:** Active-season players by default; commissioner override for corrections.

**Form fields**

- Date (defaults to today, allow backdating via calendar picker).
- Match type (dropdown tied to scoring template).
- Course (optional free text or reference table).
- Player selection (multi-select of active players; show team chips once selected).
- Points assignment:
  - Manual mode: per-player numeric inputs with inline validation.
  - Rules mode: choose winner/loser side and auto-allocate based on scoring config.
- Notes (optional text area for context).
- Attachments v2 (optional photo proof).

**Dynamic behaviour**

- Selecting a match type loads default number of slots and point allocations.
- Selecting players auto-populates team fields and prevents duplicates.
- Display computed totals so users can confirm points sum to the expected value.

**Validation rules**

- Minimum of two players; enforce team balance per match type.
- Date cannot be in the future or before season start unless commissioner override.
- Total points must match the configured match type total (see scoring table).
- Duplicate match (same players, date, type) prompts confirmation before submission.

**Submission flow**

1. Client bundles payload `{ date, match_type_id, course, participants[], notes }`.
2. API `POST /matches` wraps inserts in a transaction, generates timeline event, and recalculates aggregates.
3. On success, redirect to match detail and surface toast "Match recorded".
4. On failure, show server validation messages inline and keep form state.

**Edge cases**

- If a selected player is inactive or injured, display warning and block submission.
- Provide commissioner-only checkbox to mark "override totals" for custom scoring.
- Show spinner overlay during submission to prevent duplicate requests.

**Acceptance criteria**

1. User can complete the form with keyboard only and submit within two minutes.
2. Invalid inputs highlight the erroneous field with descriptive copy.
3. Recording a match updates team totals visible on the Teams page within the next fetch.
4. Duplicate detection warns but allows commissioner override.

**API needs**

- `POST /matches` accepting `{ date, type_id, course, participants: [{ user_id, team_id, points }], notes, override_reason? }`.
- `GET /match-types` to hydrate dropdowns with scoring metadata.
- `GET /users?status=active` to populate the selection list (consider client caching).

---

### 6.3 Teams Page

**Purpose**

- Give members a clear view of team standings, roster health, and recent performance.
- Provide commissioner controls to adjust rosters when needed.

**Routes:** `/app/teams` (index) and `/app/teams/:id` (detail)

**Index view**

- Standings table sorted by total points, showing team name, captain, wins/losses, and points.
- Quick metric chips (streak, matches played).
- Clickable rows navigate to the detail page.

**Detail view**

- Header with team branding, record, total points, and season context.
- Roster list with player name, availability status, cumulative points, and contact shortcut.
- Recent matches list linking to match details.
- Commissioner tools (if authorized): "Move player", "Edit team info", "Archive team".

**Data dependencies**

- `teams`, `users`, `matches`, `match_participants`, and `seasons` tables.
- Aggregations precomputed via materialized view `team_season_totals` for fast loads.
- Queries must respect active season filter; allow toggling historical seasons.

**Interactions and states**

- Season selector drop-down to view past seasons.
- Loading skeletons for standings table and detail widgets.
- Empty state for brand-new season: "No matches recorded for this team yet."
- Error toast with retry when standings query fails.

**Acceptance criteria**

1. Teams index loads within two seconds showing current season standings.
2. Selecting a team updates the URL and detail section without a full reload.
3. Roster list reflects player transfers within five seconds of commissioner update.
4. Totals on Teams page match values shown on Analytics > Team leaderboard.

**API needs**

- `GET /teams?season_id=<id>` returning standings with aggregate totals.
- `GET /teams/:id` returning roster, recent matches, and metadata.
- `PATCH /teams/:id` (commissioner) for name, branding, or captain updates.

---

### 6.4 Player Profile

**Purpose**

- Highlight an individual player's contributions and provide a personal dashboard.
- Make comparisons of recent form and head-to-head records easy.

**Route:** `/app/players/:id`

**Sections**

- Profile header: avatar or initials, bio, contact links, active team badge.
- Season summary cards: matches played, total points, average points, win percentage.
- Recent matches feed (five most recent) with quick links to match detail.
- "By the numbers" table of opponents faced and results (stretch goal).
- Commissioner-only actions: reset password, toggle active status.

**Data dependencies**

- `users`, `match_participants`, `matches`, plus derived view for per-season aggregates.
- RLS policies restrict commissioner-only actions to authorized roles.

**Interactions and states**

- Season selector to view historical performance.
- Loading placeholders for stats and recent matches separately.
- Empty state for new players: "No matches yet. Record your first round to populate stats."
- Error handling via toast with retry option.

**Acceptance criteria**

1. Player profile loads and renders key stats within one second after data returns.
2. Season selector updates all cards and lists in sync.
3. Clicking a recent match navigates to detail while preserving back navigation.
4. Commissioner sees management buttons hidden from regular users.

**API needs**

- `GET /players/:id?season_id=<id>` returning `{ profile, season_totals, recent_matches }`.
- `PATCH /players/:id` (commissioner) to update bio, contact info, or team assignment.
- `POST /players/:id/reset-password` (commissioner) triggers Supabase OTP email.

---

### 6.5 Analytics

**Purpose**

- Provide actionable insights on player and team trends without exporting to spreadsheets.
- Support commissioner decision-making for handicapping, scheduling, and awards.

**Route:** `/app/analytics` (tabbed interface)

**Baseline modules (v1)**

1. **Player leaderboard**: table sorted by total points with filters for season and team; columns include matches, total points, average points, and form (last five).
2. **Team leaderboard**: card grid showing total points, point differential, streak, and matches played.
3. **Participation**: bar chart or list of matches played per player highlighting low participation.
4. **Form tracker**: sparkline per player; computed from last five matches.
5. **Head-to-head** (v2): matrix or filterable list powered by `match_participants` self-join.

**Data strategy**

- Prefer server-side materialized views (`player_season_totals`, `team_season_totals`, `player_recent_form`) refreshed after match insert.
- Provide ad-hoc SQL fallback for historical seasons where usage is low.

**Interactions and states**

- Tabs for each module with independent loading indicators.
- Filters (season, team, minimum matches) stored in query params for deep links.
- Empty state: "No analytics yet. Record matches to unlock insights."
- Error state: inline message with retry and link to help docs.

**Acceptance criteria**

1. Landing on Analytics defaults to the player leaderboard for the active season.
2. Adjusting filters updates charts/tables within 500 ms after response.
3. Export CSV button downloads the current leaderboard view.
4. Only commissioner sees the head-to-head beta toggle until the module is production ready.

**API needs**

- `GET /analytics/players?season_id=<id>&min_matches=<n>`.
- `GET /analytics/teams?season_id=<id>`.
- `GET /analytics/participation?season_id=<id>`.
- `GET /analytics/head-to-head?player_a=<id>&player_b=<id>` (v2).
- Consider Supabase RPCs for complex aggregates to avoid large payloads.

---

## 7. Admin / Commissioner Tools

**Role definition**

- Commissioner is a trusted admin user with privileges beyond regular players.
- Access controlled via `role = 'commissioner'` column or membership in a `commissioners` table checked in RLS.

**Guiding principles**

- Every destructive action is reversible or backed by an audit trail.
- Critical actions require confirmation modals and clear success/error feedback.

### 7.1 Onboarding and OTP management

**Tasks**

- Create placeholder user records for new members.
- Generate one-time passwords and deliver them securely.
- Resend or revoke OTPs if a link expires or is compromised.

**Flow**

1. Commissioner opens `/app/commissioner/users` and selects "Add member".
2. Form collects name, email, team assignment, optional notes.
3. System creates Supabase user, stores team relationship, and issues OTP.
4. Email template sends credentials; timeline logs "Commissioner added Player X".

**Acceptance criteria**

1. Creating a user automatically issues an OTP valid for 24 hours.
2. Resend button invalidates previous OTPs and sends the new one.
3. Commissioner can deactivate a user, removing their ability to log in while keeping history.

**API needs**

- `POST /admin/users` to create user + team assignment.
- `POST /admin/otp` to generate or resend OTP.
- `PATCH /admin/users/:id` to deactivate/reactivate members.

### 7.2 Roster and match corrections

**Use cases**

- Move a player between teams mid-season with automatic stat adjustments.
- Void or edit a match when incorrect scores were submitted.
- Restore a match from archive for audit purposes.

**Flow**

1. Commissioner opens match detail and selects "Edit" or "Void".
2. System requires confirmation and reason for audit log.
3. Updates cascade to aggregates and timeline records.

**Acceptance criteria**

1. Editing a match writes an audit entry capturing who changed what and when.
2. Voided matches no longer contribute points but remain accessible for reference.
3. Team transfers trigger recalculation of team totals and appear in timeline as "Roster update".

**API needs**

- `PATCH /admin/matches/:id` for corrections.
- `DELETE /admin/matches/:id` or `PATCH status=void` to invalidate a match.
- `PATCH /admin/users/:id/team` to move a player between teams.

### 7.3 Announcements and season management

**Tasks**

- Publish announcements that appear on the timeline and optionally send email/push.
- Create, activate, or close seasons.
- Archive old seasons while keeping historical stats accessible.

**Flow**

1. Commissioner drafts announcement in `/app/commissioner/announcements`.
2. Preview shows how the message renders in the timeline.
3. Publish pushes to `timeline_events` and optionally triggers Supabase notification function.
4. Season management UI lists seasons with ability to toggle active flag.

**Acceptance criteria**

1. Announcements support markdown (bold, italic, links) with sanitization.
2. Closing a season locks match entry for that season and prompts creation of the next season.
3. Only one season can be marked `is_active = true` at a time.

**API needs**

- `POST /admin/announcement`.
- `GET /admin/seasons` and `POST /admin/seasons`.
- `PATCH /admin/seasons/:id` to toggle `is_active` or archive.

**Audit and logging**

- Every commissioner action writes to `audit_logs` with `actor_id`, `action`, `payload`, `created_at`.
- Build simple viewer `/app/commissioner/audit` to help resolve disputes and verify overrides.

---
## 8. Deployment Plan

1. **Frontend**

   * Build React/Next app
   * `npm run build` → static export (Next: `next export`)
   * Push to GitHub
   * Enable GitHub Pages on `main` → `/docs` or `/`
   * Set custom domain to `bdt.golf` (configure DNS A / CNAME)

2. **Backend (Supabase)**

   * Create project
   * Create tables (import SQL from `/db/schema.sql`)
   * Set RLS policies
   * Create service role key (for admin scripts only, not exposed)
   * For frontend calls, use user-level key + Supabase client

3. **Environment**

   * In the frontend repo, add `.env` for local dev with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * For GitHub Pages, you can bake those into the build since it’s private use and not public signup — but still, keep admin/service keys out of the client.

---

## 9. Maintenance / Ops

* **Season rollover:** at end of season, set old season `is_active = false`, create new season, assign players to new teams
* **Backups:** Supabase gives you this, but you can also export CSV of `matches` monthly
* **Data correction procedure:** Document: “If someone fat-fingers a match, commissioner voids match and re-enters it.”
* **User onboarding:** Document: “Commissioner creates user + OTP → user logs in → sets password.”



---

## 10. Implementation Roadmap

The roadmap below sequences the work so that prerequisites land early, releases stay incremental, and the commissioner always has a usable slice of functionality.

### Phase 0: Project Setup & Infrastructure

**Goals**

- Stand up consistent local environments, CI checks, and a Supabase project that mirrors production.
- Establish shared UI foundations (design tokens, layout shell, basic form components).

**Key tasks**

- Scaffold Next.js app (App Router) with TypeScript, ESLint, Prettier, Husky pre-commit.
- Configure Supabase project, import `db/schema.sql`, enable RLS defaults, create service and anon keys.
- Implement environment management (`src/lib/env.ts`), verifying build fails on missing secrets.
- Build auth layout frames, navigation shell, and reusable components (button, input, card, table shells).
- Wire CI to run `pnpm lint` and `pnpm test` (placeholder) on every PR.

**Deliverables**

- Running `pnpm dev` boots the shell app locally.
- Supabase migrations checked into `db/migrations`.
- Baseline Storybook (optional) or UI preview page for shared components.

**Exit criteria**

- Contributors can clone, install, and sign into Supabase from `.env.local` in under 15 minutes.
- CI pipeline is green for scaffold repo.

### Phase 1: Authentication & Onboarding

**Goals**

- Lock down the app behind Supabase auth and deliver the OTP-first login flow.
- Give the commissioner a path to invite users before broader features ship.

**Key tasks**

- Implement `/login`, `/otp`, `/reset-password` routes with Supabase client and server helpers.
- Build OTP verification and first-login password reset per flow in section 5.
- Create commissioner-only bootstrap script (`scripts/bootstrap-commissioner.mjs`) to seed first admin user.
- Persist session cookies via middleware; redirect unauthenticated users to `/login`.
- Add smoke tests covering happy-path login and password reset failure states.

**Deliverables**

- Commissioner can log in, generate an OTP for a test user, and that user completes first login.
- RLS policies enforced so only authenticated users reach `/app/*`.

**Exit criteria**

- Auth pages meet acceptance criteria in section 5.
- Manual QA walkthrough documented in README entry "Auth smoke test".

### Phase 2: Match Data Model & Entry

**Goals**

- Implement end-to-end match recording, including validation, database writes, and timeline event creation.
- Ensure stats tables (or materialized views) update correctly on each match submission.

**Key tasks**

- Finalize Supabase tables (`matches`, `match_participants`, `timeline_events`, `player_season_totals`, `team_season_totals`).
- Build `/app/matches/new` UI with form state management and client-side validation hooks.
- Create server actions or API routes (`POST /matches`) that wrap inserts in transactions.
- Implement recalculation logic (trigger, function, or background job) for aggregates.
- Seed match types and scoring configs; expose `GET /match-types`.
- Add feature tests: block duplicate match submission and verify commissioner override path.

**Deliverables**

- Demo user records a match and sees confirmation plus a timeline entry.
- Aggregated totals in `team_season_totals` reflect the new match.

**Exit criteria**

- All acceptance criteria in section 6.2 satisfied.
- Regression tests cover at least one commissioner override case.

### Phase 3: Timeline & Core League Surfaces

**Goals**

- Provide the primary Home feed and basic Teams and Players views so members feel the league activity.

**Key tasks**

- Implement `/app/home` list view with filters and pagination against `GET /timeline`.
- Build Teams index and detail routes (`/app/teams`, `/app/teams/[id]`) using aggregate queries.
- Build Player profile route with season selector, recent matches, and commissioner actions.
- Handle empty, loading, and error states per sections 6.1 through 6.4.
- Add lightweight caching strategy (SWR or React Query) for frequently accessed endpoints.

**Deliverables**

- After recording a match, the event appears on the Home feed and in relevant Team and Player pages.
- Commissioner can move between Teams and Players without full reload.

**Exit criteria**

- Acceptance criteria for sections 6.1 through 6.4 met.
- Lighthouse accessibility score >= 90 on these pages.

### Phase 4: Analytics Module

**Goals**

- Ship `/app/analytics` with leaderboards, participation tracking, and form tracker.
- Lay groundwork for future advanced analytics.

**Key tasks**

- Materialize or optimize views referenced in section 6.5; schedule refresh via Supabase jobs if needed.
- Implement tabbed Analytics UI with filter controls persisted via query params.
- Add CSV export endpoint or client-side generation.
- Write performance tests for large sample data (use Supabase seed script).
- Document data dictionary so calculations are transparent.

**Deliverables**

- Active season analytics render within 500 ms after response.
- Exports match on-screen data for at least player and team leaderboards.

**Exit criteria**

- Acceptance criteria in section 6.5 met.
- Load testing confirms analytics endpoints stay under 250 ms P95 with five times expected data volume.

**Status 2025-11-13:** Player, team, participation, and CSV export live on `/app/analytics`. Commissioner-only head-to-head beta enabled with Supabase view `player_head_to_head`, and the client now logs latency events for tracking the 500 ms target. Data dictionary added in `docs/data-dictionary.md`.

### Phase 5: Commissioner Console Enhancements

**Goals**

- Complete admin workflows for invites, roster edits, match corrections, announcements, and audits.

**Key tasks**

- Build `/app/commissioner` overview with shortcuts to users, matches, and seasons.
- Implement user management UI (invite, resend OTP, deactivate) linked to APIs in section 7.1.
- Implement match correction UI with audit logging; expose audit viewer.
- Ship announcement composer with preview and publish capabilities.
- Add season management controls (activate, close, archive) with confirmation flows.
- Harden RLS policies and add unit tests verifying commissioner and non-commissioner separation.

**Status 2025-11-13:** Commissioner OTP invite management is live. `/app/commissioner/invites` now supports issuing, resending, and revoking invites via service-backed APIs, and RLS allows only commissioners to audit invite history. Match corrections, announcement publishing, season activation, team creation, and roster moves now flow through `/api/admin/**` endpoints with service-role enforcement, and the new `/app/commissioner/audit` route surfaces `audit_logs` with filtering.

**Deliverables**

- Commissioner can complete each task described in section 7 without direct database access.
- `audit_logs` table populated and viewable through UI.

**Exit criteria**

- End-to-end tests cover critical commissioner flows and guard against privilege escalation.
- Documentation updated with a "Commissioner handbook" appendix (how-to steps).

### Phase 6: Polish, Deployment, and Launch Operations

**Goals**

- Tighten UX, improve observability, and prepare public rollout on `bdt.golf`.

**Key tasks**

- Conduct UX polish pass (microcopy, responsive checks, optional dark mode).
- Add instrumentation (Supabase logs, Sentry, basic analytics) while respecting privacy.
- Configure GitHub Pages static export and custom domain DNS.
- Set up environment secrets in GitHub Actions and Pages build pipeline.
- Run beta testing with commissioner plus sample members; capture feedback and bugfix.
- Draft post-launch maintenance schedule (backups, season rollover checklists).

**Deliverables**

- Production build deployed to `https://bdt.golf` behind live Supabase project.
- Ops checklist appended to section 9 (runbook, contact info).

**Exit criteria**

- No severity-one bugs open from beta retrospective.
- Runbook signed off by commissioner.

### Parallel Tracks and Ongoing Work

- **Design system**: continue evolving shared component library in parallel with feature phases.
- **Quality**: expand automated tests each phase; maintain code coverage trend chart.
- **Documentation**: update README and `/docs` after each phase with new endpoints, flows, and troubleshooting notes.
- **Data hygiene**: schedule monthly review of Supabase RLS policies and access logs.

Revisit the roadmap after each phase retrospective to adjust sequencing, pull forward quick wins, or defer stretch goals.
