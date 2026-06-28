import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";

type PlayerReg = {
  id: string;
  jersey_number: number | null;
  is_active: boolean;
  season_team_id: string;
  player_id: string;
  players: { first_name: string; last_name: string };
};

type STRow = {
  id: string;
  teams: { name: string; primary_color: string | null; secondary_color: string | null };
  player_registrations: PlayerReg[];
};

type GoalEvent = {
  player_id: string;
  season_team_id: string;
};

export default async function JugadoresPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">
          {locale === "eu" ? "Ez dago denboraldi aktiborik." : "No hay temporada activa."}
        </p>
      </div>
    );
  }

  const [{ data: raw }, { data: rawMatchIds }] = await Promise.all([
    supabase
      .from("season_teams")
      .select(
        "id, teams(name, primary_color, secondary_color), player_registrations(id, jersey_number, is_active, season_team_id, player_id, players(first_name, last_name))"
      )
      .eq("season_id", season.id),
    supabase.from("matches").select("id").eq("season_id", season.id),
  ]);

  const seasonTeams = ((raw ?? []) as unknown as STRow[]).sort((a, b) =>
    a.teams.name.localeCompare(b.teams.name)
  );

  const matchIds = (rawMatchIds ?? []).map((m) => m.id);

  let goalEvents: GoalEvent[] = [];
  if (matchIds.length > 0) {
    const { data: rawGoals } = await supabase
      .from("match_events")
      .select("player_id, season_team_id")
      .eq("type", "goal")
      .in("match_id", matchIds);
    goalEvents = (rawGoals ?? []) as GoalEvent[];
  }

  // Count goals per player
  const goalMap = new Map<string, number>();
  for (const ev of goalEvents) {
    goalMap.set(ev.player_id, (goalMap.get(ev.player_id) ?? 0) + 1);
  }

  // Build top scorers list
  type Scorer = {
    playerId: string;
    name: string;
    teamName: string;
    goals: number;
  };

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

  const total = seasonTeams.reduce(
    (s, st) => s + st.player_registrations.filter((r) => r.is_active).length,
    0
  );

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        {locale === "eu" ? "Jokalariak" : "Jugadores"}
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-8">
        {locale === "eu"
          ? `${total} jokalari izena emanda · ${season.name}`
          : `${total} jugador${total !== 1 ? "es" : ""} inscritos · ${season.name}`}
      </p>

      {/* Top scorers */}
      {scorers.length > 0 && (
        <section className="mb-10">
          <h2
            className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "eu" ? "Goleatzaileak" : "Goleadores"}
          </h2>
          <div className="bg-white border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {scorers.map((s, i) => (
                  <tr key={s.playerId} className="hover:bg-[var(--color-stone)]/40">
                    <td className="px-4 py-2.5 text-xs text-[var(--color-dust)] w-8 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-[var(--color-pitch)]">
                      {s.name}
                    </td>
                    <td className="px-2 py-2.5 text-[var(--color-dust)] hidden sm:table-cell">
                      {s.teamName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[var(--color-gol)] tabular-nums">
                      {s.goals} ⚽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Team rosters */}
      {seasonTeams.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago jokalaririk izena emanda." : "No hay jugadores inscritos."}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {seasonTeams.map((st) => {
            const active = [...st.player_registrations]
              .filter((r) => r.is_active)
              .sort((a, b) => {
                if (a.jersey_number !== null && b.jersey_number !== null)
                  return a.jersey_number - b.jersey_number;
                if (a.jersey_number !== null) return -1;
                if (b.jersey_number !== null) return 1;
                return a.players.last_name.localeCompare(b.players.last_name);
              });

            if (active.length === 0) return null;

            return (
              <section key={st.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {st.teams.primary_color && (
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: st.teams.primary_color }}
                      />
                    )}
                    {st.teams.secondary_color && (
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: st.teams.secondary_color }}
                      />
                    )}
                  </div>
                  <h2
                    className="text-xs font-bold uppercase tracking-widest text-[var(--color-pitch)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {st.teams.name}
                  </h2>
                  <span className="text-xs text-[var(--color-dust)]">{active.length}</span>
                </div>
                <div className="bg-white border border-border overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 divide-x divide-y divide-border">
                    {active.map((reg) => (
                      <div key={reg.id} className="flex items-center gap-2.5 px-3 py-2.5">
                        <span className="text-xs font-mono text-[var(--color-dust)] w-5 shrink-0 text-right">
                          {reg.jersey_number ?? "—"}
                        </span>
                        <span className="text-sm text-[var(--color-pitch)] truncate">
                          {reg.players.last_name}, {reg.players.first_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
