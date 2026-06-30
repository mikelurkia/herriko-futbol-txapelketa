import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeftIcon } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Team = {
  id: string;
  name: string;
  shield_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
};

type SeasonInfo = { id: string; name: string; is_active: boolean; start_date: string };

type SeasonTeamRow = {
  id: string;
  season_id: string;
  seasons: SeasonInfo;
};

type MatchRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  scheduled_date: string | null;
  phase: string;
  group_id: string | null;
  season_id: string;
};

type PlayerRegRow = {
  jersey_number: number | null;
  is_active: boolean;
  players: { id: string; first_name: string; last_name: string; photo_url: string | null };
};

type EventRow = {
  type: "goal" | "yellow_card" | "red_card";
  player_id: string;
  players: { first_name: string; last_name: string };
};

type GroupRow = {
  id: string;
  name: string;
  group_teams: { season_team_id: string }[];
};

type ActiveSTRow = {
  id: string;
  teams: { name: string; primary_color: string | null };
};

type GroupTeamHistoryRow = {
  season_team_id: string;
  groups: { name: string };
};

type SanctionRow = {
  player_id: string;
  reason: string;
  matches_suspended: number;
  matches_served: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeStats(stId: string, matches: MatchRow[]) {
  let pj = 0, pg = 0, pe = 0, pp = 0, gf = 0, gc = 0;
  for (const m of matches) {
    if (m.status !== "played" || m.home_score === null || m.away_score === null) continue;
    const isHome = m.home_team_id === stId;
    const isAway = m.away_team_id === stId;
    if (!isHome && !isAway) continue;
    pj++;
    const my = isHome ? m.home_score : m.away_score;
    const their = isHome ? m.away_score : m.home_score;
    gf += my; gc += their;
    if (my > their) pg++;
    else if (my === their) pe++;
    else pp++;
  }
  return { pj, pg, pe, pp, gf, gc, pts: pg * 3 + pe };
}

function computeGroupPosition(myStId: string, groupStIds: string[], groupMatches: MatchRow[]) {
  const stats = new Map(groupStIds.map(id => [id, { pts: 0, gd: 0, gf: 0 }]));
  for (const m of groupMatches) {
    if (m.status !== "played" || m.home_score === null || m.away_score === null) continue;
    const hs = m.home_team_id ? stats.get(m.home_team_id) : null;
    const as_ = m.away_team_id ? stats.get(m.away_team_id) : null;
    if (hs) { hs.gf += m.home_score; hs.gd += m.home_score - m.away_score; if (m.home_score > m.away_score) hs.pts += 3; else if (m.home_score === m.away_score) hs.pts++; }
    if (as_) { as_.gf += m.away_score; as_.gd += m.away_score - m.home_score; if (m.away_score > m.home_score) as_.pts += 3; else if (m.away_score === m.home_score) as_.pts++; }
  }
  const sorted = [...stats.entries()].sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return sorted.findIndex(([id]) => id === myStId) + 1;
}

function fmtDate(d: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

function JerseyIcon({ primary, secondary }: { primary: string; secondary: string | null }) {
  const p = primary, s = secondary ?? primary;
  const hasStripe = secondary && secondary.toLowerCase() !== primary.toLowerCase();
  return (
    <svg viewBox="0 0 80 68" xmlns="http://www.w3.org/2000/svg" className="w-20 h-16" aria-hidden>
      <path d="M1 14 L18 5 L23 26 L7 30Z" fill={p} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M79 14 L62 5 L57 26 L73 30Z" fill={p} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 30 L23 26 L27 7 L40 12 L53 7 L57 26 L73 30 L69 67 L11 67Z" fill={p} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M27 7 Q40 21 53 7" fill="none" stroke={s} strokeWidth="5" strokeLinecap="round" />
      {hasStripe && <path d="M10 40 L70 40 L69 52 L11 52Z" fill={s} />}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TeamDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const [{ data: rawTeam }, { data: rawSeasonTeams }] = await Promise.all([
    supabase.from("teams").select("id, name, shield_url, primary_color, secondary_color, founded_year").eq("id", id).maybeSingle(),
    supabase.from("season_teams").select("id, season_id, seasons(id, name, is_active, start_date)").eq("team_id", id),
  ]);

  if (!rawTeam) notFound();

  const team = rawTeam as unknown as Team;
  const seasonTeams = (rawSeasonTeams ?? []) as unknown as SeasonTeamRow[];
  const activeST = seasonTeams.find(st => st.seasons.is_active) ?? null;
  const stIds = seasonTeams.map(st => st.id);
  const activeStId = activeST?.id ?? null;
  const activeSeasonId = activeST?.season_id ?? null;

  const [
    { data: rawHomeMatches },
    { data: rawAwayMatches },
    { data: rawSquad },
    { data: rawEvents },
    { data: rawActiveGroups },
    { data: rawActiveGroupMatches },
    { data: rawActiveSeasonSTs },
    { data: rawGroupTeamHistory },
    { data: rawSanctions },
  ] = await Promise.all([
    stIds.length > 0 ? supabase.from("matches").select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, phase, group_id, season_id").in("home_team_id", stIds) : Promise.resolve({ data: [] }),
    stIds.length > 0 ? supabase.from("matches").select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, phase, group_id, season_id").in("away_team_id", stIds) : Promise.resolve({ data: [] }),
    activeStId ? supabase.from("player_registrations").select("jersey_number, is_active, players(id, first_name, last_name, photo_url)").eq("season_team_id", activeStId).order("jersey_number", { nullsFirst: false }) : Promise.resolve({ data: [] }),
    activeStId ? supabase.from("match_events").select("type, player_id, players(first_name, last_name)").eq("season_team_id", activeStId) : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("groups").select("id, name, group_teams(season_team_id)").eq("season_id", activeSeasonId) : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("matches").select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, phase, group_id, season_id").eq("season_id", activeSeasonId).eq("phase", "group") : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("season_teams").select("id, teams(name, primary_color)").eq("season_id", activeSeasonId) : Promise.resolve({ data: [] }),
    stIds.length > 0 ? supabase.from("group_teams").select("season_team_id, groups(name)").in("season_team_id", stIds) : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("sanctions").select("player_id, reason, matches_suspended, matches_served").eq("season_id", activeSeasonId).eq("is_active", true) : Promise.resolve({ data: [] }),
  ]);

  // Merge home + away matches (no duplicates since a team can't play itself)
  const allHistoryMatches: MatchRow[] = [
    ...((rawHomeMatches ?? []) as unknown as MatchRow[]),
    ...((rawAwayMatches ?? []) as unknown as MatchRow[]),
  ];

  const squad = (rawSquad ?? []) as unknown as PlayerRegRow[];
  const events = (rawEvents ?? []) as unknown as EventRow[];
  const activeGroups = (rawActiveGroups ?? []) as unknown as GroupRow[];
  const activeGroupMatches = (rawActiveGroupMatches ?? []) as unknown as MatchRow[];
  const activeSeasonSTs = (rawActiveSeasonSTs ?? []) as unknown as ActiveSTRow[];
  const groupTeamHistory = (rawGroupTeamHistory ?? []) as unknown as GroupTeamHistoryRow[];
  const sanctions = (rawSanctions ?? []) as unknown as SanctionRow[];

  // season_team_id → team info (active season)
  const stInfoMap = new Map(activeSeasonSTs.map(st => [st.id, st.teams]));

  // Active season matches for this team
  const activeMatches = activeStId
    ? allHistoryMatches.filter(m => m.season_id === activeSeasonId && (m.home_team_id === activeStId || m.away_team_id === activeStId))
    : [];
  const currentStats = activeStId ? computeStats(activeStId, activeMatches) : null;

  // Group & position
  const myGroup = activeStId ? activeGroups.find(g => g.group_teams.some(gt => gt.season_team_id === activeStId)) : null;
  const position = activeStId && myGroup
    ? computeGroupPosition(activeStId, myGroup.group_teams.map(gt => gt.season_team_id), activeGroupMatches.filter(m => m.group_id === myGroup.id))
    : null;

  // Racha (last 5 played, sorted desc)
  const playedDesc = activeMatches
    .filter(m => m.status === "played" && m.home_score !== null)
    .sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? ""));
  const last5 = playedDesc.slice(0, 5).map(m => {
    const isHome = m.home_team_id === activeStId;
    const my = isHome ? m.home_score! : m.away_score!;
    const their = isHome ? m.away_score! : m.home_score!;
    return my > their ? "W" : my === their ? "D" : "L";
  });

  const nextMatch = activeMatches.filter(m => m.status === "pending").sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""))[0] ?? null;
  const lastMatch = playedDesc[0] ?? null;

  // Top scorers
  const goalsByPlayer = new Map<string, { name: string; goals: number }>();
  for (const e of events) {
    if (e.type !== "goal") continue;
    const ex = goalsByPlayer.get(e.player_id);
    if (ex) ex.goals++;
    else goalsByPlayer.set(e.player_id, { name: `${e.players.last_name}, ${e.players.first_name}`, goals: 1 });
  }
  const topScorers = [...goalsByPlayer.values()].sort((a, b) => b.goals - a.goals).slice(0, 5);
  const yellowCards = events.filter(e => e.type === "yellow_card").length;
  const redCards = events.filter(e => e.type === "red_card").length;

  // Sanctions map
  const squadPlayerIds = new Set(squad.map(pr => pr.players.id));
  const sanctionedIds = new Set(sanctions.filter(s => squadPlayerIds.has(s.player_id)).map(s => s.player_id));
  const sanctionMap = new Map(sanctions.map(s => [s.player_id, s]));

  // History: season_team_id → group name
  const groupNameMap = new Map(groupTeamHistory.map(gt => [gt.season_team_id, gt.groups.name]));

  const history = [...seasonTeams]
    .sort((a, b) => b.seasons.start_date.localeCompare(a.seasons.start_date))
    .map(st => {
      const stMatches = allHistoryMatches.filter(m => m.home_team_id === st.id || m.away_team_id === st.id);
      return { seasonName: st.seasons.name, isActive: st.seasons.is_active, groupName: groupNameMap.get(st.id) ?? null, ...computeStats(st.id, stMatches) };
    });

  // Visual
  const hasBothColors = team.primary_color && team.secondary_color && team.secondary_color.toLowerCase() !== team.primary_color.toLowerCase();
  const bandStyle = team.primary_color
    ? { background: hasBothColors ? `linear-gradient(to right, ${team.primary_color} 50%, ${team.secondary_color} 50%)` : team.primary_color }
    : { background: "var(--color-stone)" };

  const sectionHeading = "text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3";

  return (
    <div>
      <Link href="/equipos" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors mb-6">
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        {locale === "eu" ? "Taldeak" : "Equipos"}
      </Link>

      {/* Header */}
      <div className="bg-white border border-border overflow-hidden mb-8">
        <div className="h-2 w-full" style={bandStyle} />
        <div className="p-6 flex items-start gap-6">
          <div className="shrink-0 flex items-center justify-center w-24 h-20">
            {team.shield_url ? (
              <div className="relative w-20 h-20">
                <Image src={team.shield_url} alt={`Escudo ${team.name}`} fill className="object-contain drop-shadow-sm" unoptimized />
              </div>
            ) : (
              <JerseyIcon primary={team.primary_color ?? "#374151"} secondary={team.secondary_color} />
            )}
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <h1 className="text-3xl font-bold uppercase tracking-tight text-[var(--color-pitch)] leading-none" style={{ fontFamily: "var(--font-display)" }}>
              {team.name}
            </h1>
            {team.founded_year && (
              <p className="text-sm text-[var(--color-dust)]">{locale === "eu" ? "Sort." : "Est."} {team.founded_year}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              {team.primary_color && <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: team.primary_color }} />}
              {team.secondary_color && <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: team.secondary_color }} />}
            </div>
            {activeST && (
              <p className="text-xs text-[var(--color-dust)] mt-0.5">
                {locale === "eu" ? "Txapelketa" : "Temporada"}: {activeST.seasons.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {activeST && currentStats && (
        <>
          {/* Current season */}
          <section className="mb-8">
            <h2 className={sectionHeading} style={{ fontFamily: "var(--font-display)" }}>
              {locale === "eu" ? "Oraingo denboraldia" : "Temporada actual"}
            </h2>

            {/* Key stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: locale === "eu" ? "Sailk." : "Posición", value: position ? `${position}º${myGroup ? ` · ${myGroup.name}` : ""}` : "—" },
                { label: "PJ", value: currentStats.pj },
                { label: "Pts", value: currentStats.pts },
                { label: "DG", value: currentStats.gf - currentStats.gc > 0 ? `+${currentStats.gf - currentStats.gc}` : String(currentStats.gf - currentStats.gc) },
              ].map(card => (
                <div key={card.label} className="bg-white border border-border p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--color-pitch)]" style={{ fontFamily: "var(--font-display)" }}>{card.value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Full stats row */}
            <div className="bg-white border border-border overflow-x-auto mb-4">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                    {["PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map(h => (
                      <th key={h} className="text-center px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {[currentStats.pj, currentStats.pg, currentStats.pe, currentStats.pp, currentStats.gf, currentStats.gc,
                      currentStats.gf - currentStats.gc > 0 ? `+${currentStats.gf - currentStats.gc}` : currentStats.gf - currentStats.gc,
                      currentStats.pts,
                    ].map((v, i) => (
                      <td key={i} className={`text-center px-3 py-3 tabular-nums ${i === 7 ? "font-bold text-[var(--color-pitch)]" : "text-[var(--color-dust)]"}`}>{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Racha */}
            {last5.length > 0 && (
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-dust)]">
                  {locale === "eu" ? "Azken 5" : "Últimas 5"}
                </span>
                <div className="flex gap-1.5">
                  {last5.map((r, i) => (
                    <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${r === "W" ? "bg-green-500" : r === "D" ? "bg-[var(--color-dust)]" : "bg-[var(--color-gol)]"}`}>
                      {r === "W" ? "G" : r === "D" ? "E" : "P"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next / Last match */}
            {(nextMatch || lastMatch) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {nextMatch && (() => {
                  const home = nextMatch.home_team_id ? stInfoMap.get(nextMatch.home_team_id) : null;
                  const away = nextMatch.away_team_id ? stInfoMap.get(nextMatch.away_team_id) : null;
                  return (
                    <div className="bg-white border border-border p-4">
                      <p className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] mb-2">{locale === "eu" ? "Hurrengo partida" : "Próximo partido"}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-[var(--color-pitch)] truncate">{home?.name ?? "—"}</span>
                        <span className="text-xs text-[var(--color-dust)] shrink-0">vs</span>
                        <span className="font-medium text-sm text-[var(--color-pitch)] truncate text-right">{away?.name ?? "—"}</span>
                      </div>
                      {nextMatch.scheduled_date && <p className="text-xs text-[var(--color-dust)] mt-1.5">{fmtDate(nextMatch.scheduled_date, locale)}</p>}
                    </div>
                  );
                })()}

                {lastMatch && (() => {
                  const home = lastMatch.home_team_id ? stInfoMap.get(lastMatch.home_team_id) : null;
                  const away = lastMatch.away_team_id ? stInfoMap.get(lastMatch.away_team_id) : null;
                  const isHome = lastMatch.home_team_id === activeStId;
                  const my = isHome ? lastMatch.home_score! : lastMatch.away_score!;
                  const their = isHome ? lastMatch.away_score! : lastMatch.home_score!;
                  const resultClass = my > their ? "text-green-600" : my === their ? "text-[var(--color-dust)]" : "text-[var(--color-gol)]";
                  const resultLabel = my > their ? "G" : my === their ? "E" : "P";
                  return (
                    <div className="bg-white border border-border p-4">
                      <p className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] mb-2">{locale === "eu" ? "Azken emaitza" : "Último resultado"}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-[var(--color-pitch)] truncate">{home?.name ?? "—"}</span>
                        <span className="font-bold tabular-nums text-[var(--color-pitch)] shrink-0">{lastMatch.home_score} – {lastMatch.away_score}</span>
                        <span className="font-medium text-sm text-[var(--color-pitch)] truncate text-right">{away?.name ?? "—"}</span>
                      </div>
                      <div className="flex items-center mt-1.5">
                        {lastMatch.scheduled_date && <p className="text-xs text-[var(--color-dust)]">{fmtDate(lastMatch.scheduled_date, locale)}</p>}
                        <span className={`text-xs font-bold ml-auto ${resultClass}`}>{resultLabel}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>

          {/* Squad */}
          {squad.length > 0 && (
            <section className="mb-8">
              <h2 className={sectionHeading} style={{ fontFamily: "var(--font-display)" }}>
                {locale === "eu" ? "Taldekideak" : "Plantilla"}
              </h2>
              <div className="bg-white border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                      <th className="text-center px-3 py-2 font-medium w-10">#</th>
                      <th className="text-left px-4 py-2 font-medium">{locale === "eu" ? "Jokalaria" : "Jugador"}</th>
                      <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">{locale === "eu" ? "Egoera" : "Estado"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {squad.map((pr, i) => {
                      const isSanctioned = sanctionedIds.has(pr.players.id);
                      const sanction = sanctionMap.get(pr.players.id);
                      const matchesLeft = sanction ? sanction.matches_suspended - sanction.matches_served : 0;
                      return (
                        <tr key={i} className={`hover:bg-[var(--color-stone)]/50 transition-colors ${!pr.is_active ? "opacity-50" : ""}`}>
                          <td className="px-3 py-2.5 text-center tabular-nums text-[var(--color-dust)] text-xs">{pr.jersey_number ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {pr.players.photo_url ? (
                                <div className="w-7 h-7 rounded-full overflow-hidden relative shrink-0 border border-border">
                                  <Image src={pr.players.photo_url} alt="" fill className="object-cover" unoptimized />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[var(--color-stone)] border border-border shrink-0" />
                              )}
                              <span className="font-medium text-[var(--color-pitch)]">{pr.players.last_name}, {pr.players.first_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            {isSanctioned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-sm bg-red-50 text-red-700">
                                🟥 {locale === "eu" ? "Zigortua" : "Sancionado"}{matchesLeft > 0 && ` (${matchesLeft})`}
                              </span>
                            ) : !pr.is_active ? (
                              <span className="text-xs text-[var(--color-dust)]">{locale === "eu" ? "Baja" : "Inactivo"}</span>
                            ) : (
                              <span className="text-xs text-green-600">{locale === "eu" ? "Aktibo" : "Activo"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Scorers + Discipline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {topScorers.length > 0 && (
              <section>
                <h2 className={sectionHeading} style={{ fontFamily: "var(--font-display)" }}>
                  {locale === "eu" ? "Golargileak" : "Goleadores"}
                </h2>
                <div className="bg-white border border-border overflow-hidden">
                  {topScorers.map((s, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < topScorers.length - 1 ? "border-b border-border" : ""}`}>
                      <span className="text-xs text-[var(--color-dust)] w-4 text-right tabular-nums">{i + 1}</span>
                      <span className="flex-1 text-sm text-[var(--color-pitch)]">{s.name}</span>
                      <span className="font-bold text-[var(--color-pitch)] tabular-nums">{s.goals} <span className="text-xs font-normal">⚽</span></span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className={sectionHeading} style={{ fontFamily: "var(--font-display)" }}>
                {locale === "eu" ? "Diziplina" : "Disciplina"}
              </h2>
              <div className="bg-white border border-border divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[var(--color-pitch)]">🟨 {locale === "eu" ? "Amarilloak" : "Tarjetas amarillas"}</span>
                  <span className="font-bold text-[var(--color-pitch)] tabular-nums">{yellowCards}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[var(--color-pitch)]">🟥 {locale === "eu" ? "Gorriak" : "Tarjetas rojas"}</span>
                  <span className="font-bold text-[var(--color-pitch)] tabular-nums">{redCards}</span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2 className={sectionHeading} style={{ fontFamily: "var(--font-display)" }}>
            {locale === "eu" ? "Historia" : "Historial"}
          </h2>
          <div className="bg-white border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                  <th className="text-left px-4 py-2 font-medium">{locale === "eu" ? "Denboraldia" : "Temporada"}</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">{locale === "eu" ? "Taldea" : "Grupo"}</th>
                  <th className="text-center px-2 py-2 font-medium">PJ</th>
                  <th className="text-center px-2 py-2 font-medium">G</th>
                  <th className="text-center px-2 py-2 font-medium">E</th>
                  <th className="text-center px-2 py-2 font-medium">P</th>
                  <th className="text-center px-2 py-2 font-medium hidden sm:table-cell">GF</th>
                  <th className="text-center px-2 py-2 font-medium hidden sm:table-cell">GC</th>
                  <th className="text-center px-3 py-2 font-bold text-[var(--color-pitch)]">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--color-stone)]/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[var(--color-pitch)] ${row.isActive ? "font-semibold" : ""}`}>{row.seasonName}</span>
                        {row.isActive && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-sm">{locale === "eu" ? "Orain" : "Actual"}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-dust)] hidden sm:table-cell">{row.groupName ?? "—"}</td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.pj}</td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.pg}</td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.pe}</td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.pp}</td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)] hidden sm:table-cell">{row.gf}</td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)] hidden sm:table-cell">{row.gc}</td>
                    <td className="text-center px-3 py-2.5"><span className="font-bold text-[var(--color-pitch)]">{row.pts}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
