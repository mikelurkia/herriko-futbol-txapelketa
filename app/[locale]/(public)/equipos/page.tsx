import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "eu" ? "Taldeak" : "Equipos",
    description:
      locale === "eu"
        ? "Txapelketako talde guztien zerrenda eta fitxak."
        : "Listado y fichas de todos los equipos del torneo.",
  };
}

type TeamInfo = {
  id: string;
  name: string;
  shield_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
};

type STRow = {
  id: string;
  teams: TeamInfo;
  player_registrations: { id: string }[];
};

function JerseyIcon({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string | null;
}) {
  const p = primary;
  const s = secondary ?? primary;
  const hasStripe = secondary && secondary.toLowerCase() !== primary.toLowerCase();

  return (
    <svg
      viewBox="0 0 80 68"
      xmlns="http://www.w3.org/2000/svg"
      className="w-14 h-12"
      aria-hidden
    >
      {/* Left sleeve */}
      <path
        d="M1 14 L18 5 L23 26 L7 30Z"
        fill={p}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right sleeve */}
      <path
        d="M79 14 L62 5 L57 26 L73 30Z"
        fill={p}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Body */}
      <path
        d="M7 30 L23 26 L27 7 L40 12 L53 7 L57 26 L73 30 L69 67 L11 67Z"
        fill={p}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Collar arc */}
      <path
        d="M27 7 Q40 21 53 7"
        fill="none"
        stroke={s}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Chest stripe (only if secondary differs from primary) */}
      {hasStripe && (
        <path
          d="M10 40 L70 40 L69 52 L11 52Z"
          fill={s}
        />
      )}
    </svg>
  );
}

export default async function EquiposPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!season) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-dust)]">
          {locale === "eu" ? "Ez dago denboraldi aktiborik." : "No hay temporada activa."}
        </p>
      </div>
    );
  }

  const { data: rawST } = await supabase
    .from("season_teams")
    .select(
      "id, teams(id, name, shield_url, primary_color, secondary_color, founded_year), player_registrations(id)"
    )
    .eq("season_id", season.id);

  const teams = ((rawST ?? []) as unknown as STRow[]).sort((a, b) =>
    a.teams.name.localeCompare(b.teams.name)
  );

  return (
    <div>
      <h1
        className="text-3xl font-bold uppercase tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        {locale === "eu" ? "Taldeak" : "Equipos"}
      </h1>
      <p className="text-sm text-[var(--color-dust)] mb-8">
        {locale === "eu"
          ? `${teams.length} talde · ${season.name}`
          : `${teams.length} equipo${teams.length !== 1 ? "s" : ""} · ${season.name}`}
      </p>

      {teams.length === 0 ? (
        <p className="text-sm text-[var(--color-dust)]">
          {locale === "eu" ? "Oraindik ez dago talderik izena emanda." : "No hay equipos inscritos."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {teams.map((st) => {
            const t = st.teams;
            const playerCount = st.player_registrations.length;

            return (
              <Link
                key={st.id}
                href={`/equipos/${t.id}`}
                className="bg-white border border-border flex flex-col items-center text-center overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Top color band */}
                <div
                  className="w-full h-1.5"
                  style={{
                    background: t.primary_color
                      ? `linear-gradient(to right, ${t.primary_color} 50%, ${t.secondary_color ?? t.primary_color} 50%)`
                      : "var(--color-stone)",
                  }}
                />

                {/* Shield or jersey */}
                <div className="pt-5 pb-3 flex items-center justify-center h-24">
                  {t.shield_url ? (
                    <div className="relative w-16 h-16">
                      <Image
                        src={t.shield_url}
                        alt={`Escudo ${t.name}`}
                        fill
                        className="object-contain drop-shadow-sm"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="drop-shadow-sm">
                      <JerseyIcon
                        primary={t.primary_color ?? "#374151"}
                        secondary={t.secondary_color}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 pb-4 flex flex-col items-center gap-1.5 w-full">
                  <p
                    className="font-bold text-sm uppercase tracking-wide text-[var(--color-pitch)] leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t.name}
                  </p>

                  {t.founded_year && (
                    <p className="text-[11px] text-[var(--color-dust)]">
                      {locale === "eu" ? "Sort." : "Est."} {t.founded_year}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-0.5">
                    {t.primary_color && (
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: t.primary_color }}
                        title="Color principal"
                      />
                    )}
                    {t.secondary_color && (
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: t.secondary_color }}
                        title="Color secundario"
                      />
                    )}
                  </div>

                  <p className="text-xs text-[var(--color-dust)]">
                    {locale === "eu"
                      ? `${playerCount} jokalari`
                      : `${playerCount} jugador${playerCount !== 1 ? "es" : ""}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
