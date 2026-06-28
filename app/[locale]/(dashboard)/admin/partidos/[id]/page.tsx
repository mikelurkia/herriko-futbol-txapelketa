import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventForm, type TeamOption } from "./EventForm";
import { deleteMatchEventAction } from "./actions";

const PHASE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  upper_playoff: "Liguilla Superior",
  lower_playoff: "Liguilla Inferior",
};

const EVENT_CONFIG = {
  goal: { emoji: "⚽", label: "Gol", className: "text-emerald-700 bg-emerald-50" },
  yellow_card: { emoji: "🟨", label: "Amarilla", className: "text-amber-700 bg-amber-50" },
  red_card: { emoji: "🟥", label: "Roja", className: "text-red-700 bg-red-50" },
} as const;

function formatDate(d: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rawMatch } = await supabase
    .from("matches")
    .select(
      "id, phase, round, status, home_score, away_score, home_penalties, away_penalties, scheduled_date, home_team_id, away_team_id, group_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!rawMatch) notFound();

  const match = rawMatch as {
    id: string;
    phase: "group" | "upper_playoff" | "lower_playoff";
    round: number;
    status: "pending" | "played";
    home_score: number | null;
    away_score: number | null;
    home_penalties: number | null;
    away_penalties: number | null;
    scheduled_date: string | null;
    home_team_id: string | null;
    away_team_id: string | null;
    group_id: string | null;
  };

  const [
    { data: rawHome },
    { data: rawAway },
    { data: rawEvents },
    { data: rawHomePlayers },
    { data: rawAwayPlayers },
    { data: rawGroup },
  ] = await Promise.all([
    match.home_team_id
      ? supabase
          .from("season_teams")
          .select("id, teams(name, primary_color)")
          .eq("id", match.home_team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    match.away_team_id
      ? supabase
          .from("season_teams")
          .select("id, teams(name, primary_color)")
          .eq("id", match.away_team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("match_events")
      .select("id, type, minute, season_team_id, players(first_name, last_name)")
      .eq("match_id", id)
      .order("minute", { nullsFirst: false })
      .order("created_at"),
    match.home_team_id
      ? supabase
          .from("player_registrations")
          .select("players(id, first_name, last_name)")
          .eq("season_team_id", match.home_team_id)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    match.away_team_id
      ? supabase
          .from("player_registrations")
          .select("players(id, first_name, last_name)")
          .eq("season_team_id", match.away_team_id)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    match.group_id
      ? supabase
          .from("groups")
          .select("name")
          .eq("id", match.group_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  type STInfo = { id: string; teams: { name: string; primary_color: string | null } };
  const home = rawHome as unknown as STInfo | null;
  const away = rawAway as unknown as STInfo | null;

  type EventRow = {
    id: string;
    type: "goal" | "yellow_card" | "red_card";
    minute: number | null;
    season_team_id: string;
    players: { first_name: string; last_name: string };
  };
  const events = ((rawEvents ?? []) as unknown as EventRow[]);

  type PRRow = { players: { id: string; first_name: string; last_name: string } };

  function toPlayerList(raw: PRRow[] | null): TeamOption["players"] {
    return (raw ?? [])
      .map((r) => ({
        id: r.players.id,
        firstName: r.players.first_name,
        lastName: r.players.last_name,
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }

  const homeTeam: TeamOption = {
    seasonTeamId: match.home_team_id ?? "",
    teamName: home?.teams.name ?? "Local",
    players: toPlayerList(rawHomePlayers as unknown as PRRow[]),
  };

  const awayTeam: TeamOption = {
    seasonTeamId: match.away_team_id ?? "",
    teamName: away?.teams.name ?? "Visitante",
    players: toPlayerList(rawAwayPlayers as unknown as PRRow[]),
  };

  const phaseLabel = PHASE_LABELS[match.phase] ?? match.phase;
  const contextLabel = rawGroup
    ? `${(rawGroup as unknown as { name: string }).name} · Jornada ${match.round}`
    : `${phaseLabel} · Ronda ${match.round}`;

  const score =
    match.status === "played"
      ? `${match.home_score ?? "?"} – ${match.away_score ?? "?"}`
      : "vs";

  const penInfo =
    match.home_penalties !== null
      ? ` (${match.home_penalties}–${match.away_penalties} pen.)`
      : "";

  return (
    <div className="p-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/admin/partidos"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-dust)] hover:text-[var(--color-pitch)] mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Partidos
      </Link>

      {/* Match header */}
      <div className="bg-white border border-border p-5 mb-6">
        <p className="text-xs text-[var(--color-dust)] uppercase tracking-widest mb-3">
          {contextLabel}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              {home?.teams.primary_color && (
                <span
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ background: home.teams.primary_color }}
                />
              )}
              <span className="font-bold text-[var(--color-pitch)]">
                {home?.teams.name ?? "—"}
              </span>
            </div>
          </div>
          <div className="text-center shrink-0">
            <span className="text-lg font-bold tabular-nums text-[var(--color-pitch)]">
              {score}
            </span>
            {penInfo && (
              <p className="text-xs text-[var(--color-dust)]">{penInfo}</p>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              {away?.teams.primary_color && (
                <span
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ background: away.teams.primary_color }}
                />
              )}
              <span className="font-bold text-[var(--color-pitch)]">
                {away?.teams.name ?? "—"}
              </span>
            </div>
          </div>
        </div>
        {match.scheduled_date && (
          <p className="text-xs text-[var(--color-dust)] text-center mt-2">
            {formatDate(match.scheduled_date)}
          </p>
        )}
      </div>

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs font-bold uppercase tracking-widest text-[var(--color-dust)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Eventos del partido
          </h2>
          <EventForm matchId={id} homeTeam={homeTeam} awayTeam={awayTeam} />
        </div>

        {events.length === 0 ? (
          <div className="bg-white border border-border p-8 text-center">
            <p className="text-sm text-[var(--color-dust)]">
              No hay eventos registrados.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-border divide-y divide-border">
            {events.map((ev) => {
              const cfg = EVENT_CONFIG[ev.type];
              const isHome = ev.season_team_id === match.home_team_id;
              const teamName = isHome ? home?.teams.name : away?.teams.name;
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.className}`}
                  >
                    {cfg.emoji} {cfg.label}
                  </span>
                  <span className="text-xs text-[var(--color-dust)] w-10 shrink-0 tabular-nums">
                    {ev.minute !== null ? `${ev.minute}'` : "—"}
                  </span>
                  <span className="text-sm text-[var(--color-pitch)] flex-1 truncate">
                    {ev.players.last_name}, {ev.players.first_name}
                  </span>
                  <span className="text-xs text-[var(--color-dust)] shrink-0 hidden sm:block">
                    {teamName}
                  </span>
                  <form action={deleteMatchEventAction}>
                    <input type="hidden" name="event_id" value={ev.id} />
                    <input type="hidden" name="match_id" value={id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      className="text-[var(--color-dust)] hover:text-destructive"
                    >
                      <Trash2Icon />
                      <span className="sr-only">Eliminar evento</span>
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
