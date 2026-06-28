"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate() {
  revalidatePath("/es/admin/grupos");
  revalidatePath("/eu/admin/grupos");
}

function revalidatePartidos() {
  revalidatePath("/es/admin/partidos");
  revalidatePath("/eu/admin/partidos");
  revalidatePath("/es/partidos");
  revalidatePath("/eu/partidos");
}

// ── Round-robin calendar generator (Berger circle method) ────────────────────

type LogicalRound = {
  matches: Array<{ home: string; away: string }>;
  byeTeam: string | null;
};

type CalendarResult = {
  fixtures: Array<{ dbRound: number; home: string; away: string }>;
  meta: Array<{ dbRound: number; byeTeam: string | null; refereeTeam: string | null }>;
};

function computeLogicalRounds(teamIds: string[]): LogicalRound[] {
  const n = teamIds.length;
  const teams: (string | null)[] = n % 2 === 0 ? [...teamIds] : [...teamIds, null];
  const total = teams.length;
  const rounds = total - 1;
  const result: LogicalRound[] = [];
  const rotating = teams.slice(1);

  for (let r = 0; r < rounds; r++) {
    const current = [teams[0], ...rotating];
    const matches: Array<{ home: string; away: string }> = [];
    let byeTeam: string | null = null;

    for (let i = 0; i < total / 2; i++) {
      const a = current[i];
      const b = current[total - 1 - i];
      if (a === null) { byeTeam = b as string; continue; }
      if (b === null) { byeTeam = a as string; continue; }
      matches.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }

    result.push({ matches, byeTeam });
    rotating.unshift(rotating.pop()!);
  }

  return result;
}

function buildCalendar(
  teamIds: string[],
  options: { doubleRR: boolean; maxPerRound: number; refereeRotation: boolean }
): CalendarResult {
  // Step 1: generate all pairings ordered by logical round
  const logicalRounds = computeLogicalRounds(teamIds);

  if (options.doubleRR) {
    const secondLeg = logicalRounds.map((lr) => ({
      byeTeam: lr.byeTeam,
      matches: lr.matches.map((m) => ({ home: m.away, away: m.home })),
    }));
    logicalRounds.push(...secondLeg);
  }

  // Flatten: all matches in round order (earlier rounds first)
  type PendingMatch = { home: string; away: string };
  const pool: PendingMatch[] = logicalRounds.flatMap((lr) => lr.matches);

  // Step 2: greedy scheduling — fill each jornada with up to maxPerRound
  // non-conflicting matches, scanning the pool in order each time.
  // Processing in pool order means teams with earlier-round matches get
  // scheduled first, preserving approximate fairness.
  const fixtures: CalendarResult["fixtures"] = [];
  const meta: CalendarResult["meta"] = [];

  let refIdx = 0; // for referee rotation when no natural free team
  let dbRound = 1;

  while (pool.length > 0) {
    const chunk: PendingMatch[] = [];
    const usedTeams = new Set<string>();
    const deferred: PendingMatch[] = [];

    for (const match of pool) {
      if (
        chunk.length < options.maxPerRound &&
        !usedTeams.has(match.home) &&
        !usedTeams.has(match.away)
      ) {
        chunk.push(match);
        usedTeams.add(match.home);
        usedTeams.add(match.away);
      } else {
        deferred.push(match);
      }
    }

    // Safety: if nothing fits (shouldn't happen with valid round-robin input)
    if (chunk.length === 0) break;

    for (const m of chunk) {
      fixtures.push({ dbRound, home: m.home, away: m.away });
    }

    // Free teams this jornada
    const playing = usedTeams;
    const freeTeams = teamIds.filter((t) => !playing.has(t));
    const byeTeam = freeTeams[0] ?? null;

    // Referee: pick next free team in rotation
    let refereeTeam: string | null = null;
    if (options.refereeRotation) {
      if (freeTeams.length > 0) {
        const n = teamIds.length;
        for (let attempt = 0; attempt < n; attempt++) {
          const candidate = teamIds[(refIdx + attempt) % n];
          if (freeTeams.includes(candidate)) {
            refereeTeam = candidate;
            refIdx = (refIdx + attempt + 1) % n;
            break;
          }
        }
        if (!refereeTeam) refereeTeam = freeTeams[0];
      }
      // Even N where all teams play: no free team → no referee this jornada
    }

    meta.push({ dbRound, byeTeam, refereeTeam });

    // Replace pool with unscheduled matches, preserving relative order
    pool.length = 0;
    pool.push(...deferred);
    dbRound++;
  }

  return { fixtures, meta };
}

export async function generateCalendarAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const groupId = formData.get("group_id") as string;
  const doubleRR = formData.get("double_rr") === "1";
  const refereeRotation = formData.get("referee_rotation") === "1";
  const maxPerRound = Math.max(1, parseInt(formData.get("max_per_round") as string, 10) || 3);
  if (!groupId) return { error: "Grupo no válido." };

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, season_id, group_teams(season_team_id)")
    .eq("id", groupId)
    .single() as { data: { id: string; season_id: string; group_teams: { season_team_id: string }[] } | null };

  if (!group) return { error: "Grupo no encontrado." };

  const teamIds = group.group_teams.map((gt) => gt.season_team_id);
  if (teamIds.length < 2) return { error: "El grupo necesita al menos 2 equipos." };

  // Block regeneration if any match has been played
  const { count: playedCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("phase", "group")
    .eq("status", "played");

  if (playedCount && playedCount > 0) {
    return { error: `No se puede regenerar: hay ${playedCount} partido${playedCount !== 1 ? "s" : ""} ya jugado${playedCount !== 1 ? "s" : ""}.` };
  }

  // Delete existing pending matches and round meta for this group
  await Promise.all([
    supabase.from("matches").delete().eq("group_id", groupId).eq("phase", "group").eq("status", "pending"),
    supabase.from("group_round_meta").delete().eq("group_id", groupId),
  ]);

  const { fixtures, meta } = buildCalendar(teamIds, { doubleRR, maxPerRound, refereeRotation });

  const [matchResult, metaResult] = await Promise.all([
    supabase.from("matches").insert(
      fixtures.map((f) => ({
        season_id: group.season_id,
        group_id: groupId,
        phase: "group",
        round: f.dbRound,
        home_team_id: f.home,
        away_team_id: f.away,
        status: "pending",
      }))
    ),
    meta.length > 0
      ? supabase.from("group_round_meta").insert(
          meta.map((m) => ({
            group_id: groupId,
            round: m.dbRound,
            bye_team_id: m.byeTeam,
            referee_team_id: m.refereeTeam,
          }))
        )
      : Promise.resolve({ error: null }),
  ]);

  if (matchResult.error || metaResult.error) return { error: "Error al generar el calendario." };

  revalidate();
  revalidatePartidos();
  return { success: true };
}

export async function createGroupAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) return { error: "No hay temporada activa." };

  const { error } = await supabase
    .from("groups")
    .insert({ name, season_id: season.id });

  if (error) return { error: "Error al crear el grupo." };

  revalidate();
  return { success: true };
}

export async function renameGroupAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) return { error: "Datos no válidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({ name })
    .eq("id", id);

  if (error) return { error: "Error al renombrar el grupo." };

  revalidate();
  return { success: true };
}

export async function deleteGroupAction(formData: FormData) {
  const id = formData.get("group_id") as string;
  if (!id) return;

  const supabase = await createClient();

  const { count } = await supabase
    .from("group_teams")
    .select("id", { count: "exact", head: true })
    .eq("group_id", id);

  if (count && count > 0) return; // silently reject non-empty groups

  await supabase.from("groups").delete().eq("id", id);
  revalidate();
}

export async function addTeamToGroupAction(formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const seasonTeamId = formData.get("season_team_id") as string;
  if (!groupId || !seasonTeamId) return;

  const supabase = await createClient();
  await supabase.from("group_teams").insert({
    group_id: groupId,
    season_team_id: seasonTeamId,
  });

  revalidate();
}

export async function removeTeamFromGroupAction(formData: FormData) {
  const groupTeamId = formData.get("group_team_id") as string;
  if (!groupTeamId) return;

  const supabase = await createClient();
  await supabase.from("group_teams").delete().eq("id", groupTeamId);

  revalidate();
}
