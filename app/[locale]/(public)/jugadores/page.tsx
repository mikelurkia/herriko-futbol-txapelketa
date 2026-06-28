import { createClient } from "@/lib/supabase/server";

type PlayerReg = {
  id: string;
  jersey_number: number | null;
  is_active: boolean;
  players: { first_name: string; last_name: string };
};

type STRow = {
  id: string;
  teams: { name: string; primary_color: string | null; secondary_color: string | null };
  player_registrations: PlayerReg[];
};

export default async function JugadoresPage() {
  const supabase = await createClient();

  const { data: season } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">No hay temporada activa.</p>
      </div>
    );
  }

  const { data: raw } = await supabase
    .from("season_teams")
    .select("id, teams(name, primary_color, secondary_color), player_registrations(id, jersey_number, is_active, players(first_name, last_name))")
    .eq("season_id", season.id);

  const seasonTeams = ((raw ?? []) as unknown as STRow[])
    .sort((a, b) => a.teams.name.localeCompare(b.teams.name));

  const total = seasonTeams.reduce((s, st) => s + st.player_registrations.filter((r) => r.is_active).length, 0);

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        Jugadores
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-6">
        {total} jugador{total !== 1 ? "es" : ""} inscritos · {season.name}
      </p>

      {seasonTeams.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">No hay jugadores inscritos.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {seasonTeams.map((st) => {
            const active = [...st.player_registrations]
              .filter((r) => r.is_active)
              .sort((a, b) => {
                if (a.jersey_number !== null && b.jersey_number !== null) return a.jersey_number - b.jersey_number;
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
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: st.teams.primary_color }} />
                    )}
                    {st.teams.secondary_color && (
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: st.teams.secondary_color }} />
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
