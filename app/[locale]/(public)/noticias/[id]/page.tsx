import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: pub } = await supabase
    .from("publications")
    .select("id, title_es, title_eu, body_es, body_eu, published_at")
    .eq("id", id)
    .single();

  if (!pub) notFound();

  const title = locale === "eu" ? pub.title_eu : pub.title_es;
  const body = locale === "eu" ? pub.body_eu : pub.body_es;

  const fmt = new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(pub.published_at));

  return (
    <div className="max-w-2xl">
      <Link
        href="/noticias"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        {locale === "eu" ? "Berriak" : "Noticias"}
      </Link>

      <article>
        <p className="text-xs text-[var(--color-dust)] mb-2">{fmt}</p>
        <h1
          className="text-3xl font-bold uppercase tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
        >
          {title}
        </h1>
        <div className="prose prose-sm max-w-none text-[var(--color-pitch)] leading-relaxed whitespace-pre-wrap">
          {body}
        </div>
      </article>
    </div>
  );
}
