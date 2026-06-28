import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="w-full max-w-sm">
      {/* Tournament identity */}
      <div className="mb-10 text-center">
        <div
          className="inline-block mb-3 px-2 py-0.5 text-xs uppercase tracking-widest text-white font-semibold"
          style={{ background: "var(--color-gol)" }}
        >
          Oñati
        </div>
        <h1
          className="text-4xl font-bold uppercase leading-none tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
        >
          Herriko
          <br />
          Futbol
          <br />
          Txapelketa
        </h1>
      </div>

      {/* Login card */}
      <div className="bg-white border border-border p-6 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-[var(--color-dust)] mb-6">
          Acceso gestores · Kudeatzaileak
        </p>
        <LoginForm locale={locale} />
      </div>
    </div>
  );
}
