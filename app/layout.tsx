import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Oswald } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Herriko Futbol Txapelketa",
    default: "Herriko Futbol Txapelketa",
  },
  description: "Torneo de fútbol veteranos de Oñati · Oñatiko futbol beteranoen txapelketa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={`${geist.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
