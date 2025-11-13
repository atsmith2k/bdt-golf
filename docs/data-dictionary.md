# BDT Golf League Data Dictionary

_Revision: Phase 5 commissioner tooling uplift — generated 2025-11-13_

This document summarizes the primary tables and views used by the league HQ
application, with emphasis on analytics surfaces and commissioner tools.
Keep it alongside `db/schema.sql` so commissioners and contributors can
understand how derived stats are calculated and refreshed.

## Core Tables

| Relation | Purpose | Key Columns |
| --- | --- | --- |
| `public.seasons` | Season metadata; only one row should have `is_active = true`. | `id`, `name`, `start_date`, `end_date`, `is_active` |
| `public.teams` | Team roster containers scoped to a season. | `id`, `season_id`, `name`, `color` |
| `public.users` | League member profiles mapped to `auth.users`. | `id`, `display_name`, `username`, `team_id`, `role` |
| `public.matches` | Match records entered through `/app/matches/new`. | `id`, `season_id`, `match_type`, `status`, `match_date`, `visibility` |
| `public.match_participants` | Per-player results for a match. | `match_id`, `user_id`, `team_id`, `points_awarded`, `strokes`, `position` |
| `public.timeline_events` | Activity feed items for the home timeline. | `id`, `season_id`, `event_type`, `payload`, `created_at` |
| `public.audit_logs` | Commissioner-only audit trail of privileged actions. | `id`, `actor_id`, `event_type`, `entity_type`, `metadata`, `created_at` |

Row Level Security (RLS) is enabled on all public tables. Authenticated users
can read their own data; commissioners inherit elevated privileges via
`users.role = 'commissioner'`. See `db/schema.sql` for the latest policy
definitions.

## Derived Views for Analytics

The analytics module pulls from several views instead of issuing heavy ad-hoc
queries. All views are created with `security_invoker = true` so they respect
the caller’s RLS context.

### `public.team_roster_counts`

Counts roster size per team. Used on `/app/teams` for quick roster badges.

| Column | Type | Notes |
| --- | --- | --- |
| `team_id` | `uuid` | FK to `teams.id`. |
| `season_id` | `uuid` | Season context. |
| `roster_size` | `bigint` | Number of users assigned to the team. |

### `public.match_points_by_team`

Aggregates total points per team per match (handling cases where the
participant row lacks `team_id` by falling back to the user’s team).

| Column | Type | Notes |
| --- | --- | --- |
| `match_id` | `uuid` | FK to `matches.id`. |
| `team_id` | `uuid` | Team credited with the points. |
| `total_points` | `numeric` | Sum of participant points for the team. |

### `public.player_season_totals`

Season-level rollups per player, refreshed automatically after each match
insert via direct reads (no materialized refresh required today). Matches
with `status = 'voided'` are excluded.

| Column | Notes |
| --- | --- |
| `player_id` (`uuid`) | Player reference. |
| `season_id` (`uuid`) | Season filter. |
| `matches_played` (`bigint`) | Distinct matches counted. |
| `points_total` (`numeric`) | Sum of `points_awarded`. |
| `points_per_match` (`numeric`) | Average per match. |
| `wins`, `losses`, `ties` (`bigint`) | Derived from point differential. |
| `recent_form` (`numeric[]`) | Last five point totals, newest first. |

### `public.team_season_totals`

Aggregated totals per team per season, used on the Analytics team leaderboard
and `/app/teams/[id]`. Matches with `status = 'voided'` are excluded.

| Column | Notes |
| --- | --- |
| `team_id` (`uuid`) | Team reference. |
| `season_id` (`uuid`) | Season scope. |
| `matches_played`, `points_total`, `points_per_match` | Performance metrics. |
| `wins`, `losses`, `ties` | Derived from `match_points_by_team`. |
| `recent_matches` (`text[]`) | ISO date strings (latest first). |

### `public.player_head_to_head`

Powers the commissioner-only head-to-head beta in `/app/analytics`. Each row
captures the matchup history between `player_id` and `opponent_id` for a given
season, excluding voided matches and ignoring same-team pairings unless a team
assignment was missing.

| Column | Type | Notes |
| --- | --- | --- |
| `season_id` | `uuid` | Season slice. |
| `player_id` | `uuid` | Perspective player. |
| `opponent_id` | `uuid` | Opposing player. |
| `matches_played` | `bigint` | Distinct matches logged. |
| `player_points_total` | `numeric` | Points for perspective player. |
| `opponent_points_total` | `numeric` | Points conceded. |
| `wins`, `losses`, `ties` | `bigint` | Result counts from point comparison. |
| `average_margin` | `numeric` | Mean `(player_points - opponent_points)`. |
| `last_match_date` | `date` | Most recent meetup. |
| `match_ids` | `uuid[]` | Match identifiers (latest first). |

**Refresh cadence:** Views read directly from transactional tables and do not
require manual refresh. If performance degrades with future data volume,
consider materializing with a Supabase cron job.

## Telemetry & Performance Observability

The analytics client emits a `CustomEvent("analytics:latency", detail)` on
`window` after every fetch. The `detail` payload contains the request URL,
duration in milliseconds, and a timestamp. Hook this into your preferred
monitoring tool (e.g., send to Vercel analytics or Datadog) to verify the
Phase 4 target of sub‑500 ms filter updates and sub‑250 ms P95 server
responses.

Any response exceeding 500 ms also logs a warning in the browser console:
`[analytics] slow response (###ms) for /api/analytics/...`.

## Maintenance Notes

- When updating RLS or adding new analytics views, replicate the patterns
  above (`security_invoker = true`, guard voided matches, prefer canonical
  pairs).
- After applying changes to `db/schema.sql`, rerun the Supabase SQL diff
  against the target project.
- Update Jest fixtures (`src/__tests__/analytics-client.test.tsx`) whenever
  view schemas change so component tests stay in sync.
- Commissioner API endpoints log into `audit_logs`; commissioners can review
  recent entries inside `/app/commissioner`.
