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

**Route:** `/app/home`
**Data shown (newest first):**

* “Match recorded: Team A vs Team B, 3pts to Team A”
* “Ashton posted: BDT kickoff is April 12”
* “Match scheduled: Smith vs Trevor, 6/5/2026 9:00am”

**Filters:** All / My matches / Team

**API Needs:**

* `GET /timeline?limit=20`
* `POST /timeline` (admin only, for announcements)

---

### 6.2 Match Entry Page

**Route:** `/app/matches/new`

**Form fields:**

* Date (default today)
* Match type (dropdown)
* Select players (multi-select from users)
* Auto-fill their teams
* Points assignment:

  * either you let user input “Player X: 1pt, Player Y: 0pt”
  * or you let them declare winner and system assigns based on rules
* Notes

**On submit:**

1. Create `matches` row
2. Create `match_participants` rows
3. Create `timeline_events` row
4. Trigger re-calc (can be: run on read, or store cached totals in team/user tables)

**Validation:**

* all players must be in an active season
* players must belong to teams
* points must sum to expected total for match type (document that rule!)

---

### 6.3 Teams Page

**Route:** `/app/teams` and `/app/teams/:id`

Shows:

* Team name
* Season
* Total points (either pre-calculated or aggregated)
* Roster
* Recent matches

**Query to predefine in docs:**

```sql
SELECT t.id, t.name,
       SUM(mp.points_awarded) AS total_points
FROM teams t
JOIN users u ON u.team_id = t.id
JOIN match_participants mp ON mp.user_id = u.id
JOIN matches m ON m.id = mp.match_id AND m.status = 'valid'
WHERE t.season_id = :season_id
GROUP BY t.id, t.name;
```

(You can drop that right into Supabase SQL.)

---

### 6.4 Player Profile

**Route:** `/app/players/:id`

Shows:

* Name, team, bio
* Season stats: matches played, total points, avg points per match
* Recent matches (link to match detail)

---

### 6.5 Analytics

You said “allow for analytics to be ran on the inputted data.” For v1, document a small analytics set:

1. **Leaderboard (players)**: order by total points desc
2. **Leaderboard (teams)**: order by total points desc
3. **Participation**: matches played per player
4. **Form**: last 5 match points per player
5. **Head-to-head** (optional v2): filter match_participants where A and B both in same match

Put in docs:

* which of these are computed on the fly
* which of these are materialized (cached) for speed

---

## 7. Admin / Commissioner Tools

Document a separate role: **commissioner**.

**Commissioner can:**

* Create user with OTP
* Edit user team
* Edit/void match
* Post announcement
* Create season / close season

**Endpoints to document:**

* `POST /admin/users`
* `POST /admin/otp`
* `PATCH /admin/matches/:id`
* `POST /admin/announcement`

In Supabase, you can gate these with RLS checking `auth.uid()` in a `commissioner_ids` table or a `role` column.

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

