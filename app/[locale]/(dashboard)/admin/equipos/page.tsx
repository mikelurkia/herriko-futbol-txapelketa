import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { TeamForm } from "./TeamForm";
import { enrollTeamAction, unenrollTeamAction } from "./actions";

export default async function EquiposPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: activeSeason }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle(),
  ]);

  const { data: enrollments } = activeSeason
    ? await supabase
        .from("season_teams")
        .select("id, team_id, manager_id")
        .eq("season_id", activeSeason.id)
    : { data: null };

  const enrolledMap = new Map((enrollments ?? []).map((e) => [e.team_id, e]));

  type Team = {
    id: string;
    name: string;
    shield_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    founded_year: number | null;
    created_at: string;
  };

  const typedTeams = (teams ?? []) as unknown as Team[];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Equipos
          </h1>
          <p className="text-sm text-[var(--color-dust)] mt-0.5">
            {typedTeams.length} equipo{typedTeams.length !== 1 ? "s" : ""}
            {activeSeason
              ? ` · Temporada activa: ${activeSeason.name}`
              : " · Sin temporada activa"}
          </p>
        </div>
        <TeamForm />
      </div>

      {!activeSeason && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm">
          No hay temporada activa. Activa una temporada para gestionar inscripciones.
        </div>
      )}

      {typedTeams.length === 0 ? (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">
            No hay equipos todavía. Crea el primero.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--color-stone)]">
                <th className="w-12 px-3 py-3" />
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                  Equipo
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium hidden sm:table-cell">
                  Colores
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium hidden md:table-cell">
                  Fundación
                </th>
                {activeSeason && (
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                    Inscripción
                  </th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {typedTeams.map((team) => {
                const enrollment = enrolledMap.get(team.id);
                return (
                  <tr
                    key={team.id}
                    className="hover:bg-[var(--color-stone)]/50 transition-colors"
                  >
                    {/* Shield thumbnail */}
                    <td className="px-3 py-2.5">
                      <div className="w-8 h-8 relative flex items-center justify-center bg-[var(--color-stone)] border border-border rounded-sm overflow-hidden">
                        {team.shield_url ? (
                          <Image
                            src={team.shield_url}
                            alt={team.name}
                            fill
                            className="object-contain p-0.5"
                            unoptimized
                          />
                        ) : (
                          <div className="flex gap-0.5">
                            {team.primary_color && (
                              <span
                                className="w-2 h-4 rounded-sm"
                                style={{ background: team.primary_color }}
                              />
                            )}
                            {team.secondary_color && (
                              <span
                                className="w-2 h-4 rounded-sm"
                                style={{ background: team.secondary_color }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2.5 font-medium text-[var(--color-pitch)]">
                      {team.name}
                    </td>

                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        {team.primary_color && (
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ background: team.primary_color }}
                          />
                        )}
                        {team.secondary_color && (
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ background: team.secondary_color }}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-[var(--color-dust)] hidden md:table-cell">
                      {team.founded_year ?? "—"}
                    </td>

                    {activeSeason && (
                      <td className="px-4 py-2.5">
                        {enrollment ? (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-sm bg-green-100 text-green-700">
                              Inscrito
                            </span>
                            <form action={unenrollTeamAction}>
                              <input type="hidden" name="season_team_id" value={enrollment.id} />
                              <button
                                type="submit"
                                className="text-xs text-[var(--color-dust)] hover:text-destructive transition-colors"
                              >
                                Quitar
                              </button>
                            </form>
                          </div>
                        ) : (
                          <form action={enrollTeamAction}>
                            <input type="hidden" name="team_id" value={team.id} />
                            <input type="hidden" name="season_id" value={activeSeason.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Inscribir
                            </Button>
                          </form>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-2.5 text-right">
                      <TeamForm team={team} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
