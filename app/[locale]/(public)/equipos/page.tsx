import { createClient } from "@/lib/supabase/server";

export default async function EquiposPage() {
  const supabase = await createClient();

  const { data: season } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">No hay temporada activa.</p>
      </div>
    );
  }

  const { data: rawST } = await supabase
    .from("season_teams")
    .select("id, teams(id, name, primary_color, secondary_color), player_registrations(id)")
    .eq("season_id", season.id);

  type STRow = {
    id: string;
    teams: { id: string; name: string; primary_color: string | null; secondary_color: string | null };
    player_registrations: { id: string }[];
  };

  const teams = ((rawST ?? []) as unknown as STRow[]).sort((a, b) =>
    a.teams.name.localeCompare(b.teams.name)
  );

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        Equipos
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-6">
        {teams.length} equipo{teams.length !== 1 ? "s" : ""} · {season.name}
      </p>

      {teams.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">No hay equipos inscritos.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {teams.map((st) => (
            <div
              key={st.id}
              className="bg-white border border-border p-4 flex flex-col items-center gap-3 text-center"
            >
              {/* Color badge */}
              <div className="flex gap-1.5">
                {st.teams.primary_color ? (
                  <span
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ background: st.teams.primary_color }}
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white" />
                )}
                {st.teams.secondary_color && (
                  <span
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm -ml-2"
                    style={{ background: st.teams.secondary_color }}
                  />
                )}
              </div>
              <p
                className="font-bold text-sm uppercase tracking-wide text-[var(--color-pitch)] leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {st.teams.name}
              </p>
              <p className="text-xs text-[var(--color-dust)]">
                {st.player_registrations.length} jugador{st.player_registrations.length !== 1 ? "es" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
