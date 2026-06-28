"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate() {
  revalidatePath("/es/admin/partidos");
  revalidatePath("/eu/admin/partidos");
}

const createSchema = z.object({
  phase: z.enum(["group", "upper_playoff", "lower_playoff"]),
  round: z.coerce.number().int().positive(),
  group_id: z.string().uuid().optional().nullable(),
  home_team_id: z.string().uuid(),
  away_team_id: z.string().uuid(),
  scheduled_date: z.string().optional().nullable(),
});

export async function createMatchAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = createSchema.safeParse({
    phase: formData.get("phase"),
    round: formData.get("round"),
    group_id: formData.get("group_id") || null,
    home_team_id: formData.get("home_team_id"),
    away_team_id: formData.get("away_team_id"),
    scheduled_date: formData.get("scheduled_date") || null,
  });

  if (!parsed.success) return { error: "Completa todos los campos obligatorios." };

  const { phase, round, group_id, home_team_id, away_team_id, scheduled_date } =
    parsed.data;

  if (home_team_id === away_team_id)
    return { error: "Local y visitante deben ser equipos distintos." };
  if (phase === "group" && !group_id)
    return { error: "Selecciona un grupo para la fase de grupos." };

  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) return { error: "No hay temporada activa." };

  const { error } = await supabase.from("matches").insert({
    season_id: season.id,
    phase,
    round,
    group_id: phase === "group" ? group_id : null,
    home_team_id,
    away_team_id,
    scheduled_date,
  });

  if (error) return { error: "Error al crear el partido." };

  revalidate();
  return { success: true };
}

export async function registerResultAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const matchId = formData.get("match_id") as string;
  const homeScore = parseInt(formData.get("home_score") as string);
  const awayScore = parseInt(formData.get("away_score") as string);

  if (!matchId || isNaN(homeScore) || isNaN(awayScore))
    return { error: "Introduce los goles de ambos equipos." };

  const homePenRaw = formData.get("home_penalties") as string;
  const awayPenRaw = formData.get("away_penalties") as string;
  const homePen = homePenRaw !== "" ? parseInt(homePenRaw) : null;
  const awayPen = awayPenRaw !== "" ? parseInt(awayPenRaw) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      home_penalties: !isNaN(homePen as number) ? homePen : null,
      away_penalties: !isNaN(awayPen as number) ? awayPen : null,
      status: "played",
    })
    .eq("id", matchId);

  if (error) return { error: "Error al registrar el resultado." };

  revalidate();
  return { success: true };
}

export async function updateMatchDateAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const matchId = formData.get("match_id") as string;
  const scheduledDate = (formData.get("scheduled_date") as string) || null;

  if (!matchId) return { error: "Datos no válidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ scheduled_date: scheduledDate })
    .eq("id", matchId);

  if (error) return { error: "Error al actualizar la fecha." };

  revalidate();
  return { success: true };
}

export async function deleteMatchAction(formData: FormData) {
  const matchId = formData.get("match_id") as string;
  if (!matchId) return;

  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", matchId);

  revalidate();
}
