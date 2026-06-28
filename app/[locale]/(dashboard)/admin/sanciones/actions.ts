"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate() {
  revalidatePath("/es/admin/sanciones");
  revalidatePath("/eu/admin/sanciones");
}

const createSchema = z.object({
  player_id: z.string().uuid(),
  triggering_match_id: z.string().uuid(),
  reason: z.enum(["yellow_accumulation", "red_card", "additional"]),
  matches_suspended: z.coerce.number().int().min(1),
});

export async function createSanctionAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = createSchema.safeParse({
    player_id: formData.get("player_id"),
    triggering_match_id: formData.get("triggering_match_id"),
    reason: formData.get("reason"),
    matches_suspended: formData.get("matches_suspended"),
  });

  if (!parsed.success) return { error: "Completa todos los campos." };

  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) return { error: "No hay temporada activa." };

  const { error } = await supabase.from("sanctions").insert({
    player_id: parsed.data.player_id,
    season_id: season.id,
    triggering_match_id: parsed.data.triggering_match_id,
    reason: parsed.data.reason,
    matches_suspended: parsed.data.matches_suspended,
  });

  if (error) return { error: "Error al crear la sanción." };

  revalidate();
  return { success: true };
}

export async function serveMatchAction(formData: FormData) {
  const sanctionId = formData.get("sanction_id") as string;
  if (!sanctionId) return;

  const supabase = await createClient();

  const { data: sanction } = await supabase
    .from("sanctions")
    .select("matches_served, matches_suspended")
    .eq("id", sanctionId)
    .single();

  if (!sanction) return;

  const newServed = sanction.matches_served + 1;
  const completed = newServed >= sanction.matches_suspended;

  await supabase
    .from("sanctions")
    .update({
      matches_served: newServed,
      is_active: !completed,
    })
    .eq("id", sanctionId);

  revalidate();
}

export async function toggleSanctionAction(formData: FormData) {
  const sanctionId = formData.get("sanction_id") as string;
  const isActive = formData.get("is_active") === "true";
  if (!sanctionId) return;

  const supabase = await createClient();
  await supabase
    .from("sanctions")
    .update({ is_active: isActive })
    .eq("id", sanctionId);

  revalidate();
}

export async function deleteSanctionAction(formData: FormData) {
  const sanctionId = formData.get("sanction_id") as string;
  if (!sanctionId) return;

  const supabase = await createClient();
  await supabase.from("sanctions").delete().eq("id", sanctionId);

  revalidate();
}
