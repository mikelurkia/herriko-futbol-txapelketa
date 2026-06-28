import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";

type MatchRow = {
  id: string;
  status: string;
  phase: string;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
};

type STInfo = {
  id: string;
  teams: { name: string; primary_color: string | null };
};

type TeamStats = {
  id: string;
  name: string;
  color: string | null;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number; pts: number;
};

function buildStandings(ids: string[], stMap: Map<string, STInfo>, matches: MatchRow[]): TeamStats[] {
  const stats = new Map<string, TeamStats>();
  for (const id of ids) {
    const st = stMap.get(id);
    stats.set(id, { id, name: st?.teams.name ?? "—", color: st?.teams.primary_color ?? null, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 });
  }
  for (const m of matches) {
    if (m.status !== "played" || m.home_score === null || m.away_score === null) continue;
    const hs = m.home_team_id ? stats.get(m.home_team_id) : null;
    const as_ = m.away_team_id ? stats.get(m.away_team_id) : null;
    if (hs) {
      hs.pj++; hs.gf += m.home_score; hs.gc += m.away_score;
      if (m.home_score > m.away_score) { hs.g++; hs.pts += 3; }
      else if (m.home_score === m.away_score) { hs.e++; hs.pts++; }
      else hs.p++;
    }
    if (as_) {
      as_.pj++; as_.gf += m.away_score; as_.gc += m.home_score;
      if (m.away_score > m.home_score) { as_.g++; as_.pts += 3; }
      else if (m.away_score === m.home_score) { as_.e++; as_.pts++; }
      else as_.p++;
    }
  }
  return [...stats.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const da = a.gf - a.gc, db = b.gf - b.gc;
    if (db !== da) return db - da;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });
}

export default async function ClasificacionPage() {
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

  const [{ data: rawGroups }, { data: rawST }, { data: rawMatches }] = await Promise.all([
    supabase.from("groups").select("id, name, group_teams(season_team_id)").eq("season_id", season.id).order("name"),
    supabase.from("season_teams").select("id, teams(name, primary_color)").eq("season_id", season.id),
    supabase.from("matches").select("id, status, phase, group_id, home_team_id, away_team_id, home_score, away_score").eq("season_id", season.id).eq("phase", "group"),
  ]);

  type GroupRow = { id: string; name: string; group_teams: { season_team_id: string }[] };
  const groups = (rawGroups ?? []) as unknown as GroupRow[];
  const stMap = new Map(((rawST ?? []) as unknown as STInfo[]).map((st) => [st.id, st]));
  const matches = (rawMatches ?? []) as MatchRow[];

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        {locale === "eu" ? "Sailkapena" : "Clasificación"}
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-6">{season.name}</p>

      {groups.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago talderik." : "Aún no hay grupos definidos."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => {
            const ids = g.group_teams.map((gt) => gt.season_team_id);
            const groupMatches = matches.filter((m) => m.group_id === g.id);
            const standings = buildStandings(ids, stMap, groupMatches);

            return (
              <section key={g.id}>
                <h2
                  className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {g.name}
                </h2>
                <div className="bg-white border border-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border bg-[var(--color-stone)] text-xs uppercase tracking-widest text-[var(--color-dust)]">
                        <th className="text-left px-3 py-2 w-6 font-medium">#</th>
                        <th className="text-left px-3 py-2 font-medium">{locale === "eu" ? "Taldea" : "Equipo"}</th>
                        <th className="text-center px-2 py-2 font-medium">PJ</th>
                        <th className="text-center px-2 py-2 font-medium">G</th>
                        <th className="text-center px-2 py-2 font-medium">E</th>
                        <th className="text-center px-2 py-2 font-medium">P</th>
                        <th className="text-center px-2 py-2 font-medium hidden sm:table-cell">GF</th>
                        <th className="text-center px-2 py-2 font-medium hidden sm:table-cell">GC</th>
                        <th className="text-center px-2 py-2 font-medium">DG</th>
                        <th className="text-center px-3 py-2 font-bold text-[var(--color-pitch)]">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {standings.map((row, i) => (
                        <tr key={row.id} className="hover:bg-[var(--color-stone)]/50 transition-colors">
                          <td className="px-3 py-2.5 text-xs text-[var(--color-dust)]">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {row.color && (
                                <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ background: row.color }} />
                              )}
                              <span className="font-medium text-[var(--color-pitch)]">{row.name}</span>
                            </div>
                          </td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.pj}</td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.g}</td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.e}</td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">{row.p}</td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)] hidden sm:table-cell">{row.gf}</td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)] hidden sm:table-cell">{row.gc}</td>
                          <td className="text-center px-2 py-2.5 tabular-nums text-[var(--color-dust)]">
                            {row.gf - row.gc > 0 ? `+${row.gf - row.gc}` : row.gf - row.gc}
                          </td>
                          <td className="text-center px-3 py-2.5">
                            <span className="font-bold text-[var(--color-pitch)]">{row.pts}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
