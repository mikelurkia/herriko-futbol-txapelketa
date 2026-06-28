"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  CalendarDaysIcon,
  ShieldIcon,
  UsersRoundIcon,
  LayoutGridIcon,
  ListIcon,
  AlertCircleIcon,
  NewspaperIcon,
  UsersIcon,
  LogOutIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/temporadas", label: "Temporadas", Icon: CalendarDaysIcon },
  { href: "/admin/equipos", label: "Equipos", Icon: ShieldIcon },
  { href: "/admin/jugadores", label: "Jugadores", Icon: UsersRoundIcon },
  { href: "/admin/grupos", label: "Grupos", Icon: LayoutGridIcon },
  { href: "/admin/partidos", label: "Partidos", Icon: ListIcon },
  { href: "/admin/sanciones", label: "Sanciones", Icon: AlertCircleIcon },
  { href: "/admin/publicaciones", label: "Publicaciones", Icon: NewspaperIcon },
  { href: "/admin/usuarios", label: "Usuarios", Icon: UsersIcon },
];

interface AdminSidebarProps {
  userName: string;
  logoutAction: (formData: FormData) => Promise<void>;
  locale: string;
}

export function AdminSidebar({ userName, logoutAction, locale }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-[var(--color-pitch)] text-white flex flex-col min-h-screen sticky top-0 h-screen">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-[var(--color-gol)] font-bold text-base uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            HFT
          </span>
          <span className="text-xs text-white/40 uppercase tracking-widest">
            Admin
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Portal público */}
      <div className="px-2 pb-2">
        <Link
          href="/clasificacion"
          className="flex items-center gap-3 px-3 py-2 text-sm text-white/40 hover:text-white/70 transition-colors rounded-sm"
        >
          <ArrowLeftIcon className="w-4 h-4 shrink-0" />
          Portal público
        </Link>
      </div>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-white/40 mb-3 truncate">{userName}</p>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <LogOutIcon className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
