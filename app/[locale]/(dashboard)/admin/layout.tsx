import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

async function logoutAction(formData: FormData) {
  "use server";
  const locale = (formData.get("locale") as string) || "es";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect(`/${locale}`);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        userName={profile?.name ?? user.email ?? "Admin"}
        logoutAction={logoutAction}
        locale={locale}
      />
      <main className="flex-1 bg-[var(--color-stone)] overflow-auto">
        {children}
      </main>
    </div>
  );
}
