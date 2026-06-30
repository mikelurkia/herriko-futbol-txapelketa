import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { PageHeading } from "@/components/layout/PageHeading";
import { TeamCrest } from "@/components/teams/TeamCrest";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "eu" ? "Partidak" : "Partidos",
    description:
      locale === "eu"
        ? "Egutegia, jardunaldiak eta kanporaketen emaitzak."
        : "Calendario de partidos, jornadas y resultados de la fase eliminatoria.",
  };
}

type MatchRow = {
  id: string;
  phase: "group" | "upper_playoff" | "lower_playoff";
  status: "pending" | "played";
  round: number;
  scheduled_date: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type STInfo = { id: string; teams: { name: string; primary_color: string | null; shield_url: string | null } };
type GroupInfo = { id: string; name: string };

const PHASE_LABELS: Record<string, { es: string; eu: string }> = {
  group: { es: "Fase de Grupos", eu: "Taldeen Fasea" },
  upper_playoff: { es: "Liguilla Superior", eu: "Liguilla Nagusia" },
  lower_playoff: { es: "Liguilla Inferior", eu: "Liguilla Txikia" },
};

function fmt(d: string | null, locale: string) {
  if (!d) return null;
  return new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(d));
}

function MatchEntry({
  m,
  stMap,
  locale,
}: {
  m: MatchRow;
  stMap: Map<string, STInfo>;
  locale: string;
}) {
  const home = m.home_team_id ? stMap.get(m.home_team_id) : null;
  const away = m.away_team_id ? stMap.get(m.away_team_id) : null;
  const played = m.status === "played";

  return (
    <div className={`flex items-center gap-2 px-4 py-3 text-sm border-b border-border last:border-0 ${played ? "" : "opacity-80"}`}>
      <span className="w-20 shrink-0 text-xs text-[var(--color-dust)] capitalize">
        {fmt(m.scheduled_date, locale) ?? "—"}
      </span>
      <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
        <span className={`truncate text-right ${played ? "font-medium text-[var(--color-pitch)]" : "text-[var(--color-dust)]"}`}>
          {home?.teams.name ?? "—"}
        </span>
        <TeamCrest shieldUrl={home?.teams.shield_url} color={home?.teams.primary_color} />
      </div>
      <div className="w-20 shrink-0 text-center">
        {played ? (
          <span className="font-bold tabular-nums text-[var(--color-pitch)]">
            {m.home_score} – {m.away_score}
            {m.home_penalties !== null && (
              <span className="block text-[10px] font-normal text-[var(--color-dust)]">
                ({m.home_penalties}-{m.away_penalties} pen)
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-dust)]">vs</span>
        )}
      </div>
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <TeamCrest shieldUrl={away?.teams.shield_url} color={away?.teams.primary_color} />
        <span className={`truncate ${played ? "font-medium text-[var(--color-pitch)]" : "text-[var(--color-dust)]"}`}>
          {away?.teams.name ?? "—"}
        </span>
      </div>
    </div>
  );
}

export default async function PartidosPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: season } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">
          {locale === "eu" ? "Ez dago denboraldi aktiborik." : "No hay temporada activa."}
        </p>
      </div>
    );
  }

  const [{ data: rawMatches }, { data: rawST }, { data: rawGroups }] = await Promise.all([
    supabase.from("matches").select("id, phase, status, round, scheduled_date, home_score, away_score, home_penalties, away_penalties, group_id, home_team_id, away_team_id").eq("season_id", season.id).order("round").order("scheduled_date", { nullsFirst: false }),
    supabase.from("season_teams").select("id, teams(name, primary_color, shield_url)").eq("season_id", season.id),
    supabase.from("groups").select("id, name").eq("season_id", season.id).order("name"),
  ]);

  const matches = (rawMatches ?? []) as MatchRow[];
  const stMap = new Map(((rawST ?? []) as unknown as STInfo[]).map((st) => [st.id, st]));
  const groups = (rawGroups ?? []) as GroupInfo[];

  const groupMatches = matches.filter((m) => m.phase === "group");
  const byGroup = new Map<string, MatchRow[]>();
  for (const m of groupMatches) {
    const key = m.group_id ?? "__none__";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(m);
  }

  const playoffMatches = matches.filter((m) => m.phase !== "group");
  const byPhase = new Map<string, MatchRow[]>();
  for (const m of playoffMatches) {
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase)!.push(m);
  }

  const jornada = locale === "eu" ? "Jardunaldia" : "Jornada";
  const txanda = locale === "eu" ? "Txanda" : "Ronda";

  // ── Jornada actual: la del próximo partido pendiente, o la última jugada ──
  const pendingByDate = [...groupMatches]
    .filter((m) => m.status === "pending")
    .sort((a, b) => (a.scheduled_date ?? "9999").localeCompare(b.scheduled_date ?? "9999"));
  const playedRounds = groupMatches.filter((m) => m.status === "played").map((m) => m.round);
  const currentRound =
    pendingByDate[0]?.round ?? (playedRounds.length > 0 ? Math.max(...playedRounds) : null);
  const currentRoundMatches =
    currentRound !== null
      ? groupMatches
          .filter((m) => m.round === currentRound)
          .sort((a, b) => (a.scheduled_date ?? "9999").localeCompare(b.scheduled_date ?? "9999"))
      : [];
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div>
      <PageHeading title={locale === "eu" ? "Partidak" : "Partidos"} subtitle={season.name} />

      {currentRoundMatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 text-[10px] uppercase tracking-widest text-white font-semibold"
              style={{ background: "var(--color-gol)" }}
            >
              {locale === "eu" ? "Oraingo jardunaldia" : "Jornada actual"}
            </span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)]" style={{ fontFamily: "var(--font-display)" }}>
              {jornada} {currentRound}
            </h2>
          </div>
          <div className="bg-white border-2 overflow-hidden" style={{ borderColor: "var(--color-gol)" }}>
            {currentRoundMatches.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-b border-border last:border-0 px-1">
                {groups.length > 1 && (
                  <span className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] shrink-0 w-20 truncate pl-3">
                    {groupNameById.get(m.group_id ?? "") ?? ""}
                  </span>
                )}
                <div className="flex-1">
                  <MatchEntry m={m} stMap={stMap} locale={locale} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {matches.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago partidarik programatuta." : "Aún no hay partidos programados."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Group stage */}
          {groupMatches.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                {PHASE_LABELS.group[locale as "es" | "eu"] ?? PHASE_LABELS.group.es}
              </h2>
              <div className="flex flex-col gap-3">
                {groups.map((g) => {
                  const gm = byGroup.get(g.id) ?? [];
                  if (gm.length === 0) return null;
                  const byRound = new Map<number, MatchRow[]>();
                  for (const m of gm) {
                    if (!byRound.has(m.round)) byRound.set(m.round, []);
                    byRound.get(m.round)!.push(m);
                  }
                  return (
                    <div key={g.id} className="bg-white border border-border overflow-hidden">
                      <div className="px-4 py-2 border-b border-border bg-[var(--color-stone)]">
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-pitch)]" style={{ fontFamily: "var(--font-display)" }}>
                          {g.name}
                        </span>
                      </div>
                      {[...byRound.entries()].sort(([a], [b]) => a - b).map(([round, ms]) => (
                        <div key={round}>
                          <div className="px-4 py-1.5 bg-[var(--color-stone)]/50 border-b border-border">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] font-medium">
                              {jornada} {round}
                            </span>
                          </div>
                          {ms.map((m) => <MatchEntry key={m.id} m={m} stMap={stMap} locale={locale} />)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Playoffs */}
          {(["upper_playoff", "lower_playoff"] as const).map((phase) => {
            const pm = byPhase.get(phase) ?? [];
            if (pm.length === 0) return null;
            const byRound = new Map<number, MatchRow[]>();
            for (const m of pm) {
              if (!byRound.has(m.round)) byRound.set(m.round, []);
              byRound.get(m.round)!.push(m);
            }
            return (
              <section key={phase}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  {PHASE_LABELS[phase][locale as "es" | "eu"] ?? PHASE_LABELS[phase].es}
                </h2>
                <div className="bg-white border border-border overflow-hidden">
                  {[...byRound.entries()].sort(([a], [b]) => a - b).map(([round, ms]) => (
                    <div key={round}>
                      <div className="px-4 py-1.5 bg-[var(--color-stone)]/50 border-b border-border">
                        <span className="text-[10px] uppercase tracking-widest text-[var(--color-dust)] font-medium">
                          {txanda} {round}
                        </span>
                      </div>
                      {ms.map((m) => <MatchEntry key={m.id} m={m} stMap={stMap} locale={locale} />)}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
