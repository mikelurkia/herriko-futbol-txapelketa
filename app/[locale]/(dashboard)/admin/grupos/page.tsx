import { createClient } from "@/lib/supabase/server";
import { GroupForm } from "./GroupForm";
import { GenerateCalendarButton } from "./GenerateCalendarButton";
import {
  addTeamToGroupAction,
  removeTeamFromGroupAction,
  deleteGroupAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";

type GroupTeamRow = {
  id: string;
  season_team_id: string;
  season_teams: {
    id: string;
    teams: { id: string; name: string; primary_color: string | null; secondary_color: string | null };
  };
};

type GroupRow = {
  id: string;
  name: string;
  group_teams: GroupTeamRow[];
};

type SeasonTeamRow = {
  id: string;
  teams: { id: string; name: string; primary_color: string | null; secondary_color: string | null };
};

export default async function GruposPage() {
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
          Grupos
        </h1>
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm">
          No hay temporada activa. Activa una temporada para gestionar grupos.
        </div>
      </div>
    );
  }

  const [{ data: rawGroups }, { data: rawSeasonTeams }] = await Promise.all([
    supabase
      .from("groups")
      .select(
        `id, name,
         group_teams(id, season_team_id,
           season_teams(id, teams(id, name, primary_color, secondary_color))
         )`
      )
      .eq("season_id", activeSeason.id)
      .order("name"),
    supabase
      .from("season_teams")
      .select("id, teams(id, name, primary_color, secondary_color)")
      .eq("season_id", activeSeason.id),
  ]);

  const groups = (rawGroups ?? []) as unknown as GroupRow[];
  const allSeasonTeams = (rawSeasonTeams ?? []) as unknown as SeasonTeamRow[];

  // Teams already assigned to any group
  const assignedIds = new Set(
    groups.flatMap((g) => g.group_teams.map((gt) => gt.season_team_id))
  );
  const unassigned = allSeasonTeams
    .filter((st) => !assignedIds.has(st.id))
    .sort((a, b) => a.teams.name.localeCompare(b.teams.name));

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Grupos
          </h1>
          <p className="text-sm text-[var(--color-dust)] mt-0.5">
            {groups.length} grupo{groups.length !== 1 ? "s" : ""} · {activeSeason.name}
            {unassigned.length > 0 && (
              <span className="text-amber-600">
                {" "}· {unassigned.length} equipo{unassigned.length !== 1 ? "s" : ""} sin asignar
              </span>
            )}
          </p>
        </div>
        <GroupForm />
      </div>

      {groups.length === 0 ? (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">
            No hay grupos. Crea el primero.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const isEmpty = group.group_teams.length === 0;
            const teamsSorted = [...group.group_teams].sort((a, b) =>
              a.season_teams.teams.name.localeCompare(b.season_teams.teams.name)
            );

            return (
              <div
                key={group.id}
                className="bg-white border border-border overflow-hidden flex flex-col"
              >
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[var(--color-stone)]">
                  <span
                    className="font-bold text-sm uppercase tracking-wide text-[var(--color-pitch)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {group.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <GroupForm group={{ id: group.id, name: group.name }} />
                    {isEmpty && (
                      <form action={deleteGroupAction}>
                        <input type="hidden" name="group_id" value={group.id} />
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
                    )}
                  </div>
                </div>

                {/* Teams list */}
                <div className="flex-1 divide-y divide-border">
                  {teamsSorted.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-[var(--color-dust)] text-center">
                      Sin equipos
                    </p>
                  ) : (
                    teamsSorted.map((gt) => (
                      <div
                        key={gt.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {gt.season_teams.teams.primary_color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10"
                                style={{ background: gt.season_teams.teams.primary_color }}
                              />
                            )}
                            {gt.season_teams.teams.secondary_color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10"
                                style={{ background: gt.season_teams.teams.secondary_color }}
                              />
                            )}
                          </div>
                          <span className="text-sm font-medium text-[var(--color-pitch)]">
                            {gt.season_teams.teams.name}
                          </span>
                        </div>
                        <form action={removeTeamFromGroupAction}>
                          <input type="hidden" name="group_team_id" value={gt.id} />
                          <button
                            type="submit"
                            className="text-xs text-[var(--color-dust)] hover:text-destructive transition-colors"
                          >
                            Quitar
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>

                {/* Generate calendar */}
                {group.group_teams.length >= 2 && (
                  <GenerateCalendarButton groupId={group.id} />
                )}

                {/* Add team to group */}
                {unassigned.length > 0 && (
                  <form
                    action={addTeamToGroupAction}
                    className="flex gap-2 p-3 border-t border-border bg-[var(--color-stone)]/50"
                  >
                    <input type="hidden" name="group_id" value={group.id} />
                    <select
                      name="season_team_id"
                      required
                      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Añadir equipo…</option>
                      {unassigned.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.teams.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Añadir
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
