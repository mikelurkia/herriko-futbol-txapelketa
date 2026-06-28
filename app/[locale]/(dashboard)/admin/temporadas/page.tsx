import { createClient } from "@/lib/supabase/server";
import { SeasonForm } from "./SeasonForm";
import { setActiveSeasonAction } from "./actions";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; className: string }> = {
  setup: { label: "Configuración", className: "bg-gray-100 text-gray-600" },
  group_stage: { label: "Fase de grupos", className: "bg-blue-100 text-blue-700" },
  playoffs: { label: "Eliminatorias", className: "bg-amber-100 text-amber-700" },
  finished: { label: "Finalizada", className: "bg-green-100 text-green-700" },
};

export default async function TemporadasPage() {
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Temporadas
          </h1>
          <p className="text-sm text-[var(--color-dust)] mt-0.5">
            {seasons?.length ?? 0} temporada{seasons?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <SeasonForm />
      </div>

      {!seasons?.length ? (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">
            No hay temporadas todavía. Crea la primera.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--color-stone)]">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                  Fechas
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {seasons.map((season) => {
                const status =
                  statusConfig[season.status] ?? statusConfig.setup;
                return (
                  <tr
                    key={season.id}
                    className="hover:bg-[var(--color-stone)]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-pitch)]">
                      <div className="flex items-center gap-2">
                        {season.name}
                        {season.is_active && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-gol)] text-white rounded-sm">
                            Activa
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-dust)]">
                      {season.start_date} — {season.end_date}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!season.is_active && (
                        <form action={setActiveSeasonAction}>
                          <input
                            type="hidden"
                            name="season_id"
                            value={season.id}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            Activar
                          </Button>
                        </form>
                      )}
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
