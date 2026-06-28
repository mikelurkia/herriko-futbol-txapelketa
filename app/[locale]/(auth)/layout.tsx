export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone px-4"
      style={{ background: "var(--color-stone)" }}>
      {children}
    </div>
  );
}
