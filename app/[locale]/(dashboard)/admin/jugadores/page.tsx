import { createClient } from "@/lib/supabase/server";
import { AddPlayerForm, EditPlayerForm } from "./PlayerForm";
import { setPlayerActiveAction } from "./actions";

type PlayerReg = {
  id: string;
  jersey_number: number | null;
  is_active: boolean;
  players: { id: string; first_name: string; last_name: string };
};

type SeasonTeamRow = {
  id: string;
  teams: { id: string; name: string; primary_color: string | null; secondary_color: string | null };
  player_registrations: PlayerReg[];
};

export default async function JugadoresPage() {
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
          Jugadores
        </h1>
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm">
          No hay temporada activa. Activa una temporada para gestionar plantillas.
        </div>
      </div>
    );
  }

  const [{ data: raw }, { data: allPlayers }] = await Promise.all([
    supabase
      .from("season_teams")
      .select(
        `id, teams(id, name, primary_color, secondary_color),
         player_registrations(id, jersey_number, is_active, players(id, first_name, last_name))`
      )
      .eq("season_id", activeSeason.id),
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .order("last_name"),
  ]);

  const seasonTeams = ((raw ?? []) as unknown as SeasonTeamRow[]).sort((a, b) =>
    a.teams.name.localeCompare(b.teams.name)
  );

  const totalPlayers = seasonTeams.reduce(
    (sum, st) => sum + st.player_registrations.length,
    0
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Jugadores
        </h1>
        <p className="text-sm text-[var(--color-dust)] mt-0.5">
          {totalPlayers} jugador{totalPlayers !== 1 ? "es" : ""} en{" "}
          {seasonTeams.length} equipo{seasonTeams.length !== 1 ? "s" : ""} ·{" "}
          {activeSeason.name}
        </p>
      </div>

      {seasonTeams.length === 0 && (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">
            No hay equipos inscritos en esta temporada.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {seasonTeams.map((st) => {
          const registeredIds = new Set(st.player_registrations.map((r) => r.players.id));
          const availablePlayers = (allPlayers ?? []).filter(
            (p) => !registeredIds.has(p.id)
          );

          const players = [...st.player_registrations].sort((a, b) => {
            if (a.jersey_number !== null && b.jersey_number !== null)
              return a.jersey_number - b.jersey_number;
            if (a.jersey_number !== null) return -1;
            if (b.jersey_number !== null) return 1;
            return a.players.last_name.localeCompare(b.players.last_name);
          });

          return (
            <div key={st.id} className="bg-white border border-border overflow-hidden">
              {/* Team header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[var(--color-stone)]">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1">
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
                  <span
                    className="font-bold text-sm uppercase tracking-wide text-[var(--color-pitch)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {st.teams.name}
                  </span>
                  <span className="text-xs text-[var(--color-dust)]">
                    {players.length} jugador{players.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <AddPlayerForm
                  seasonTeamId={st.id}
                  availablePlayers={availablePlayers}
                />
              </div>

              {players.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--color-dust)]">
                  Sin jugadores. Añade el primero.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium w-12">
                        #
                      </th>
                      <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                        Jugador
                      </th>
                      <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium hidden sm:table-cell">
                        Estado
                      </th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {players.map((reg) => (
                      <tr
                        key={reg.id}
                        className={`hover:bg-[var(--color-stone)]/50 transition-colors ${
                          !reg.is_active ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 text-[var(--color-dust)] font-mono text-xs">
                          {reg.jersey_number ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-[var(--color-pitch)]">
                          {reg.players.last_name}, {reg.players.first_name}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          {reg.is_active ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-sm bg-green-100 text-green-700">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-sm bg-gray-100 text-gray-500">
                              Baja
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <EditPlayerForm
                              registration={reg}
                              seasonTeamId={st.id}
                            />
                            <form action={setPlayerActiveAction}>
                              <input
                                type="hidden"
                                name="registration_id"
                                value={reg.id}
                              />
                              <input
                                type="hidden"
                                name="is_active"
                                value={(!reg.is_active).toString()}
                              />
                              <button
                                type="submit"
                                className="text-xs text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors"
                              >
                                {reg.is_active ? "Dar de baja" : "Rehabilitar"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
