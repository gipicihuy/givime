import Link from "next/link";
import { IconFilm, IconFlame, IconGrid, IconLayers, IconTag } from "@/components/Icons";

export const metadata = { title: "Browse" };

const cats = [
  {
    href: "/ongoing",
    title: "Ongoing",
    desc: "Episode yang masih tayang",
    icon: IconFlame,
  },
  {
    href: "/completed",
    title: "Completed",
    desc: "Judul yang sudah tamat",
    icon: IconGrid,
  },
  {
    href: "/movies",
    title: "Movies",
    desc: "Film anime",
    icon: IconFilm,
  },
  {
    href: "/genres",
    title: "Genres",
    desc: "Jelajah per genre",
    icon: IconTag,
  },
  {
    href: "/komik",
    title: "Komik",
    desc: "Manga, Manhwa & Manhua",
    icon: IconLayers,
  },
];

export default function BrowsePage() {
  return (
    <>
      <h1 className="page-title">Browse</h1>
      <p className="page-sub">Pilih kategori untuk menjelajah katalog</p>
      <div className="browse-grid">
        {cats.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="browse-card">
              <span className="browse-icon" aria-hidden>
                <Icon size={22} />
              </span>
              <span className="browse-body">
                <span className="browse-title">{c.title}</span>
                <span className="browse-desc">{c.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
