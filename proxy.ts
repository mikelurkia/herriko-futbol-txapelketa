import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameWithoutLocale = pathname.replace(/^\/(es|eu)/, "") || "/";
  const isAdminRoute = pathnameWithoutLocale.startsWith("/admin");
  const isEquipoRoute = pathnameWithoutLocale.startsWith("/equipo");
  const isProtectedRoute = isAdminRoute || isEquipoRoute;

  const intlResponse = intlMiddleware(request);

  if (!isProtectedRoute) {
    return intlResponse;
  }

  const response = intlResponse ?? NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const locale = pathname.match(/^\/(es|eu)/)?.[1] ?? routing.defaultLocale;

  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
