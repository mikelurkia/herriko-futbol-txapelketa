# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

There are no tests. No test runner is configured.

## Architecture

**Herriko Futbol Txapelketa** — a bilingual (Spanish/Basque) tournament management portal for a veteran football league. Built with Next.js App Router + Supabase.

### Route structure

All routes are prefixed with `[locale]` (`es` or `eu`). Three route groups:

- `(auth)` — `/login`, `/recuperar` (public)
- `(public)` — standings, matches, teams, players, news (public, read-only)
- `(dashboard)/admin/*` — full CRUD management, protected by admin role check in `admin/layout.tsx`
- `(dashboard)/equipo/[id]/*` — team manager views (protected)

### i18n

Uses **next-intl** (v4). The plugin is configured in `next.config.ts`; routing in `i18n/routing.ts` (locales: `es`, `eu`, default: `es`). Translation messages live in `messages/{es,eu}.json`.

Use `getTranslations()` in Server Components and `useTranslations()` in Client Components. Navigation helpers (`Link`, `redirect`, `useRouter`, `usePathname`) come from `@/i18n/navigation`, not `next/navigation`.

### Supabase

Two clients — never mix them:

- `lib/supabase/server.ts` — async `createClient()` using `@supabase/ssr` with cookie store. Use in Server Components, Server Actions, and Route Handlers.
- `lib/supabase/client.ts` — sync `createClient()` for Client Components only.

Auth is session-based (cookies). The admin layout (`admin/layout.tsx`) performs the auth guard: calls `supabase.auth.getUser()` then checks the `users` table for `role === 'admin'`, redirecting to `/login` if either fails.

### Database schema

Key tables and relationships (all in `supabase/migrations/001_schema.sql`):

- `seasons` → `season_teams` (season + team join, also links a manager `user`)
- `season_teams` → `player_registrations` (player + season_team join, has `jersey_number`, `is_active`)
- `season_teams` → `group_teams` → `groups` (group stage organisation)
- `matches` (references `season_teams` for home/away, self-references `next_match_id` for bracket)
- `match_events` (goals, yellow/red cards per match)
- `sanctions` (tracks suspensions, computed from match events)
- `publications` (news, bilingual: `title_es`, `title_eu`, `body_es`, `body_eu`)

TypeScript types are in `types/database.types.ts` (Supabase-generated — regenerate with `supabase gen types` if schema changes).

### Server Actions pattern

All mutations use Server Actions (`"use server"` files co-located with their page). Standard shape:

```ts
type State = { error?: string; success?: boolean } | null;

export async function myAction(_prev: State, formData: FormData): Promise<State> {
  const parsed = schema.safeParse({ field: formData.get("field") });
  if (!parsed.success) return { error: "..." };

  const supabase = await createClient();
  const { error } = await supabase.from("table").insert(parsed.data);
  if (error) return { error: "..." };

  revalidatePath("/es/admin/route");
  revalidatePath("/eu/admin/route");
  return { success: true };
}
```

Always `revalidatePath` for **both locales** after mutations. Validation uses **Zod v4**.

Client components hook into actions with `useActionState`. Sheets close on `state?.success` via `useEffect`.

### UI components

Built on **Base UI** (`@base-ui/react`) primitives wrapped with **CVA** variants — not Radix. Components live in `components/ui/`. Available: `Button` (variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-sm`, `icon-xs`, `icon-lg`), `Input`, `Label`, `Sheet`.

Panels/drawers use `Sheet` from `@/components/ui/sheet`. There is no `Dialog`/`AlertDialog` component — use inline two-step confirmation patterns instead.

Icons from **Lucide React**.

### Styling

**Tailwind CSS v4** (PostCSS plugin, not CLI). Custom design tokens defined in `app/globals.css` under `@theme inline`:

- `--color-pitch` (`#0F1923`) — dark navy, used for primary text/headings
- `--color-gol` (`#E63222`) — Basque red, primary accent
- `--color-grass` (`#2D6A4F`) — green
- `--color-stone` (`#F5F4F0`) — warm off-white, table row backgrounds
- `--color-dust` (`#6B7280`) — muted gray, secondary text

Display headings use `font-family: var(--font-display)` (Oswald). Body uses Geist. Border radius is 0.25rem (sharp, scoreboard aesthetic).

### File uploads

Shields (team logos) and player photos go to Supabase Storage. Upload pattern in `admin/equipos/actions.ts`: convert `File` to `ArrayBuffer`, upload with `upsert: true`, append `?v=${Date.now()}` to bust CDN cache.
