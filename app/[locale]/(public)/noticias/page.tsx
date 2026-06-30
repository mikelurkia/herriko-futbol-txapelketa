import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/layout/PageHeading";

const PAGE_SIZE = 10;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "eu" ? "Berriak" : "Noticias",
    description:
      locale === "eu"
        ? "Txapelketako azken berriak eta jakinarazpenak."
        : "Últimas noticias y comunicados del torneo.",
  };
}

export default async function NoticiasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const t = await getTranslations("common");
  const supabase = await createClient();

  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: publications, count } = await supabase
    .from("publications")
    .select("id, title_es, title_eu, body_es, body_eu, published_at", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const fmt = (d: string) =>
    new Intl.DateTimeFormat(locale === "eu" ? "eu" : "es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));

  return (
    <div>
      <PageHeading title={locale === "eu" ? "Berriak" : "Noticias"} />

      {!publications?.length ? (
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago albisterik." : "Aún no hay publicaciones."}
        </p>
      ) : (
        <>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              {page > 1 ? (
                <Link
                  href={{ pathname: "/noticias", query: { page: page - 1 } }}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  {t("previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-[var(--color-dust)]">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={{ pathname: "/noticias", query: { page: page + 1 } }}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors"
                >
                  {t("next")}
                  <ChevronRightIcon className="w-4 h-4" />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
