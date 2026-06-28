import { createClient } from "@/lib/supabase/server";

type MatchRow = {
  id: string;
  phase: "group" | "upper_playoff" | "lower_playoff";
  status: "pending" | "played";
  round: number;
  scheduled_date: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type STInfo = { id: string; teams: { name: string; primary_color: string | null } };
type GroupInfo = { id: string; name: string };

const PHASE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  upper_playoff: "Liguilla Superior",
  lower_playoff: "Liguilla Inferior",
};

function fmt(d: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
}

function MatchRow({ m, stMap }: { m: MatchRow; stMap: Map<string, STInfo> }) {
  const home = m.home_team_id ? stMap.get(m.home_team_id) : null;
  const away = m.away_team_id ? stMap.get(m.away_team_id) : null;
  const played = m.status === "played";

  return (
    <div className={`flex items-center gap-2 px-4 py-3 text-sm border-b border-border last:border-0 ${played ? "" : "opacity-80"}`}>
      <span className="w-20 shrink-0 text-xs text-[var(--color-dust)] capitalize">
        {fmt(m.scheduled_date) ?? "—"}
      </span>
      <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
        {home?.teams.primary_color && (
          <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ background: home.teams.primary_color }} />
        )}
        <span className={`truncate text-right ${played ? "font-medium text-[var(--color-pitch)]" : "text-[var(--color-dust)]"}`}>
          {home?.teams.name ?? "—"}
        </span>
      </div>
      <div className="w-20 shrink-0 text-center">
        {played ? (
          <span className="font-bold tabular-nums text-[var(--color-pitch)]">
            {m.home_score} – {m.away_score}
            {m.home_penalties !== null && (
              <span className="block text-[10px] font-normal text-[var(--color-dust)]">
                ({m.home_penalties}-{m.away_penalties} pen)
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-dust)]">vs</span>
        )}
      </div>
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        {away?.teams.primary_color && (
          <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ background: away.teams.primary_color }} />
        )}
        <span className={`truncate ${played ? "font-medium text-[var(--color-pitch)]" : "text-[var(--color-dust)]"}`}>
          {away?.teams.name ?? "—"}
        </span>
      </div>
    </div>
  );
}

export default async function PartidosPage() {
  const supabase = await createClient();

  const { data: season } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">No hay temporada activa.</p>
      </div>
    );
  }

  const [{ data: rawMatches }, { data: rawST }, { data: rawGroups }] = await Promise.all([
    supabase.from("matches").select("id, phase, status, round, scheduled_date, home_score, away_score, home_penalties, away_penalties, group_id, home_team_id, away_team_id").eq("season_id", season.id).order("round").order("scheduled_date", { nullsFirst: false }),
    supabase.from("season_teams").select("id, teams(name, primary_color)").eq("season_id", season.id),
    supabase.from("groups").select("id, name").eq("season_id", season.id).order("name"),
  ]);

  const matches = (rawMatches ?? []) as MatchRow[];
  const stMap = new Map(((rawST ?? []) as unknown as STInfo[]).map((st) => [st.id, st]));
  const groups = (rawGroups ?? []) as GroupInfo[];
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const groupMatches = matches.filter((m) => m.phase === "group");
  const byGroup = new Map<string, MatchRow[]>();
  for (const m of groupMatches) {
    const key = m.group_id ?? "__none__";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(m);
  }

  const playoffMatches = matches.filter((m) => m.phase !== "group");
  const byPhase = new Map<string, MatchRow[]>();
  for (const m of playoffMatches) {
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase)!.push(m);
  }

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        Partidos
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-6">{season.name}</p>

      {matches.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">Aún no hay partidos programados.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Group stage */}
          {groupMatches.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Fase de Grupos
              </h2>
              <div className="flex flex-col gap-3">
                {groups.map((g) => {
                  const gm = byGroup.get(g.id) ?? [];
                  if (gm.length === 0) return null;
                  // Group by round
                  const byRound = new Map<number, MatchRow[]>();
                  for (const m of gm) {
                    if (!byRound.has(m.round)) byRound.set(m.round, []);
                    byRound.get(m.round)!.push(m);
                  }
                  return (
                    <div key={g.id} className="bg-white border border-border overflow-hidden">
                      <div className="px-4 py-2 border-b border-border bg-[var(--color-stone)]">
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-pitch)]" style={{ fontFamily: "var(--font-display)" }}>
                          {g.name}
                        </span>
                      </div>
                      {[...byRound.entries()].sort(([a], [b]) => a - b).map(([round, ms]) => (
                        <div key={round}>
                          <div className="px-4 py-1.5 bg-[var(--color-stone)]/50 border-b border-border">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] font-medium">Jornada {round}</span>
                          </div>
                          {ms.map((m) => <MatchRow key={m.id} m={m} stMap={stMap} />)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Playoffs */}
          {(["upper_playoff", "lower_playoff"] as const).map((phase) => {
            const pm = byPhase.get(phase) ?? [];
            if (pm.length === 0) return null;
            const byRound = new Map<number, MatchRow[]>();
            for (const m of pm) {
              if (!byRound.has(m.round)) byRound.set(m.round, []);
              byRound.get(m.round)!.push(m);
            }
            return (
              <section key={phase}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  {PHASE_LABELS[phase]}
                </h2>
                <div className="bg-white border border-border overflow-hidden">
                  {[...byRound.entries()].sort(([a], [b]) => a - b).map(([round, ms]) => (
                    <div key={round}>
                      <div className="px-4 py-1.5 bg-[var(--color-stone)]/50 border-b border-border">
                        <span className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] font-medium">Ronda {round}</span>
                      </div>
                      {ms.map((m) => <MatchRow key={m.id} m={m} stMap={stMap} />)}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
