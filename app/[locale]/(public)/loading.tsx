export default function PublicLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-8 w-48 bg-[var(--color-stone)] mb-2" />
      <div className="h-4 w-32 bg-[var(--color-stone)] mb-6" />
      <div className="bg-white border border-border divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-11 bg-[var(--color-stone)]/40" />
        ))}
      </div>
    </div>
  );
}
