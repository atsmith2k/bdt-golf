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

do $$
begin
  if not exists (select 1 from pg_type where typname = 'record_match_participant') then
    create type public.record_match_participant as (
      user_id uuid,
      team_id uuid,
      points numeric(6,2),
      strokes numeric(6,2),
      position integer
    );
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
drop trigger if exists set_seasons_updated_at on public.seasons;
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
drop trigger if exists set_teams_updated_at on public.teams;
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
drop trigger if exists set_users_updated_at on public.users;
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
drop trigger if exists set_matches_updated_at on public.matches;
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
drop trigger if exists set_match_participants_updated_at on public.match_participants;
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
drop trigger if exists set_announcements_updated_at on public.announcements;
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

-- Audit logs --------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.users enable row level security;
alter table public.one_time_passwords enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.announcements enable row level security;
alter table public.timeline_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists seasons_select_authenticated on public.seasons;
create policy seasons_select_authenticated
on public.seasons
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists seasons_write_authenticated on public.seasons;
create policy seasons_write_authenticated
on public.seasons
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists seasons_update_authenticated on public.seasons;
create policy seasons_update_authenticated
on public.seasons
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists seasons_delete_authenticated on public.seasons;
create policy seasons_delete_authenticated
on public.seasons
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists teams_select_authenticated on public.teams;
create policy teams_select_authenticated
on public.teams
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists teams_write_authenticated on public.teams;
create policy teams_write_authenticated
on public.teams
for insert
to service_role
with check (true);

drop policy if exists teams_write_commissioners on public.teams;
create policy teams_write_commissioners
on public.teams
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'commissioner'
  )
);

drop policy if exists teams_update_authenticated on public.teams;
create policy teams_update_authenticated
on public.teams
for update
to service_role
using (true)
with check (true);

drop policy if exists teams_update_commissioners on public.teams;
create policy teams_update_commissioners
on public.teams
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'commissioner'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'commissioner'
  )
);

drop policy if exists teams_delete_authenticated on public.teams;
create policy teams_delete_authenticated
on public.teams
for delete
to service_role
using (true);

drop policy if exists teams_delete_commissioners on public.teams;
create policy teams_delete_commissioners
on public.teams
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'commissioner'
  )
);

drop policy if exists users_select_authenticated on public.users;
create policy users_select_authenticated
on public.users
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists users_write_authenticated on public.users;
create policy users_write_authenticated
on public.users
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists users_update_authenticated on public.users;
create policy users_update_authenticated
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists users_update_service_role on public.users;
create policy users_update_service_role
on public.users
for update
to service_role
using (true)
with check (true);

drop policy if exists users_delete_authenticated on public.users;
create policy users_delete_authenticated
on public.users
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists otp_select_service_role on public.one_time_passwords;
create policy otp_select_service_role
on public.one_time_passwords
for select
to service_role
using (true);

drop policy if exists otp_select_commissioners on public.one_time_passwords;
create policy otp_select_commissioners
on public.one_time_passwords
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'commissioner'
  )
);

drop policy if exists otp_write_service_role on public.one_time_passwords;
create policy otp_write_service_role
on public.one_time_passwords
for insert
to service_role
with check (true);

drop policy if exists otp_update_service_role on public.one_time_passwords;
create policy otp_update_service_role
on public.one_time_passwords
for update
to service_role
using (true)
with check (true);

drop policy if exists otp_delete_service_role on public.one_time_passwords;
create policy otp_delete_service_role
on public.one_time_passwords
for delete
to service_role
using (true);

drop policy if exists matches_select_authenticated on public.matches;
create policy matches_select_authenticated
on public.matches
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists matches_write_authenticated on public.matches;
create policy matches_write_authenticated
on public.matches
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists matches_update_authenticated on public.matches;
create policy matches_update_authenticated
on public.matches
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists matches_delete_authenticated on public.matches;
create policy matches_delete_authenticated
on public.matches
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists match_participants_select_authenticated on public.match_participants;
create policy match_participants_select_authenticated
on public.match_participants
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists match_participants_write_authenticated on public.match_participants;
create policy match_participants_write_authenticated
on public.match_participants
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists match_participants_update_authenticated on public.match_participants;
create policy match_participants_update_authenticated
on public.match_participants
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists match_participants_delete_authenticated on public.match_participants;
create policy match_participants_delete_authenticated
on public.match_participants
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists announcements_select_authenticated on public.announcements;
create policy announcements_select_authenticated
on public.announcements
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists announcements_write_authenticated on public.announcements;
create policy announcements_write_authenticated
on public.announcements
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists announcements_update_authenticated on public.announcements;
create policy announcements_update_authenticated
on public.announcements
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists announcements_delete_authenticated on public.announcements;
create policy announcements_delete_authenticated
on public.announcements
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists timeline_events_select_authenticated on public.timeline_events;
create policy timeline_events_select_authenticated
on public.timeline_events
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists timeline_events_write_authenticated on public.timeline_events;
create policy timeline_events_write_authenticated
on public.timeline_events
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists timeline_events_update_authenticated on public.timeline_events;
create policy timeline_events_update_authenticated
on public.timeline_events
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists timeline_events_delete_authenticated on public.timeline_events;
create policy timeline_events_delete_authenticated
on public.timeline_events
for delete
to authenticated
using (auth.uid() is not null);

drop policy if exists audit_logs_select_commissioners on public.audit_logs;
create policy audit_logs_select_commissioners
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'commissioner'
  )
);

drop policy if exists audit_logs_write_service_role on public.audit_logs;
create policy audit_logs_write_service_role
on public.audit_logs
for insert
to service_role
with check (true);

-- Helper views ------------------------------------------------------------

drop view if exists public.player_head_to_head;
drop view if exists public.team_season_totals;
drop view if exists public.player_season_totals;
drop view if exists public.match_points_by_team;
drop view if exists public.team_roster_counts;

create view public.team_roster_counts with (security_invoker = true) as
select
  t.id as team_id,
  t.season_id,
  count(u.id) as roster_size
from public.teams t
left join public.users u on u.team_id = t.id
group by t.id;

create view public.match_points_by_team with (security_invoker = true) as
select
  mp.match_id,
  coalesce(mp.team_id, u.team_id) as team_id,
  sum(mp.points_awarded) as total_points
from public.match_participants mp
left join public.users u on u.id = mp.user_id
group by mp.match_id, coalesce(mp.team_id, u.team_id);

create view public.player_season_totals with (security_invoker = true) as
select
  u.id as player_id,
  m.season_id,
  count(distinct m.id) as matches_played,
  sum(mp.points_awarded) as points_total,
  avg(mp.points_awarded) as points_per_match,
  sum(case when mp.points_awarded > 0 then 1 else 0 end) as wins,
  sum(case when mp.points_awarded < 0 then 1 else 0 end) as losses,
  sum(case when mp.points_awarded = 0 then 1 else 0 end) as ties,
  array(
    select mp2.points_awarded
    from public.match_participants mp2
    join public.matches m2 on m2.id = mp2.match_id
    where mp2.user_id = u.id
      and m2.season_id = m.season_id
    order by m2.match_date desc, mp2.created_at desc
    limit 5
  ) as recent_form
from public.users u
join public.match_participants mp on mp.user_id = u.id
join public.matches m on m.id = mp.match_id
where m.status <> 'voided'
group by u.id, m.season_id;

create view public.team_season_totals with (security_invoker = true) as
select
  t.id as team_id,
  m.season_id,
  count(distinct m.id) as matches_played,
  sum(mpt.total_points) as points_total,
  avg(mpt.total_points) as points_per_match,
  sum(case when mpt.total_points > 0 then 1 else 0 end) as wins,
  sum(case when mpt.total_points < 0 then 1 else 0 end) as losses,
  sum(case when mpt.total_points = 0 then 1 else 0 end) as ties,
  array(
    select m2.match_date::text
    from public.match_points_by_team mpt2
    join public.matches m2 on m2.id = mpt2.match_id
    where mpt2.team_id = t.id
      and m2.season_id = m.season_id
    order by m2.match_date desc
    limit 5
  ) as recent_matches
from public.teams t
join public.matches m on m.season_id = t.season_id
join public.match_points_by_team mpt on mpt.match_id = m.id and mpt.team_id = t.id
where m.status <> 'voided'
group by t.id, m.season_id;

create view public.player_head_to_head with (security_invoker = true) as
with participant_pairs as (
  select
    m.season_id,
    pa.match_id,
    pa.user_id as player_id,
    pb.user_id as opponent_id,
    pa.points_awarded as player_points,
    pb.points_awarded as opponent_points,
    pa.team_id as player_team_id,
    pb.team_id as opponent_team_id,
    m.match_date,
    m.created_at
  from public.match_participants pa
  join public.match_participants pb
    on pa.match_id = pb.match_id
   and pa.user_id <> pb.user_id
  join public.matches m on m.id = pa.match_id
  where m.status <> 'voided'
    and (
      pa.team_id is distinct from pb.team_id
      or pa.team_id is null
      or pb.team_id is null
    )
)
select
  season_id,
  player_id,
  opponent_id,
  count(distinct match_id) as matches_played,
  sum(player_points) as player_points_total,
  sum(opponent_points) as opponent_points_total,
  sum(case when player_points > opponent_points then 1 else 0 end) as wins,
  sum(case when player_points < opponent_points then 1 else 0 end) as losses,
  sum(case when player_points = opponent_points then 1 else 0 end) as ties,
  avg(player_points - opponent_points) as average_margin,
  max(match_date) as last_match_date,
  array_agg(match_id order by match_date desc, created_at desc) as match_ids
from participant_pairs
group by season_id, player_id, opponent_id;

-- The views above are optional conveniences for analytics. Adjust or remove
-- if you prefer to compute aggregates solely in the application layer.

comment on table public.seasons is 'Season metadata; exactly one row should have is_active = true.';
comment on table public.users is 'League user profiles mapped 1:1 with auth.users.';
comment on table public.matches is 'Match results entered by league members.';
comment on table public.match_participants is 'Participant-level detail for each match.';
comment on table public.one_time_passwords is 'One-time passwords issued by commissioners for onboarding.';
comment on table public.audit_logs is 'Write-once audit trail capturing commissioner actions.';

-- Match recording helper --------------------------------------------------

create or replace function public.record_match(
  p_season_id uuid,
  p_match_date date,
  p_match_type public.match_format,
  p_created_by uuid,
  p_participants public.record_match_participant[],
  p_course text default null,
  p_notes text default null,
  p_visibility public.match_visibility default 'private'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_match_id uuid;
  total_points numeric(10,2);
begin
  if array_length(p_participants, 1) is null or array_length(p_participants, 1) < 2 then
    raise exception 'Match requires at least two participants.';
  end if;

  select coalesce(sum(coalesce(participant.points, 0)), 0)
  into total_points
  from unnest(p_participants) as participant;

  insert into public.matches (
    season_id,
    match_date,
    match_type,
    visibility,
    course,
    notes,
    created_by
  )
  values (
    p_season_id,
    p_match_date,
    p_match_type,
    coalesce(p_visibility, 'private'),
    nullif(p_course, ''),
    nullif(p_notes, ''),
    p_created_by
  )
  returning id into new_match_id;

  insert into public.match_participants (
    match_id,
    user_id,
    team_id,
    points_awarded,
    strokes,
    position
  )
  select
    new_match_id,
    participant.user_id,
    participant.team_id,
    coalesce(participant.points, 0),
    participant.strokes,
    participant.position
  from unnest(p_participants) as participant;

  insert into public.timeline_events (
    season_id,
    event_type,
    payload,
    match_id,
    created_by
  )
  values (
    p_season_id,
    'match_result',
    jsonb_build_object(
      'match_id', new_match_id,
      'match_type', p_match_type,
      'total_points', total_points
    ),
    new_match_id,
    p_created_by
  );

  return new_match_id;
exception
  when others then
    raise;
end;
$$;

grant execute on function public.record_match(uuid, date, public.match_format, uuid, public.record_match_participant[], text, text, public.match_visibility)
to authenticated, service_role;
