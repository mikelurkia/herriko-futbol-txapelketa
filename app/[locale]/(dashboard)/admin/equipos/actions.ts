"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

const teamSchema = z.object({
  name: z.string().min(1),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  founded_year: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
});

function revalidate() {
  revalidatePath("/es/admin/equipos");
  revalidatePath("/eu/admin/equipos");
  revalidatePath("/es/equipos");
  revalidatePath("/eu/equipos");
}

async function uploadShield(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  file: File
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > 2 * 1024 * 1024) return null; // 2 MB limit

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${teamId}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("shields")
    .upload(filename, Buffer.from(bytes), {
      contentType: file.type || "image/png",
      upsert: true,
    });

  if (error) return null;

  const { data } = supabase.storage.from("shields").getPublicUrl(filename);
  // Append cache-buster so browsers pick up new uploads
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function createTeamAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    primary_color: formData.get("primary_color") || null,
    secondary_color: formData.get("secondary_color") || null,
    founded_year: formData.get("founded_year") || null,
  });

  if (!parsed.success) return { error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name: parsed.data.name,
      primary_color: parsed.data.primary_color ?? null,
      secondary_color: parsed.data.secondary_color ?? null,
      founded_year: parsed.data.founded_year ?? null,
    })
    .select("id")
    .single();

  if (error || !team) return { error: "Error al crear el equipo." };

  const shieldFile = formData.get("shield");
  if (shieldFile instanceof File) {
    const url = await uploadShield(supabase, team.id, shieldFile);
    if (url) {
      await supabase.from("teams").update({ shield_url: url }).eq("id", team.id);
    }
  }

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
    founded_year: formData.get("founded_year") || null,
  });

  if (!parsed.success) return { error: "El nombre es obligatorio." };

  const supabase = await createClient();

  const updatePayload: {
    name: string;
    primary_color: string | null;
    secondary_color: string | null;
    founded_year: number | null;
    shield_url?: string;
  } = {
    name: parsed.data.name,
    primary_color: parsed.data.primary_color ?? null,
    secondary_color: parsed.data.secondary_color ?? null,
    founded_year: parsed.data.founded_year ?? null,
  };

  const shieldFile = formData.get("shield");
  if (shieldFile instanceof File) {
    const url = await uploadShield(supabase, id, shieldFile);
    if (url) updatePayload.shield_url = url;
  }

  const { error } = await supabase.from("teams").update(updatePayload).eq("id", id);
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
