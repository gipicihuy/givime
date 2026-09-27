"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook,
  IconCompass,
  IconHistory,
  IconHome,
  IconSchedule,
  IconSearch,
} from "@/components/Icons";

/**
 * Bottom = tujuan inti app (streaming pattern: Netflix/YouTube/Spotify).
 * Kategori konten (Ongoing/Movie/Genre) di dalam /browse — bukan tab sendiri.
 */
type NavItem = {
  href: string;
  label: string;
  icon: typeof IconHome;
  badge?: string;
};

const items: NavItem[] = [
  { href: "/", label: "Beranda", icon: IconHome },
  { href: "/browse", label: "Jelajah", icon: IconCompass },
  { href: "/search", label: "Cari", icon: IconSearch },
  { href: "/komik", label: "Komik", icon: IconBook, badge: "NEW" },
  { href: "/jadwal", label: "Jadwal", icon: IconSchedule },
  { href: "/history", label: "History", icon: IconHistory },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/search") return pathname.startsWith("/search");
  if (href === "/browse")
    return (
      pathname === "/browse" ||
      pathname === "/ongoing" ||
      pathname === "/completed" ||
      pathname === "/movies" ||
      pathname.startsWith("/genre")
    );
  if (href === "/komik") return pathname.startsWith("/komik");
  if (href === "/jadwal") return pathname.startsWith("/jadwal");
  if (href === "/history") return pathname.startsWith("/history");
  return false;
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah">
      {items.map((n) => {
        const Icon = n.icon;
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className="bottom-link"
            aria-label={n.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} />
            <span className="bottom-label">
              {n.label}
              {n.badge ? <span className="bottom-new">{n.badge}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
