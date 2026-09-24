import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SearchBox } from "@/components/SearchBox";
import { IconFilm, IconGrid, IconHome, IconLayers, IconTag } from "@/components/Icons";
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

const nav = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/ongoing", label: "Ongoing", icon: IconLayers },
  { href: "/completed", label: "Completed", icon: IconGrid },
  { href: "/movies", label: "Movies", icon: IconFilm },
  { href: "/genres", label: "Genres", icon: IconTag },
];

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
            <nav className="nav" aria-label="Utama">
              {nav.map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.href} href={n.href} className="nav-link">
                    <Icon size={14} />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <SearchBox />
          </div>
        </header>
        <main className="shell main">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <span>Givime</span>
            <span className="muted">Data dari karanime.com · untuk belajar saja</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
