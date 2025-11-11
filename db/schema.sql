-- Supabase schema for BDT Golf League App
-- Generated to align with src/lib/types.ts and frontend expectations.
-- Run this against your Supabase project's SQL editor or via the Supabase CLI.

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enum types ---------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type public.role_type as enum ('player', 'commissioner');
  end if;
  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type public.match_status as enum ('scheduled', 'submitted', 'validated', 'voided');
  end if;
  if not exists (select 1 from pg_type where typname = 'match_format') then
    create type public.match_format as enum ('stroke_play', 'match_play', 'skins', 'scramble', 'best_ball', 'alternate_shot');
  end if;
  if not exists (select 1 from pg_type where typname = 'match_visibility') then
    create type public.match_visibility as enum ('private', 'public');
  end if;
  if not exists (select 1 from pg_type where typname = 'timeline_event_type') then
    create type public.timeline_event_type as enum ('match_result', 'announcement', 'season_event', 'system');
  end if;
end $$;

-- Timestamp helper --------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Seasons -----------------------------------------------------------------

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_end_after_start check (end_date is null or end_date >= start_date)
);

create unique index if not exists seasons_name_unique on public.seasons (lower(name), start_date);
create trigger set_seasons_updated_at
before update on public.seasons
for each row
execute function public.set_updated_at();

-- Teams -------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  slug text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_slug_unique unique (slug)
);

create index if not exists teams_season_id_idx on public.teams (season_id);
create unique index if not exists teams_name_per_season_idx on public.teams (season_id, lower(name));
create trigger set_teams_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

-- Users -------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  email text unique,
  avatar_url text,
  bio text,
  handicap numeric(6,2),
  phone text,
  role public.role_type not null default 'player',
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists users_team_id_idx on public.users (team_id);
create index if not exists users_role_idx on public.users (role);
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- One-time passwords ------------------------------------------------------

create table if not exists public.one_time_passwords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  username text not null,
  email text,
  otp text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint otp_positive_expiration check (expires_at > created_at)
);

create index if not exists otp_username_idx on public.one_time_passwords (lower(username));
create index if not exists otp_active_idx on public.one_time_passwords (user_id, consumed_at);

-- Matches -----------------------------------------------------------------

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  match_date date not null,
  match_type public.match_format not null default 'stroke_play',
  status public.match_status not null default 'submitted',
  visibility public.match_visibility not null default 'private',
  course text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_season_idx on public.matches (season_id, match_date desc);
create index if not exists matches_created_by_idx on public.matches (created_by);
create trigger set_matches_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

-- Match participants ------------------------------------------------------

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  points_awarded numeric(6,2) not null default 0,
  strokes numeric(6,2),
  position integer,
  side text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_participants_unique unique (match_id, user_id)
);

create index if not exists match_participants_match_idx on public.match_participants (match_id);
create index if not exists match_participants_user_idx on public.match_participants (user_id);
create trigger set_match_participants_updated_at
before update on public.match_participants
for each row
execute function public.set_updated_at();

-- Announcements -----------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_season_idx on public.announcements (season_id, created_at desc);
create trigger set_announcements_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();

-- Timeline events ---------------------------------------------------------

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade,
  event_type public.timeline_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  match_id uuid references public.matches(id) on delete set null,
  announcement_id uuid references public.announcements(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists timeline_events_season_idx on public.timeline_events (season_id, created_at desc);
create index if not exists timeline_events_type_idx on public.timeline_events (event_type);

-- Helper views ------------------------------------------------------------

create or replace view public.team_roster_counts as
select
  t.id as team_id,
  t.season_id,
  count(u.id) as roster_size
from public.teams t
left join public.users u on u.team_id = t.id
group by t.id;

create or replace view public.match_points_by_team as
select
  mp.match_id,
  coalesce(mp.team_id, u.team_id) as team_id,
  sum(mp.points_awarded) as total_points
from public.match_participants mp
left join public.users u on u.id = mp.user_id
group by mp.match_id, coalesce(mp.team_id, u.team_id);

-- The views above are optional conveniences for analytics. Adjust or remove
-- if you prefer to compute aggregates solely in the application layer.

comment on table public.seasons is 'Season metadata; exactly one row should have is_active = true.';
comment on table public.users is 'League user profiles mapped 1:1 with auth.users.';
comment on table public.matches is 'Match results entered by league members.';
comment on table public.match_participants is 'Participant-level detail for each match.';
comment on table public.one_time_passwords is 'One-time passwords issued by commissioners for onboarding.';
