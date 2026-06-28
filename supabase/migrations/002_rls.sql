-- HELPER FUNCTIONS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function public.is_manager_of(p_season_team_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.season_teams
    where id = p_season_team_id and manager_id = auth.uid()
  );
$$ language sql security definer stable;

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.season_teams enable row level security;
alter table public.groups enable row level security;
alter table public.group_teams enable row level security;
alter table public.players enable row level security;
alter table public.player_registrations enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.sanctions enable row level security;
alter table public.publications enable row level security;
alter table public.notifications enable row level security;

-- USERS
create policy "Users are viewable by authenticated users"
  on public.users for select to authenticated using (true);

create policy "Admins can insert users"
  on public.users for insert to authenticated
  with check (public.is_admin());

create policy "Admins can update users"
  on public.users for update to authenticated
  using (public.is_admin());

-- SEASONS (public read, admin write)
create policy "Seasons are publicly viewable"
  on public.seasons for select using (true);

create policy "Admins can manage seasons"
  on public.seasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- TEAMS (public read, admin + own manager write)
create policy "Teams are publicly viewable"
  on public.teams for select using (true);

create policy "Admins can manage teams"
  on public.teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Team managers can update their own team"
  on public.teams for update to authenticated
  using (
    exists (
      select 1 from public.season_teams
      where team_id = teams.id and manager_id = auth.uid()
    )
  );

-- SEASON_TEAMS (public read, admin write)
create policy "Season teams are publicly viewable"
  on public.season_teams for select using (true);

create policy "Admins can manage season teams"
  on public.season_teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- GROUPS (public read, admin write)
create policy "Groups are publicly viewable"
  on public.groups for select using (true);

create policy "Admins can manage groups"
  on public.groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- GROUP_TEAMS (public read, admin write)
create policy "Group teams are publicly viewable"
  on public.group_teams for select using (true);

create policy "Admins can manage group teams"
  on public.group_teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- PLAYERS (public read, admin + own team manager write)
create policy "Players are publicly viewable"
  on public.players for select using (true);

create policy "Admins can manage players"
  on public.players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Team managers can insert players"
  on public.players for insert to authenticated
  with check (public.is_admin() or auth.uid() in (
    select manager_id from public.season_teams where manager_id is not null
  ));

create policy "Team managers can update players in their team"
  on public.players for update to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.player_registrations pr
      join public.season_teams st on st.id = pr.season_team_id
      where pr.player_id = players.id and st.manager_id = auth.uid()
    )
  );

-- PLAYER_REGISTRATIONS (public read, admin + own team manager write)
create policy "Player registrations are publicly viewable"
  on public.player_registrations for select using (true);

create policy "Admins can manage player registrations"
  on public.player_registrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Team managers can manage their own roster"
  on public.player_registrations for all to authenticated
  using (public.is_manager_of(season_team_id))
  with check (public.is_manager_of(season_team_id));

-- MATCHES (public read, admin write)
create policy "Matches are publicly viewable"
  on public.matches for select using (true);

create policy "Admins can manage matches"
  on public.matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- MATCH_EVENTS (public read, admin write)
create policy "Match events are publicly viewable"
  on public.match_events for select using (true);

create policy "Admins can manage match events"
  on public.match_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- SANCTIONS (public read, admin write)
create policy "Sanctions are publicly viewable"
  on public.sanctions for select using (true);

create policy "Admins can manage sanctions"
  on public.sanctions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- PUBLICATIONS (public read, admin write)
create policy "Publications are publicly viewable"
  on public.publications for select using (true);

create policy "Admins can manage publications"
  on public.publications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- NOTIFICATIONS (private: only the recipient)
create policy "Users can view their own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users can mark their own notifications as read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can insert notifications"
  on public.notifications for insert to authenticated
  with check (public.is_admin());
