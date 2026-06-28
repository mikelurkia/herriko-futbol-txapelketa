import { createClient } from "@/lib/supabase/server";
import { SanctionForm, type PlayerOption, type MatchOption } from "./SanctionForm";
import { serveMatchAction, toggleSanctionAction, deleteSanctionAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";

type SanctionRow = {
  id: string;
  player_id: string;
  reason: "yellow_accumulation" | "red_card" | "additional";
  matches_suspended: number;
  matches_served: number;
  is_active: boolean;
  triggering_match_id: string;
  created_at: string;
};

type PlayerRegRow = {
  player_id: string;
  season_team_id: string;
  players: { id: string; first_name: string; last_name: string };
  season_teams: { id: string; teams: { name: string } };
};

type MatchRow = {
  id: string;
  phase: string;
  round: number;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
  group_id: string | null;
  groups: { name: string } | null;
};

type SeasonTeamRow = {
  id: string;
  teams: { name: string };
};

const REASON_CONFIG = {
  yellow_accumulation: {
    label: "Acum. amarillas",
    class: "bg-amber-100 text-amber-700",
  },
  red_card: { label: "Tarjeta roja", class: "bg-red-100 text-red-700" },
  additional: { label: "Adicional", class: "bg-purple-100 text-purple-700" },
} as const;

const PHASE_SHORT: Record<string, string> = {
  group: "Grupos",
  upper_playoff: "Lig. Sup.",
  lower_playoff: "Lig. Inf.",
};

export default async function SancionesPage() {
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
          Sanciones
        </h1>
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm">
          No hay temporada activa.
        </div>
      </div>
    );
  }

  const [
    { data: rawSanctions },
    { data: rawPlayerRegs },
    { data: rawMatches },
    { data: rawSeasonTeams },
  ] = await Promise.all([
    supabase
      .from("sanctions")
      .select(
        "id, player_id, reason, matches_suspended, matches_served, is_active, triggering_match_id, created_at"
      )
      .eq("season_id", activeSeason.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("player_registrations")
      .select("player_id, season_team_id, players(id, first_name, last_name), season_teams(id, teams(name))")
      .eq("season_teams.season_id", activeSeason.id),
    supabase
      .from("matches")
      .select("id, phase, round, status, home_team_id, away_team_id, group_id, groups(name)")
      .eq("season_id", activeSeason.id)
      .eq("status", "played")
      .order("round"),
    supabase
      .from("season_teams")
      .select("id, teams(name)")
      .eq("season_id", activeSeason.id),
  ]);

  const sanctions = (rawSanctions ?? []) as SanctionRow[];
  const playerRegs = (rawPlayerRegs ?? []) as unknown as PlayerRegRow[];
  const matches = (rawMatches ?? []) as unknown as MatchRow[];
  const seasonTeams = (rawSeasonTeams ?? []) as unknown as SeasonTeamRow[];

  // Build lookups
  const stMap = new Map(seasonTeams.map((st) => [st.id, st]));

  // Player lookup by player_id → {name, teamName}
  const playerMap = new Map<
    string,
    { fullName: string; teamName: string; seasonTeamId: string }
  >();
  for (const reg of playerRegs) {
    if (!reg.players || !reg.season_teams) continue;
    playerMap.set(reg.player_id, {
      fullName: `${reg.players.last_name}, ${reg.players.first_name}`,
      teamName: reg.season_teams.teams.name,
      seasonTeamId: reg.season_team_id,
    });
  }

  // Options for the create form
  const playerOptions: PlayerOption[] = Array.from(playerMap.entries())
    .map(([playerId, info]) => ({
      playerId,
      label: `${info.fullName} — ${info.teamName}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const matchOptions: MatchOption[] = matches.map((m) => {
    const home = m.home_team_id ? stMap.get(m.home_team_id)?.teams.name ?? "—" : "—";
    const away = m.away_team_id ? stMap.get(m.away_team_id)?.teams.name ?? "—" : "—";
    const phase = PHASE_SHORT[m.phase] ?? m.phase;
    const group = m.groups ? ` ${m.groups.name}` : "";
    return {
      id: m.id,
      label: `${phase}${group} J${m.round} — ${home} vs ${away}`,
    };
  });

  const active = sanctions.filter((s) => s.is_active);
  const completed = sanctions.filter((s) => !s.is_active);

  function SanctionTable({ rows }: { rows: SanctionRow[] }) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-[var(--color-stone)]">
            <th className="text-left px-4 py-2.5 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
              Jugador
            </th>
            <th className="text-left px-4 py-2.5 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium hidden sm:table-cell">
              Motivo
            </th>
            <th className="text-left px-4 py-2.5 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
              Progreso
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((s) => {
            const player = playerMap.get(s.player_id);
            const remaining = s.matches_suspended - s.matches_served;
            const reasonCfg = REASON_CONFIG[s.reason];

            return (
              <tr
                key={s.id}
                className={`hover:bg-[var(--color-stone)]/40 transition-colors ${
                  !s.is_active ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--color-pitch)]">
                    {player?.fullName ?? s.player_id}
                  </p>
                  <p className="text-xs text-[var(--color-dust)]">
                    {player?.teamName}
                  </p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm ${reasonCfg.class}`}
                  >
                    {reasonCfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-gol)] rounded-full"
                        style={{
                          width: `${(s.matches_served / s.matches_suspended) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-dust)] tabular-nums">
                      {s.matches_served}/{s.matches_suspended}
                    </span>
                    {s.is_active && remaining > 0 && (
                      <span className="text-xs font-medium text-[var(--color-gol)]">
                        {remaining} rest.
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {s.is_active && (
                      <form action={serveMatchAction}>
                        <input type="hidden" name="sanction_id" value={s.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Partido cumplido
                        </Button>
                      </form>
                    )}
                    <form action={toggleSanctionAction}>
                      <input type="hidden" name="sanction_id" value={s.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={(!s.is_active).toString()}
                      />
                      <button
                        type="submit"
                        className="text-xs text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors"
                      >
                        {s.is_active ? "Archivar" : "Reactivar"}
                      </button>
                    </form>
                    <form action={deleteSanctionAction}>
                      <input type="hidden" name="sanction_id" value={s.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--color-dust)] hover:text-destructive"
                      >
                        <Trash2Icon />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sanciones
          </h1>
          <p className="text-sm text-[var(--color-dust)] mt-0.5">
            {active.length} activa{active.length !== 1 ? "s" : ""} ·{" "}
            {completed.length} cumplida{completed.length !== 1 ? "s" : ""} ·{" "}
            {activeSeason.name}
          </p>
        </div>
        <SanctionForm players={playerOptions} matches={matchOptions} />
      </div>

      {sanctions.length === 0 ? (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">No hay sanciones.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section>
              <h2
                className="text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Activas
              </h2>
              <div className="bg-white border border-border overflow-hidden">
                <SanctionTable rows={active} />
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2
                className="text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Cumplidas
              </h2>
              <div className="bg-white border border-border overflow-hidden">
                <SanctionTable rows={completed} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
