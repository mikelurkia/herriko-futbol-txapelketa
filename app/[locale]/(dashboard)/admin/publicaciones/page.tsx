import { createClient } from "@/lib/supabase/server";
import { PublicationForm } from "./PublicationForm";
import { deletePublicationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";

export default async function PublicacionesPage() {
  const supabase = await createClient();

  const { data: publications } = await supabase
    .from("publications")
    .select("id, title_es, title_eu, body_es, body_eu, published_at")
    .order("published_at", { ascending: false });

  const fmt = (d: string) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d));

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Publicaciones
          </h1>
          <p className="text-sm text-[var(--color-dust)] mt-0.5">
            {publications?.length ?? 0} publicación
            {publications?.length !== 1 ? "es" : ""}
          </p>
        </div>
        <PublicationForm />
      </div>

      {!publications?.length ? (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">
            No hay publicaciones. Crea la primera.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {publications.map((pub) => (
            <div
              key={pub.id}
              className="bg-white border border-border p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-dust)] mb-1">
                  {fmt(pub.published_at)}
                </p>
                <p className="font-semibold text-[var(--color-pitch)] truncate">
                  {pub.title_es}
                </p>
                <p className="text-xs text-[var(--color-dust)] truncate">
                  {pub.title_eu}
                </p>
                <p className="text-sm text-[var(--color-dust)] mt-1 line-clamp-2">
                  {pub.body_es}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <PublicationForm publication={pub} />
                <form action={deletePublicationAction}>
                  <input type="hidden" name="id" value={pub.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    className="text-[var(--color-dust)] hover:text-destructive"
                  >
                    <Trash2Icon />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
