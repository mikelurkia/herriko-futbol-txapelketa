"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate() {
  revalidatePath("/es/admin/usuarios");
  revalidatePath("/eu/admin/usuarios");
}

export async function updateUserRoleAction(formData: FormData) {
  const userId = formData.get("user_id") as string;
  const role = formData.get("role") as "admin" | "team_manager";
  if (!userId || !role) return;

  const supabase = await createClient();
  await supabase.from("users").update({ role }).eq("id", userId);

  revalidate();
}

export async function updateUserNameAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const userId = formData.get("user_id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!userId || !name) return { error: "Nombre obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ name })
    .eq("id", userId);

  if (error) return { error: "Error al actualizar." };

  revalidate();
  return { success: true };
}
