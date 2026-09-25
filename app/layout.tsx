import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { IconFilm } from "@/components/Icons";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://givime.dpdns.org"),
  title: {
    default: "Givime — daftar & tonton anime",
    template: "%s · Givime",
  },
  description: "Browse anime ongoing, completed, movie. Cari judul, buka episode, putar video.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Givime",
    title: "Givime — daftar & tonton anime",
    description: "Browse anime ongoing, completed, movie. Cari judul, buka episode, putar video.",
    url: "https://givime.dpdns.org",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Givime" }],
  },
  twitter: {
    card: "summary",
    title: "Givime — daftar & tonton anime",
    description: "Browse anime ongoing, completed, movie. Cari judul, buka episode, putar video.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${sans.variable} ${display.variable} min-h-screen antialiased`}>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden>
                <IconFilm size={16} />
              </span>
              <span className="logo-word">Givime</span>
            </Link>
          </div>
        </header>
        <main className="shell main">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
