import Link from "next/link";
import { IconChevronRight } from "@/components/Icons";
import { SectionOrnament } from "@/components/Shelf";
import type { Genre } from "@/lib/api";

export function GenreSection({ genres }: { genres: Genre[] }) {
  if (!genres.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
          Genre
        </h2>
        <Link href="/genres" className="section-more">
          Lihat semua
          <IconChevronRight size={14} />
        </Link>
      </div>
      <div className="genre-list">
        {genres.map((g) => (
          <Link key={g.id} href={`/genre/${g.slug}`} className="genre-tag">
            {g.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
