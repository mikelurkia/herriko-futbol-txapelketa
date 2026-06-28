"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type State = { error?: string; success?: boolean } | null;

function revalidate() {
  revalidatePath("/es/admin/publicaciones");
  revalidatePath("/eu/admin/publicaciones");
  revalidatePath("/es");
  revalidatePath("/eu");
}

const pubSchema = z.object({
  title_es: z.string().min(1),
  title_eu: z.string().min(1),
  body_es: z.string().min(1),
  body_eu: z.string().min(1),
});

export async function createPublicationAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = pubSchema.safeParse({
    title_es: formData.get("title_es"),
    title_eu: formData.get("title_eu"),
    body_es: formData.get("body_es"),
    body_eu: formData.get("body_eu"),
  });

  if (!parsed.success) return { error: "Rellena todos los campos." };

  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "No autenticado." };

  const { error } = await supabase.from("publications").insert({
    ...parsed.data,
    author_id: user.user.id,
  });

  if (error) return { error: "Error al publicar." };

  revalidate();
  return { success: true };
}

export async function updatePublicationAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const id = formData.get("id") as string;
  if (!id) return { error: "ID no válido." };

  const parsed = pubSchema.safeParse({
    title_es: formData.get("title_es"),
    title_eu: formData.get("title_eu"),
    body_es: formData.get("body_es"),
    body_eu: formData.get("body_eu"),
  });

  if (!parsed.success) return { error: "Rellena todos los campos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("publications")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: "Error al actualizar." };

  revalidate();
  return { success: true };
}

export async function deletePublicationAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("publications").delete().eq("id", id);

  revalidate();
}
