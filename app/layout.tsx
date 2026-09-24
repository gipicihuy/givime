import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { IconFilm } from "@/components/Icons";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Givime — daftar & tonton anime",
    template: "%s · Givime",
  },
  description: "Browse anime ongoing, completed, movie. Cari judul, buka episode, putar video.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${sans.variable} min-h-screen antialiased`}>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden>
                <IconFilm size={16} />
              </span>
              Givime
            </Link>
          </div>
        </header>
        <main className="shell main">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
