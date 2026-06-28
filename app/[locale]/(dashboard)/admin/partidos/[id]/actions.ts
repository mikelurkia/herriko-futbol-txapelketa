"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate(matchId: string) {
  revalidatePath(`/es/admin/partidos/${matchId}`);
  revalidatePath(`/eu/admin/partidos/${matchId}`);
  revalidatePath("/es/jugadores");
  revalidatePath("/eu/jugadores");
}

const eventSchema = z.object({
  match_id: z.string().uuid(),
  player_id: z.string().uuid(),
  season_team_id: z.string().uuid(),
  type: z.enum(["goal", "yellow_card", "red_card"]),
  minute: z.coerce.number().int().min(1).max(120).optional().nullable(),
});

export async function addMatchEventAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = eventSchema.safeParse({
    match_id: formData.get("match_id"),
    player_id: formData.get("player_id"),
    season_team_id: formData.get("season_team_id"),
    type: formData.get("type"),
    minute: formData.get("minute") || null,
  });

  if (!parsed.success) return { error: "Selecciona jugador y tipo de evento." };

  const supabase = await createClient();
  const { error } = await supabase.from("match_events").insert(parsed.data);

  if (error) return { error: "Error al registrar el evento." };

  revalidate(parsed.data.match_id);
  return { success: true };
}

export async function deleteMatchEventAction(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const matchId = formData.get("match_id") as string;
  if (!eventId || !matchId) return;

  const supabase = await createClient();
  await supabase.from("match_events").delete().eq("id", eventId);

  revalidate(matchId);
}
