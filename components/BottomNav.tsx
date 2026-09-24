"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconFilm, IconFlame, IconHome, IconSearch, IconTag } from "@/components/Icons";

const items = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/ongoing", label: "Ongoing", icon: IconFlame },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/movies", label: "Movies", icon: IconFilm },
  { href: "/genres", label: "Genre", icon: IconTag },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/ongoing") return pathname === "/ongoing" || pathname === "/completed";
  if (href === "/search") return pathname.startsWith("/search");
  if (href === "/movies") return pathname.startsWith("/movies");
  if (href === "/genres") return pathname.startsWith("/genre");
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
