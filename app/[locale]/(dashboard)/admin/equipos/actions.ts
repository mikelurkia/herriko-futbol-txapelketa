"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

const teamSchema = z.object({
  name: z.string().min(1),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
});

function revalidate() {
  revalidatePath("/es/admin/equipos");
  revalidatePath("/eu/admin/equipos");
}

export async function createTeamAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    primary_color: formData.get("primary_color") || null,
    secondary_color: formData.get("secondary_color") || null,
  });

  if (!parsed.success) return { error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    name: parsed.data.name,
    primary_color: parsed.data.primary_color ?? null,
    secondary_color: parsed.data.secondary_color ?? null,
  });

  if (error) return { error: "Error al crear el equipo." };

  revalidate();
  return { success: true };
}

export async function updateTeamAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const id = formData.get("id") as string;
  if (!id) return { error: "ID no válido." };

  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    primary_color: formData.get("primary_color") || null,
    secondary_color: formData.get("secondary_color") || null,
  });

  if (!parsed.success) return { error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name: parsed.data.name,
      primary_color: parsed.data.primary_color ?? null,
      secondary_color: parsed.data.secondary_color ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Error al actualizar el equipo." };

  revalidate();
  return { success: true };
}

export async function enrollTeamAction(formData: FormData) {
  const teamId = formData.get("team_id") as string;
  const seasonId = formData.get("season_id") as string;
  if (!teamId || !seasonId) return;

  const supabase = await createClient();
  await supabase.from("season_teams").insert({ team_id: teamId, season_id: seasonId });

  revalidate();
}

export async function unenrollTeamAction(formData: FormData) {
  const seasonTeamId = formData.get("season_team_id") as string;
  if (!seasonTeamId) return;

  const supabase = await createClient();
  await supabase.from("season_teams").delete().eq("id", seasonTeamId);

  revalidate();
}
