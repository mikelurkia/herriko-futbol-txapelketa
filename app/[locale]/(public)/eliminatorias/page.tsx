import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";

type MatchRow = {
  id: string;
  phase: "upper_playoff" | "lower_playoff";
  round: number;
  status: "pending" | "played";
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type STRow = {
  id: string;
  teams: { name: string; primary_color: string | null };
};

const PHASE_LABELS: Record<string, { es: string; eu: string }> = {
  upper_playoff: { es: "Liguilla Superior", eu: "Liguilla Nagusia" },
  lower_playoff: { es: "Liguilla Inferior", eu: "Liguilla Txikia" },
};

function getRoundLabel(round: number, maxRound: number, locale: string): string {
  const fromEnd = maxRound - round;
  if (locale === "eu") {
    if (fromEnd === 0) return "Finala";
    if (fromEnd === 1) return "Finalerdiak";
    if (fromEnd === 2) return "Laurdenfinalak";
    return `Txanda ${round}`;
  }
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinales";
  if (fromEnd === 2) return "Cuartos";
  return `Ronda ${round}`;
}

function MatchCard({
  match,
  homeTeam,
  awayTeam,
}: {
  match: MatchRow;
  homeTeam: STRow | null;
  awayTeam: STRow | null;
}) {
  const played = match.status === "played";
  const homeWon =
    played &&
    match.home_score !== null &&
    match.away_score !== null &&
    (match.home_score > match.away_score ||
      (match.home_score === match.away_score &&
        match.home_penalties !== null &&
        match.away_penalties !== null &&
        match.home_penalties > match.away_penalties));

  const awayWon =
    played &&
    match.home_score !== null &&
    match.away_score !== null &&
    (match.away_score > match.home_score ||
      (match.home_score === match.away_score &&
        match.home_penalties !== null &&
        match.away_penalties !== null &&
        match.away_penalties > match.home_penalties));

  const TeamRow = ({
    team,
    score,
    penScore,
    won,
    lost,
  }: {
    team: STRow | null;
    score: number | null;
    penScore: number | null;
    won: boolean;
    lost: boolean;
  }) => (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${
        lost ? "opacity-40" : ""
      }`}
    >
      {team?.teams.primary_color && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
          style={{ background: team.teams.primary_color }}
        />
      )}
      <span
        className={`flex-1 text-sm truncate ${
          won ? "font-bold text-[var(--color-pitch)]" : "text-[var(--color-pitch)]"
        }`}
      >
        {team?.teams.name ?? "—"}
      </span>
      {played && (
        <span className="text-sm font-bold tabular-nums text-[var(--color-pitch)] ml-2">
          {score ?? "?"}
          {penScore !== null && (
            <span className="text-xs font-normal text-[var(--color-dust)]">
              {" "}({penScore})
            </span>
          )}
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-border overflow-hidden min-w-[160px]">
      <TeamRow
        team={homeTeam}
        score={match.home_score}
        penScore={match.home_penalties}
        won={homeWon}
        lost={awayWon}
      />
      <div className="border-t border-border" />
      <TeamRow
        team={awayTeam}
        score={match.away_score}
        penScore={match.away_penalties}
        won={awayWon}
        lost={homeWon}
      />
    </div>
  );
}

export default async function EliminatoriasPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">No hay temporada activa.</p>
      </div>
    );
  }

  const [{ data: rawMatches }, { data: rawTeams }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, phase, round, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id"
      )
      .eq("season_id", season.id)
      .in("phase", ["upper_playoff", "lower_playoff"])
      .order("phase")
      .order("round"),
    supabase
      .from("season_teams")
      .select("id, teams(name, primary_color)")
      .eq("season_id", season.id),
  ]);

  const matches = (rawMatches ?? []) as MatchRow[];
  const stMap = new Map(((rawTeams ?? []) as unknown as STRow[]).map((st) => [st.id, st]));

  const phases = ["upper_playoff", "lower_playoff"] as const;
  const byPhase = new Map<string, Map<number, MatchRow[]>>();

  for (const m of matches) {
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, new Map());
    const byRound = byPhase.get(m.phase)!;
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }

  const heading = locale === "eu" ? "Kanporaketak" : "Eliminatorias";

  if (matches.length === 0) {
    return (
      <div>
        <h1
          className="text-3xl font-bold uppercase tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
        >
          {heading}
        </h1>
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Kanporaketak oraindik ez dira hasi." : "Las eliminatorias aún no han comenzado."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        {heading}
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-8">{season.name}</p>

      <div className="flex flex-col gap-10">
        {phases.map((phase) => {
          const byRound = byPhase.get(phase);
          if (!byRound || byRound.size === 0) return null;

          const rounds = [...byRound.keys()].sort((a, b) => a - b);
          const maxRound = Math.max(...rounds);
          const phaseLabel =
            PHASE_LABELS[phase][locale as "es" | "eu"] ?? PHASE_LABELS[phase].es;

          return (
            <section key={phase}>
              <h2
                className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {phaseLabel}
              </h2>

              <div className="overflow-x-auto">
                <div className="flex gap-6 pb-4" style={{ minWidth: "max-content" }}>
                  {rounds.map((round) => {
                    const roundMatches = byRound.get(round) ?? [];
                    const label = getRoundLabel(round, maxRound, locale);

                    return (
                      <div key={round} className="flex flex-col gap-3" style={{ width: 200 }}>
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dust)] text-center"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {label}
                        </span>
                        <div
                          className="flex flex-col justify-around gap-3 flex-1"
                          style={{
                            minHeight: Math.max(...rounds.map((r) => (byRound.get(r)?.length ?? 0))) > 1
                              ? "auto"
                              : undefined,
                          }}
                        >
                          {roundMatches.map((m) => (
                            <MatchCard
                              key={m.id}
                              match={m}
                              homeTeam={m.home_team_id ? stMap.get(m.home_team_id) ?? null : null}
                              awayTeam={m.away_team_id ? stMap.get(m.away_team_id) ?? null : null}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
