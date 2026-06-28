import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
