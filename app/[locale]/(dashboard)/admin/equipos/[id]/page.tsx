import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeftIcon } from "lucide-react";
import { TeamForm } from "../TeamForm";

// ── Types ──────────────────────────────────────────────────────────────────────

type Team = { id: string; name: string; shield_url: string | null; primary_color: string | null; secondary_color: string | null; founded_year: number | null };
type SeasonInfo = { id: string; name: string; is_active: boolean; start_date: string };
type SeasonTeamRow = { id: string; season_id: string; manager_id: string | null; seasons: SeasonInfo };
type MatchRow = { id: string; home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null; status: string; scheduled_date: string | null; phase: string; group_id: string | null; season_id: string };
type PlayerRegRow = { jersey_number: number | null; is_active: boolean; players: { id: string; first_name: string; last_name: string; photo_url: string | null } };
type EventRow = { type: "goal" | "yellow_card" | "red_card"; player_id: string };
type GroupRow = { id: string; name: string; group_teams: { season_team_id: string }[] };
type ActiveSTRow = { id: string; teams: { name: string; primary_color: string | null } };
type GroupTeamHistoryRow = { season_team_id: string; groups: { name: string } };
type SanctionRow = { player_id: string; reason: string; matches_suspended: number; matches_served: number; players: { first_name: string; last_name: string } };
type ManagerRow = { id: string; name: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeStats(stId: string, matches: MatchRow[]) {
  let pj = 0, pg = 0, pe = 0, pp = 0, gf = 0, gc = 0;
  for (const m of matches) {
    if (m.status !== "played" || m.home_score === null || m.away_score === null) continue;
    const isHome = m.home_team_id === stId, isAway = m.away_team_id === stId;
    if (!isHome && !isAway) continue;
    pj++;
    const my = isHome ? m.home_score : m.away_score, their = isHome ? m.away_score : m.home_score;
    gf += my; gc += their;
    if (my > their) pg++; else if (my === their) pe++; else pp++;
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
  return [...stats.entries()].sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf).findIndex(([id]) => id === myStId) + 1;
}

const REASON_LABELS: Record<string, string> = {
  yellow_accumulation: "Acumulación de amarillas",
  red_card: "Tarjeta roja directa",
  additional: "Sanción adicional",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AdminTeamDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rawTeam }, { data: rawSeasonTeams }] = await Promise.all([
    supabase.from("teams").select("id, name, shield_url, primary_color, secondary_color, founded_year").eq("id", id).maybeSingle(),
    supabase.from("season_teams").select("id, season_id, manager_id, seasons(id, name, is_active, start_date)").eq("team_id", id),
  ]);

  if (!rawTeam) notFound();

  const team = rawTeam as unknown as Team;
  const seasonTeams = (rawSeasonTeams ?? []) as unknown as SeasonTeamRow[];
  const activeST = seasonTeams.find(st => st.seasons.is_active) ?? null;
  const stIds = seasonTeams.map(st => st.id);
  const activeStId = activeST?.id ?? null;
  const activeSeasonId = activeST?.season_id ?? null;
  const managerId = activeST?.manager_id ?? null;

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
    { data: rawManager },
  ] = await Promise.all([
    stIds.length > 0 ? supabase.from("matches").select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, phase, group_id, season_id").in("home_team_id", stIds) : Promise.resolve({ data: [] }),
    stIds.length > 0 ? supabase.from("matches").select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, phase, group_id, season_id").in("away_team_id", stIds) : Promise.resolve({ data: [] }),
    activeStId ? supabase.from("player_registrations").select("jersey_number, is_active, players(id, first_name, last_name, photo_url)").eq("season_team_id", activeStId).order("jersey_number", { nullsFirst: false }) : Promise.resolve({ data: [] }),
    activeStId ? supabase.from("match_events").select("type, player_id").eq("season_team_id", activeStId) : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("groups").select("id, name, group_teams(season_team_id)").eq("season_id", activeSeasonId) : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("matches").select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, phase, group_id, season_id").eq("season_id", activeSeasonId).eq("phase", "group") : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("season_teams").select("id, teams(name, primary_color)").eq("season_id", activeSeasonId) : Promise.resolve({ data: [] }),
    stIds.length > 0 ? supabase.from("group_teams").select("season_team_id, groups(name)").in("season_team_id", stIds) : Promise.resolve({ data: [] }),
    activeSeasonId ? supabase.from("sanctions").select("player_id, reason, matches_suspended, matches_served, players(first_name, last_name)").eq("season_id", activeSeasonId).eq("is_active", true) : Promise.resolve({ data: [] }),
    managerId ? supabase.from("users").select("id, name").eq("id", managerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

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
  const manager = rawManager as unknown as ManagerRow | null;

  const stInfoMap = new Map(activeSeasonSTs.map(st => [st.id, st.teams]));

  const activeMatches = activeStId
    ? allHistoryMatches.filter(m => m.season_id === activeSeasonId && (m.home_team_id === activeStId || m.away_team_id === activeStId))
    : [];
  const currentStats = activeStId ? computeStats(activeStId, activeMatches) : null;

  const myGroup = activeStId ? activeGroups.find(g => g.group_teams.some(gt => gt.season_team_id === activeStId)) : null;
  const position = activeStId && myGroup
    ? computeGroupPosition(activeStId, myGroup.group_teams.map(gt => gt.season_team_id), activeGroupMatches.filter(m => m.group_id === myGroup.id))
    : null;

  const yellowCards = events.filter(e => e.type === "yellow_card").length;
  const redCards = events.filter(e => e.type === "red_card").length;

  const squadPlayerIds = new Set(squad.map(pr => pr.players.id));
  const teamSanctions = sanctions.filter(s => squadPlayerIds.has(s.player_id));
  const sanctionedIds = new Set(teamSanctions.map(s => s.player_id));

  const groupNameMap = new Map(groupTeamHistory.map(gt => [gt.season_team_id, gt.groups.name]));

  const history = [...seasonTeams]
    .sort((a, b) => b.seasons.start_date.localeCompare(a.seasons.start_date))
    .map(st => {
      const stMatches = allHistoryMatches.filter(m => m.home_team_id === st.id || m.away_team_id === st.id);
      return { seasonName: st.seasons.name, isActive: st.seasons.is_active, groupName: groupNameMap.get(st.id) ?? null, ...computeStats(st.id, stMatches) };
    });

  const hasBothColors = team.primary_color && team.secondary_color && team.secondary_color.toLowerCase() !== team.primary_color.toLowerCase();
  const bandStyle = team.primary_color
    ? { background: hasBothColors ? `linear-gradient(to right, ${team.primary_color} 50%, ${team.secondary_color} 50%)` : team.primary_color }
    : { background: "var(--color-stone)" };

  const sh = "text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3";

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/admin/equipos" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        Equipos
      </Link>

      {/* Header */}
      <div className="bg-white border border-border overflow-hidden mb-8">
        <div className="h-2 w-full" style={bandStyle} />
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="shrink-0 w-16 h-16 relative flex items-center justify-center">
              {team.shield_url ? (
                <Image src={team.shield_url} alt={team.name} fill className="object-contain" unoptimized />
              ) : (
                <div className="flex gap-1">
                  {team.primary_color && <span className="w-5 h-10 rounded-sm" style={{ background: team.primary_color }} />}
                  {team.secondary_color && <span className="w-5 h-10 rounded-sm" style={{ background: team.secondary_color }} />}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight text-[var(--color-pitch)]" style={{ fontFamily: "var(--font-display)" }}>
                {team.name}
              </h1>
              {team.founded_year && <p className="text-sm text-[var(--color-dust)] mt-0.5">Est. {team.founded_year}</p>}
              {activeST && <p className="text-xs text-[var(--color-dust)] mt-1">Temporada activa: {activeST.seasons.name}</p>}
            </div>
          </div>
          <TeamForm team={team} />
        </div>
      </div>

      {/* Manager */}
      <section className="mb-8">
        <h2 className={sh} style={{ fontFamily: "var(--font-display)" }}>Gestor</h2>
        <div className="bg-white border border-border p-4">
          {manager ? (
            <p className="text-sm text-[var(--color-pitch)] font-medium">{manager.name}</p>
          ) : (
            <p className="text-sm text-[var(--color-dust)]">Sin gestor asignado</p>
          )}
        </div>
      </section>

      {activeST && currentStats && (
        <>
          {/* Stats */}
          <section className="mb-8">
            <h2 className={sh} style={{ fontFamily: "var(--font-display)" }}>Temporada actual</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Posición", value: position ? `${position}º${myGroup ? ` · ${myGroup.name}` : ""}` : "—" },
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

            <div className="bg-white border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                    {["PJ", "G", "E", "P", "GF", "GC", "DG", "🟨", "🟥", "Pts"].map(h => (
                      <th key={h} className="text-center px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {[currentStats.pj, currentStats.pg, currentStats.pe, currentStats.pp, currentStats.gf, currentStats.gc,
                      currentStats.gf - currentStats.gc > 0 ? `+${currentStats.gf - currentStats.gc}` : currentStats.gf - currentStats.gc,
                      yellowCards, redCards, currentStats.pts,
                    ].map((v, i) => (
                      <td key={i} className={`text-center px-3 py-3 tabular-nums ${i === 9 ? "font-bold text-[var(--color-pitch)]" : "text-[var(--color-dust)]"}`}>{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Active sanctions */}
          <section className="mb-8">
            <h2 className={sh} style={{ fontFamily: "var(--font-display)" }}>Sanciones activas</h2>
            {teamSanctions.length === 0 ? (
              <div className="bg-white border border-border p-6 text-center">
                <p className="text-sm text-[var(--color-dust)]">Sin sanciones activas</p>
              </div>
            ) : (
              <div className="bg-white border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                      <th className="text-left px-4 py-2 font-medium">Jugador</th>
                      <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Motivo</th>
                      <th className="text-center px-3 py-2 font-medium">Cumplidos</th>
                      <th className="text-center px-3 py-2 font-medium">Total</th>
                      <th className="text-center px-3 py-2 font-medium text-[var(--color-gol)]">Pendientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamSanctions.map((s, i) => (
                      <tr key={i} className="hover:bg-[var(--color-stone)]/50">
                        <td className="px-4 py-2.5 font-medium text-[var(--color-pitch)]">
                          {s.players.last_name}, {s.players.first_name}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-dust)] hidden sm:table-cell">{REASON_LABELS[s.reason] ?? s.reason}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums text-[var(--color-dust)]">{s.matches_served}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums text-[var(--color-dust)]">{s.matches_suspended}</td>
                        <td className="text-center px-3 py-2.5">
                          <span className="font-bold text-[var(--color-gol)] tabular-nums">{s.matches_suspended - s.matches_served}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Squad */}
          {squad.length > 0 && (
            <section className="mb-8">
              <h2 className={sh} style={{ fontFamily: "var(--font-display)" }}>Plantilla</h2>
              <div className="bg-white border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                      <th className="text-center px-3 py-2 font-medium w-10">#</th>
                      <th className="text-left px-4 py-2 font-medium">Jugador</th>
                      <th className="text-left px-4 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {squad.map((pr, i) => {
                      const isSanctioned = sanctionedIds.has(pr.players.id);
                      return (
                        <tr key={i} className={`hover:bg-[var(--color-stone)]/50 ${!pr.is_active ? "opacity-50" : ""}`}>
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
                          <td className="px-4 py-2.5">
                            {isSanctioned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-sm bg-red-50 text-red-700">🟥 Sancionado</span>
                            ) : !pr.is_active ? (
                              <span className="text-xs text-[var(--color-dust)]">Inactivo</span>
                            ) : (
                              <span className="text-xs text-green-600">Activo</span>
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
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2 className={sh} style={{ fontFamily: "var(--font-display)" }}>Historial</h2>
          <div className="bg-white border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                  <th className="text-left px-4 py-2 font-medium">Temporada</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Grupo</th>
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
                  <tr key={i} className="hover:bg-[var(--color-stone)]/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[var(--color-pitch)] ${row.isActive ? "font-semibold" : ""}`}>{row.seasonName}</span>
                        {row.isActive && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-sm">Actual</span>}
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
