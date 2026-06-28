create table public.group_round_meta (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  round integer not null,
  bye_team_id uuid references public.season_teams(id) on delete set null,
  referee_team_id uuid references public.season_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(group_id, round)
);

alter table public.group_round_meta enable row level security;

create policy "Public can read group_round_meta"
  on public.group_round_meta for select to public using (true);

create policy "Admins can manage group_round_meta"
  on public.group_round_meta for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
