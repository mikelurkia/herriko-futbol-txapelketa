"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

const seasonSchema = z.object({
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});

export async function createSeasonAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!parsed.success) {
    return { error: "Completa todos los campos obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("seasons").insert(parsed.data);

  if (error) {
    return { error: "Error al crear la temporada." };
  }

  revalidatePath("/es/admin/temporadas");
  revalidatePath("/eu/admin/temporadas");
  return { success: true };
}

export async function setActiveSeasonAction(formData: FormData) {
  const seasonId = formData.get("season_id") as string;
  if (!seasonId) return;

  const supabase = await createClient();
  await supabase.from("seasons").update({ is_active: false }).not("id", "is", null);
  await supabase.from("seasons").update({ is_active: true }).eq("id", seasonId);

  revalidatePath("/es/admin/temporadas");
  revalidatePath("/eu/admin/temporadas");
}
