import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export default async function NoticiasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: publications } = await supabase
    .from("publications")
    .select("id, title_es, title_eu, body_es, body_eu, published_at")
    .order("published_at", { ascending: false });

  const fmt = (d: string) =>
    new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-6"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        {locale === "eu" ? "Berriak" : "Noticias"}
      </h1>

      {!publications?.length ? (
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago albisterik." : "Aún no hay publicaciones."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {publications.map((pub) => {
            const title = locale === "eu" ? pub.title_eu : pub.title_es;
            const body = locale === "eu" ? pub.body_eu : pub.body_es;
            return (
              <Link
                key={pub.id}
                href={`/noticias/${pub.id}`}
                className="block bg-white border border-border p-4 hover:bg-[var(--color-stone)]/60 transition-colors group"
              >
                <p className="text-xs text-[var(--color-dust)] mb-1">{fmt(pub.published_at)}</p>
                <p
                  className="font-bold text-[var(--color-pitch)] group-hover:text-[var(--color-gol)] transition-colors mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </p>
                <p className="text-sm text-[var(--color-dust)] line-clamp-2">{body}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
