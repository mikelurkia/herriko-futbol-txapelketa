"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate() {
  revalidatePath("/es/admin/grupos");
  revalidatePath("/eu/admin/grupos");
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
