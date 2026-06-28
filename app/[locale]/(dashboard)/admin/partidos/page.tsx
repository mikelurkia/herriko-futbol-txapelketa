import { createClient } from "@/lib/supabase/server";
import { CreateMatchForm, type GroupOption, type SeasonTeamOption } from "./MatchForm";
import { ResultForm, EditDateForm, DeleteMatchButton } from "./ResultForm";

type MatchRow = {
  id: string;
  phase: "group" | "upper_playoff" | "lower_playoff";
  status: "pending" | "played";
  scheduled_date: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  group_id: string | null;
  round: number;
  home_team_id: string | null;
  away_team_id: string | null;
};

type SeasonTeamInfo = {
  id: string;
  teams: { id: string; name: string; primary_color: string | null };
};

type GroupInfo = {
  id: string;
  name: string;
  group_teams: { season_team_id: string }[];
};

const PHASE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  upper_playoff: "Liguilla Superior",
  lower_playoff: "Liguilla Inferior",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(d));
}

function ScoreCell({ match }: { match: MatchRow }) {
  if (match.status === "pending") {
    return <span className="text-[var(--color-dust)] text-xs">vs</span>;
  }
  const score = `${match.home_score ?? "?"} – ${match.away_score ?? "?"}`;
  const pen =
    match.home_penalties !== null
      ? ` (${match.home_penalties}-${match.away_penalties} pen)`
      : "";
  return (
    <span className="font-bold tabular-nums">
      {score}
      {pen && <span className="font-normal text-xs text-[var(--color-dust)]">{pen}</span>}
    </span>
  );
}

function TeamCell({
  name,
  color,
  align = "left",
}: {
  name: string;
  color: string | null;
  align?: "left" | "right";
}) {
  const inner = (
    <>
      {color && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
          style={{ background: color }}
        />
      )}
      <span className="text-sm font-medium text-[var(--color-pitch)] truncate">
        {name}
      </span>
    </>
  );
  return (
    <div
      className={`flex items-center gap-1.5 ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      {inner}
    </div>
  );
}

function MatchTable({
  matches,
  stMap,
}: {
  matches: MatchRow[];
  stMap: Map<string, SeasonTeamInfo>;
}) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">
        {matches.map((m) => {
          const home = m.home_team_id ? stMap.get(m.home_team_id) : null;
          const away = m.away_team_id ? stMap.get(m.away_team_id) : null;
          const matchForForms = {
            id: m.id,
            status: m.status,
            home_score: m.home_score,
            away_score: m.away_score,
            home_penalties: m.home_penalties,
            away_penalties: m.away_penalties,
            scheduled_date: m.scheduled_date,
            homeTeamName: home?.teams.name ?? "—",
            awayTeamName: away?.teams.name ?? "—",
          };

          return (
            <tr
              key={m.id}
              className="hover:bg-[var(--color-stone)]/40 transition-colors"
            >
              <td className="px-4 py-2.5 text-xs text-[var(--color-dust)] w-20 shrink-0">
                {formatDate(m.scheduled_date)}
              </td>
              <td className="px-2 py-2.5 w-[30%]">
                <TeamCell
                  name={home?.teams.name ?? "—"}
                  color={home?.teams.primary_color ?? null}
                  align="right"
                />
              </td>
              <td className="px-3 py-2.5 text-center w-20">
                <ScoreCell match={m} />
              </td>
              <td className="px-2 py-2.5 w-[30%]">
                <TeamCell
                  name={away?.teams.name ?? "—"}
                  color={away?.teams.primary_color ?? null}
                />
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <ResultForm match={matchForForms} />
                  <EditDateForm match={matchForForms} />
                  <DeleteMatchButton matchId={m.id} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function PartidosPage() {
  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!activeSeason) {
    return (
      <div className="p-6 max-w-5xl">
        <h1
          className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Partidos
        </h1>
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm">
          No hay temporada activa.
        </div>
      </div>
    );
  }

  const [{ data: rawMatches }, { data: rawSeasonTeams }, { data: rawGroups }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, phase, status, scheduled_date, home_score, away_score, home_penalties, away_penalties, group_id, round, home_team_id, away_team_id"
        )
        .eq("season_id", activeSeason.id)
        .order("round")
        .order("scheduled_date", { nullsFirst: false }),
      supabase
        .from("season_teams")
        .select("id, teams(id, name, primary_color)")
        .eq("season_id", activeSeason.id),
      supabase
        .from("groups")
        .select("id, name, group_teams(season_team_id)")
        .eq("season_id", activeSeason.id)
        .order("name"),
    ]);

  const matches = (rawMatches ?? []) as MatchRow[];
  const seasonTeams = (rawSeasonTeams ?? []) as unknown as SeasonTeamInfo[];
  const groups = (rawGroups ?? []) as unknown as GroupInfo[];

  const stMap = new Map(seasonTeams.map((st) => [st.id, st]));

  // Build group options for CreateMatchForm
  const groupOptions: GroupOption[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    seasonTeams: g.group_teams
      .map((gt) => {
        const st = stMap.get(gt.season_team_id);
        return st ? { id: st.id, teamName: st.teams.name } : null;
      })
      .filter(Boolean) as { id: string; teamName: string }[],
  }));

  const allSeasonTeamOptions: SeasonTeamOption[] = seasonTeams
    .map((st) => ({ id: st.id, teamName: st.teams.name }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  // Organize matches by phase then group
  const groupMatches = matches.filter((m) => m.phase === "group");
  const byGroup = new Map<string, MatchRow[]>();
  for (const m of groupMatches) {
    const key = m.group_id ?? "__none__";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(m);
  }

  const playoffPhases = ["upper_playoff", "lower_playoff"] as const;
  const byPhase = new Map<string, MatchRow[]>();
  for (const m of matches) {
    if (m.phase === "group") continue;
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase)!.push(m);
  }

  const total = matches.length;
  const played = matches.filter((m) => m.status === "played").length;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Partidos
          </h1>
          <p className="text-sm text-[var(--color-dust)] mt-0.5">
            {total} partido{total !== 1 ? "s" : ""} · {played} jugado
            {played !== 1 ? "s" : ""} · {activeSeason.name}
          </p>
        </div>
        <CreateMatchForm
          groups={groupOptions}
          allSeasonTeams={allSeasonTeamOptions}
        />
      </div>

      {total === 0 && (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">
            No hay partidos. Crea el primero.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Group stage */}
        {(groupMatches.length > 0 || byGroup.size > 0) && (
          <section>
            <h2
              className="text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Fase de Grupos
            </h2>
            <div className="flex flex-col gap-3">
              {groups.map((g) => {
                const gm = byGroup.get(g.id) ?? [];
                if (gm.length === 0) return null;
                return (
                  <div key={g.id} className="bg-white border border-border overflow-hidden">
                    <div className="px-4 py-2 border-b border-border bg-[var(--color-stone)]">
                      <span
                        className="text-xs font-bold uppercase tracking-wide text-[var(--color-pitch)]"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {g.name}
                      </span>
                    </div>
                    <MatchTable matches={gm} stMap={stMap} />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Playoff phases */}
        {playoffPhases.map((phase) => {
          const pm = byPhase.get(phase) ?? [];
          if (pm.length === 0) return null;
          return (
            <section key={phase}>
              <h2
                className="text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {PHASE_LABELS[phase]}
              </h2>
              <div className="bg-white border border-border overflow-hidden">
                <MatchTable matches={pm} stMap={stMap} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
