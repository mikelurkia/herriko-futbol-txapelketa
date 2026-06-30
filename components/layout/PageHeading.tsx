export function PageHeading({
  title,
  subtitle,
  large = false,
}: {
  title: string;
  subtitle?: string;
  large?: boolean;
}) {
  return (
    <div className={large ? "mb-8 pb-6 border-b border-border" : "mb-6"}>
      <span
        className="inline-block mb-2 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white font-semibold"
        style={{ background: "var(--color-gol)" }}
      >
        Oñati
      </span>
      <h1
        className={`font-bold uppercase tracking-tight leading-none ${large ? "text-4xl mb-1" : "text-3xl mb-1"}`}
        style={{ fontFamily: "var(--font-display)", color: "var(--color-pitch)" }}
      >
        {title}
      </h1>
      {subtitle && <p className="text-sm text-[var(--color-dust)]">{subtitle}</p>}
    </div>
  );
}
