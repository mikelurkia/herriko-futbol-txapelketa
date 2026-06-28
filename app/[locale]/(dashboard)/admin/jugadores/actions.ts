"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

const playerSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  jersey_number: z.coerce.number().int().positive().optional().nullable(),
});

function revalidate() {
  revalidatePath("/es/admin/jugadores");
  revalidatePath("/eu/admin/jugadores");
}

// Create a new player entity AND register them in a team
export async function addPlayerAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const seasonTeamId = formData.get("season_team_id") as string;
  if (!seasonTeamId) return { error: "Equipo no válido." };

  const parsed = playerSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    jersey_number: formData.get("jersey_number") || null,
  });
  if (!parsed.success) return { error: "Nombre y apellidos son obligatorios." };

  const supabase = await createClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({ first_name: parsed.data.first_name, last_name: parsed.data.last_name })
    .select("id")
    .single();

  if (playerError || !player) return { error: "Error al crear el jugador." };

  const { error: regError } = await supabase.from("player_registrations").insert({
    player_id: player.id,
    season_team_id: seasonTeamId,
    jersey_number: parsed.data.jersey_number ?? null,
  });

  if (regError) return { error: "Error al inscribir el jugador." };

  revalidate();
  return { success: true };
}

// Register an existing player in a team (different season or team change)
export async function registerExistingPlayerAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const seasonTeamId = formData.get("season_team_id") as string;
  const playerId = formData.get("player_id") as string;
  if (!seasonTeamId || !playerId) return { error: "Datos no válidos." };

  const jerseyRaw = formData.get("jersey_number");
  const jerseyNumber = jerseyRaw
    ? z.coerce.number().int().positive().safeParse(jerseyRaw)
    : null;

  const supabase = await createClient();
  const { error } = await supabase.from("player_registrations").insert({
    player_id: playerId,
    season_team_id: seasonTeamId,
    jersey_number: jerseyNumber?.success ? jerseyNumber.data : null,
  });

  if (error) return { error: "Error al inscribir el jugador." };

  revalidate();
  return { success: true };
}

export async function updatePlayerAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const playerId = formData.get("player_id") as string;
  const registrationId = formData.get("registration_id") as string;
  if (!playerId || !registrationId) return { error: "Datos no válidos." };

  const raw = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    jersey_number: formData.get("jersey_number") || null,
  };

  const parsed = playerSchema.safeParse(raw);
  if (!parsed.success) return { error: "Nombre y apellidos son obligatorios." };

  const supabase = await createClient();

  const [{ error: playerError }, { error: regError }] = await Promise.all([
    supabase
      .from("players")
      .update({ first_name: parsed.data.first_name, last_name: parsed.data.last_name })
      .eq("id", playerId),
    supabase
      .from("player_registrations")
      .update({ jersey_number: parsed.data.jersey_number ?? null })
      .eq("id", registrationId),
  ]);

  if (playerError || regError) return { error: "Error al actualizar el jugador." };

  revalidate();
  return { success: true };
}

export async function setPlayerActiveAction(formData: FormData) {
  const registrationId = formData.get("registration_id") as string;
  const isActive = formData.get("is_active") === "true";
  if (!registrationId) return;

  const supabase = await createClient();
  await supabase
    .from("player_registrations")
    .update({ is_active: isActive })
    .eq("id", registrationId);

  revalidate();
}
