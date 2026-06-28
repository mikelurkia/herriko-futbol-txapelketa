"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboardIcon, LogInIcon } from "lucide-react";

const navItems = [
  { key: "clasificacion", href: "/clasificacion" },
  { key: "partidos", href: "/partidos" },
  { key: "equipos", href: "/equipos" },
  { key: "jugadores", href: "/jugadores" },
  { key: "noticias", href: "/noticias" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  const otherLocale = locale === "es" ? "eu" : "es";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  function switchLocale() {
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-[var(--color-pitch)] text-white"
    >
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            className="text-[var(--color-gol)] font-bold text-lg leading-none uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            HFT
          </span>
          <span className="hidden sm:block text-xs uppercase tracking-widest text-white/60 font-medium">
            Herriko Futbol Txapelketa
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ key, href }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={`px-3 py-1.5 text-xs uppercase tracking-widest font-medium transition-colors ${
                  isActive
                    ? "text-white bg-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        {/* Admin link + Language switcher */}
        <div className="flex items-center gap-1">
          {loggedIn ? (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/60 hover:text-white transition-colors"
              title="Panel de administración"
            >
              <LayoutDashboardIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase tracking-widest font-medium">Admin</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/60 hover:text-white transition-colors"
              title="Iniciar sesión"
            >
              <LogInIcon className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            onClick={switchLocale}
            className="text-xs uppercase tracking-widest font-semibold text-white/60 hover:text-white transition-colors px-2 py-1"
          >
            {otherLocale}
          </button>
        </div>
      </div>
    </header>
  );
}
