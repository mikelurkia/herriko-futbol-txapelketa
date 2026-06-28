-- ENUMS
create type user_role as enum ('admin', 'team_manager');
create type season_status as enum ('setup', 'group_stage', 'playoffs', 'finished');
create type match_phase as enum ('group', 'upper_playoff', 'lower_playoff');
create type match_status as enum ('pending', 'played');
create type event_type as enum ('goal', 'yellow_card', 'red_card');
create type sanction_reason as enum ('yellow_accumulation', 'red_card', 'additional');
create type notification_type as enum ('sanction', 'result', 'publication', 'suspension_warning');

-- USERS (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role user_role not null default 'team_manager',
  created_at timestamptz not null default now()
);

-- SEASONS
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  status season_status not null default 'setup',
  created_at timestamptz not null default now()
);

-- TEAMS
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shield_url text,
  primary_color text,
  secondary_color text,
  created_at timestamptz not null default now()
);

-- SEASON_TEAMS
create table public.season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  manager_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (season_id, team_id)
);

-- GROUPS
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- GROUP_TEAMS
create table public.group_teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  season_team_id uuid not null references public.season_teams(id) on delete cascade,
  unique (group_id, season_team_id)
);

-- PLAYERS
create table public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

-- PLAYER_REGISTRATIONS
create table public.player_registrations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_team_id uuid not null references public.season_teams(id) on delete cascade,
  jersey_number integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (player_id, season_team_id)
);

-- MATCHES
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  phase match_phase not null,
  group_id uuid references public.groups(id) on delete set null,
  round integer not null,
  home_team_id uuid references public.season_teams(id) on delete set null,
  away_team_id uuid references public.season_teams(id) on delete set null,
  scheduled_date timestamptz,
  status match_status not null default 'pending',
  home_score integer,
  away_score integer,
  home_penalties integer,
  away_penalties integer,
  next_match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz not null default now()
);

-- MATCH_EVENTS
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  season_team_id uuid not null references public.season_teams(id) on delete cascade,
  type event_type not null,
  minute integer,
  created_at timestamptz not null default now()
);

-- SANCTIONS
create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  triggering_match_id uuid not null references public.matches(id) on delete cascade,
  reason sanction_reason not null,
  matches_suspended integer not null default 1,
  matches_served integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- PUBLICATIONS
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  title_eu text not null,
  title_es text not null,
  body_eu text not null,
  body_es text not null,
  author_id uuid not null references public.users(id) on delete cascade,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- INDEXES
create index on public.season_teams (season_id);
create index on public.season_teams (team_id);
create index on public.season_teams (manager_id);
create index on public.group_teams (group_id);
create index on public.group_teams (season_team_id);
create index on public.player_registrations (player_id);
create index on public.player_registrations (season_team_id);
create index on public.matches (season_id);
create index on public.matches (group_id);
create index on public.matches (phase);
create index on public.match_events (match_id);
create index on public.match_events (player_id);
create index on public.sanctions (player_id, season_id);
create index on public.sanctions (is_active);
create index on public.notifications (user_id);
create index on public.publications (published_at desc);
