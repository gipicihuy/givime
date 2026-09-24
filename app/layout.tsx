import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { SearchBox } from "@/components/SearchBox";
import { IconFilm } from "@/components/Icons";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden>
                <IconFilm size={16} />
              </span>
              Givime
            </Link>
            <div className="header-spacer" />
            <SearchBox />
          </div>
        </header>
        <main className="shell main">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
