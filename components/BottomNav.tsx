"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCompass, IconHistory, IconHome, IconSearch } from "@/components/Icons";

/**
 * Bottom = tujuan inti app (streaming pattern: Netflix/YouTube/Spotify).
 * Kategori konten (Ongoing/Movie/Genre) di dalam /browse — bukan tab sendiri.
 */
const items = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/browse", label: "Browse", icon: IconCompass },
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
          </Link>
        );
      })}
    </nav>
  );
}
