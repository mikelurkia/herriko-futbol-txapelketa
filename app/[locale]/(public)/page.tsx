import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { PageHeading } from "@/components/layout/PageHeading";
import { TeamCrest } from "@/components/teams/TeamCrest";

// ── Standings types & logic (mirrors clasificacion page) ─────────────────────

type MatchRow = {
  id: string;
  status: string;
  phase: string;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  scheduled_date: string | null;
};

type STInfo = {
  id: string;
  teams: { name: string; primary_color: string | null; shield_url: string | null };
};

type TeamStats = {
  id: string;
  name: string;
  color: string | null;
  shieldUrl: string | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
};

function buildStandings(
  ids: string[],
  stMap: Map<string, STInfo>,
  matches: MatchRow[]
): TeamStats[] {
  const stats = new Map<string, TeamStats>();
  for (const id of ids) {
    const st = stMap.get(id);
    stats.set(id, {
      id,
      name: st?.teams.name ?? "—",
      color: st?.teams.primary_color ?? null,
      shieldUrl: st?.teams.shield_url ?? null,
      pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0,
    });
  }
  for (const m of matches) {
    if (m.status !== "played" || m.home_score === null || m.away_score === null) continue;
    const hs = m.home_team_id ? stats.get(m.home_team_id) : null;
    const as_ = m.away_team_id ? stats.get(m.away_team_id) : null;
    if (hs) {
      hs.pj++; hs.gf += m.home_score; hs.gc += m.away_score;
      if (m.home_score > m.away_score) { hs.g++; hs.pts += 3; }
      else if (m.home_score === m.away_score) { hs.e++; hs.pts++; }
      else hs.p++;
    }
    if (as_) {
      as_.pj++; as_.gf += m.away_score; as_.gc += m.home_score;
      if (m.away_score > m.home_score) { as_.g++; as_.pts += 3; }
      else if (m.away_score === m.home_score) { as_.e++; as_.pts++; }
      else as_.p++;
    }
  }
  return [...stats.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const da = a.gf - a.gc, db = b.gf - b.gc;
    if (db !== da) return db - da;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });
}

// ── Scorer types ─────────────────────────────────────────────────────────────

type PlayerReg = {
  id: string;
  is_active: boolean;
  season_team_id: string;
  player_id: string;
  players: { first_name: string; last_name: string };
};

type STRow = {
  id: string;
  teams: { name: string };
  player_registrations: PlayerReg[];
};

type GoalEvent = { player_id: string };

type GroupRow = {
  id: string;
  name: string;
  group_teams: { season_team_id: string }[];
};

// ── Section header helper ─────────────────────────────────────────────────────

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2
        className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      <Link
        href={href}
        className="text-xs text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) {
    return (
      <div className="py-16 text-center">
        <h1
          className="text-4xl font-bold uppercase tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
        >
          Herriko Futbol Txapelketa
        </h1>
        <p className="text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago denboraldi aktiborik." : "No hay temporada activa."}
        </p>
      </div>
    );
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: rawGroups },
    { data: rawST },
    { data: rawMatches },
    { data: rawPubs },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, group_teams(season_team_id)")
      .eq("season_id", season.id)
      .order("name"),
    supabase
      .from("season_teams")
      .select("id, teams(name, primary_color, shield_url), player_registrations(id, is_active, season_team_id, player_id, players(first_name, last_name))")
      .eq("season_id", season.id),
    supabase
      .from("matches")
      .select("id, status, phase, group_id, home_team_id, away_team_id, home_score, away_score, scheduled_date")
      .eq("season_id", season.id)
      .eq("phase", "group"),
    supabase
      .from("publications")
      .select("id, title_es, title_eu, published_at")
      .gte("published_at", sevenDaysAgo)
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  const groups = (rawGroups ?? []) as unknown as GroupRow[];
  const stMap = new Map(((rawST ?? []) as unknown as STInfo[]).map((st) => [st.id, st]));
  const seasonTeams = (rawST ?? []) as unknown as STRow[];
  const matches = (rawMatches ?? []) as MatchRow[];

  // ── Goal events (requires match IDs) ─────────────────────────────────────
  const matchIds = matches.map((m) => m.id);
  let goalEvents: GoalEvent[] = [];
  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("match_events")
      .select("player_id")
      .eq("type", "goal")
      .in("match_id", matchIds);
    goalEvents = (data ?? []) as GoalEvent[];
  }

  // ── Build scorers ─────────────────────────────────────────────────────────
  const goalMap = new Map<string, number>();
  for (const ev of goalEvents) {
    goalMap.set(ev.player_id, (goalMap.get(ev.player_id) ?? 0) + 1);
  }

  type Scorer = { playerId: string; name: string; teamName: string; goals: number };
  const scorers: Scorer[] = [];

  for (const [playerId, goals] of goalMap.entries()) {
    let name = "";
    let teamName = "";
    outer: for (const st of seasonTeams) {
      for (const reg of st.player_registrations) {
        if (reg.player_id === playerId && reg.is_active) {
          name = `${reg.players.last_name}, ${reg.players.first_name}`;
          teamName = st.teams.name;
          break outer;
        }
      }
    }
    if (name) scorers.push({ playerId, name, teamName, goals });
  }
  scorers.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
  const top5 = scorers.slice(0, 5);

  // ── Publications ──────────────────────────────────────────────────────────
  const publications = rawPubs ?? [];

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", {
      day: "numeric",
      month: "short",
    }).format(new Date(d));

  // ── Standings per group (shared by the leader card and the table below) ──
  const groupStandings = groups.map((g) => {
    const ids = g.group_teams.map((gt) => gt.season_team_id);
    const groupMatches = matches.filter((m) => m.group_id === g.id);
    return { group: g, standings: buildStandings(ids, stMap, groupMatches) };
  });
  const leaders = groupStandings
    .filter(({ standings }) => standings.some((s) => s.pj > 0))
    .map(({ group, standings }) => ({ group, leader: standings[0] }));

  // ── Next match (group phase) ─────────────────────────────────────────────
  const nextMatch = matches
    .filter((m) => m.status === "pending")
    .sort((a, b) => (a.scheduled_date ?? "9999").localeCompare(b.scheduled_date ?? "9999"))[0] ?? null;
  const nextMatchHome = nextMatch?.home_team_id ? stMap.get(nextMatch.home_team_id) : null;
  const nextMatchAway = nextMatch?.away_team_id ? stMap.get(nextMatch.away_team_id) : null;
  const nextMatchDate = nextMatch?.scheduled_date
    ? new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(nextMatch.scheduled_date))
    : null;

  // ── Labels ────────────────────────────────────────────────────────────────
  const t = {
    clasificacion: locale === "eu" ? "Sailkapena" : "Clasificación",
    goleadores: locale === "eu" ? "Goleatzaileak" : "Goleadores",
    noticias: locale === "eu" ? "Berriak" : "Noticias recientes",
    verTodo: locale === "eu" ? "Ikusi denak" : "Ver todo",
    verTodas: locale === "eu" ? "Ikusi denak" : "Ver todas",
    sinNoticias: locale === "eu" ? "Azken 7 egunetan albisterik ez." : "Sin noticias en los últimos 7 días.",
    sinGoleadores: locale === "eu" ? "Oraindik ez dago golatzailerik." : "Aún no hay goleadores.",
    sinGrupos: locale === "eu" ? "Oraindik ez dago talderik." : "Aún no hay grupos definidos.",
    pos: "Pos",
    pts: "Pts",
    pj: "PJ",
  };

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <PageHeading
        title="Herriko Futbol Txapelketa"
        subtitle={`${locale === "eu" ? "Oñatiko futbol txapelketa" : "Torneo de fútbol de Oñati"} · ${season.name}`}
        large
      />

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {(nextMatch || top5.length > 0 || leaders.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {nextMatch && (
            <Link
              href="/partidos"
              className="bg-white border border-border p-4 hover:border-[var(--color-gol)] transition-colors"
            >
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] mb-2">
                {locale === "eu" ? "Hurrengo partida" : "Próximo partido"}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-[var(--color-pitch)] truncate">
                  {nextMatchHome?.teams.name ?? "—"}
                </span>
                <span className="text-xs text-[var(--color-dust)] shrink-0">vs</span>
                <span className="font-medium text-sm text-[var(--color-pitch)] truncate text-right">
                  {nextMatchAway?.teams.name ?? "—"}
                </span>
              </div>
              {nextMatchDate && (
                <p className="text-xs text-[var(--color-dust)] mt-1.5 capitalize">{nextMatchDate}</p>
              )}
            </Link>
          )}

          {top5.length > 0 && (
            <Link
              href="/jugadores"
              className="bg-white border border-border p-4 hover:border-[var(--color-gol)] transition-colors"
            >
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] mb-2">
                {locale === "eu" ? "Golegilea" : "Máximo goleador"}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-[var(--color-pitch)] truncate">{top5[0].name}</span>
                <span className="font-bold tabular-nums text-[var(--color-gol)] shrink-0">⚽ {top5[0].goals}</span>
              </div>
              <p className="text-xs text-[var(--color-dust)] mt-1.5 truncate">{top5[0].teamName}</p>
            </Link>
          )}

          {leaders.length > 0 && (
            <Link
              href="/clasificacion"
              className="bg-white border border-border p-4 hover:border-[var(--color-gol)] transition-colors"
            >
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] mb-2">
                {leaders.length > 1
                  ? locale === "eu" ? "Liderrak" : "Líderes"
                  : locale === "eu" ? "Liderra" : "Líder"}
              </p>
              <div className="flex flex-col gap-1.5">
                {leaders.slice(0, 2).map(({ group, leader }) => (
                  <div key={group.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TeamCrest shieldUrl={leader.shieldUrl} color={leader.color} />
                      <span className="font-medium text-sm text-[var(--color-pitch)] truncate">{leader.name}</span>
                    </div>
                    <span className="text-xs text-[var(--color-dust)] shrink-0">
                      {leaders.length > 1 ? `${group.name} · ` : ""}{leader.pts} {t.pts}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Left: Clasificación ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          <section>
            <SectionHeader title={t.clasificacion} href="/clasificacion" linkLabel={t.verTodo} />

            {groups.length === 0 ? (
              <p className="text-sm text-[var(--color-dust)]">{t.sinGrupos}</p>
            ) : (
              <div className="space-y-5">
                {groupStandings.map(({ group: g, standings }) => {
                  return (
                    <div key={g.id}>
                      <p
                        className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dust)] mb-1.5 px-0.5"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {g.name}
                      </p>
                      <div className="bg-white border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-[10px] uppercase tracking-widest text-[var(--color-dust)] bg-[var(--color-stone)]">
                              <th className="text-left px-3 py-1.5 w-5 font-medium">#</th>
                              <th className="text-left px-3 py-1.5 font-medium">
                                {locale === "eu" ? "Taldea" : "Equipo"}
                              </th>
                              <th className="text-center px-2 py-1.5 font-medium">{t.pj}</th>
                              <th className="text-center px-3 py-1.5 font-bold text-[var(--color-pitch)]">
                                {t.pts}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {standings.map((row, i) => (
                              <tr key={row.id} className="hover:bg-[var(--color-stone)]/40 transition-colors">
                                <td className="px-3 py-2 text-xs text-[var(--color-dust)] tabular-nums">
                                  {i + 1}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <TeamCrest shieldUrl={row.shieldUrl} color={row.color} size={18} />
                                    <span className="font-medium text-[var(--color-pitch)]">{row.name}</span>
                                  </div>
                                </td>
                                <td className="text-center px-2 py-2 tabular-nums text-[var(--color-dust)] text-xs">
                                  {row.pj}
                                </td>
                                <td className="text-center px-3 py-2">
                                  <span className="font-bold text-[var(--color-pitch)]">{row.pts}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Goleadores */}
          <section>
            <SectionHeader title={t.goleadores} href="/jugadores" linkLabel={t.verTodo} />

            {top5.length === 0 ? (
              <p className="text-sm text-[var(--color-dust)]">{t.sinGoleadores}</p>
            ) : (
              <div className="bg-white border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {top5.map((s, i) => (
                      <tr key={s.playerId} className="hover:bg-[var(--color-stone)]/40 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-[var(--color-dust)] tabular-nums w-6">
                          {i + 1}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-[var(--color-pitch)]">
                          {s.name}
                        </td>
                        <td className="px-2 py-2.5 text-xs text-[var(--color-dust)] hidden sm:table-cell lg:hidden xl:table-cell">
                          {s.teamName}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                          <span className="text-[var(--color-gol)]">⚽ {s.goals}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Noticias recientes */}
          <section>
            <SectionHeader title={t.noticias} href="/noticias" linkLabel={t.verTodas} />

            {publications.length === 0 ? (
              <p className="text-sm text-[var(--color-dust)]">{t.sinNoticias}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {publications.map((pub) => {
                  const title = locale === "eu" ? pub.title_eu : pub.title_es;
                  return (
                    <Link
                      key={pub.id}
                      href={`/noticias/${pub.id}`}
                      className="flex items-start gap-3 bg-white border border-border p-3 hover:bg-[var(--color-stone)]/60 transition-colors group"
                    >
                      <span className="text-xs text-[var(--color-dust)] shrink-0 mt-0.5 tabular-nums w-10">
                        {fmtDate(pub.published_at)}
                      </span>
                      <span
                        className="text-sm font-medium text-[var(--color-pitch)] group-hover:text-[var(--color-gol)] transition-colors leading-snug line-clamp-2"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
