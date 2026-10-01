/**
 * Tipe & helper murni buat section Donghua — **tanpa** network/cheerio biar
 * aman dipakai dari client component. Scrape-nya ada di `lib/anichin.ts`
 * (server-side only).
 */

export type DonghuaItem = {
  /** Path upstream tanpa slash — slug detail ("apotheosis") atau slug episode ("…-episode-16-…"). */
  slug: string;
  title: string;
  cover: string | null;
  /** "Donghua" (`.typez`) */
  type: string;
  /** Teks mentah `.epx`: "Ep 16" / "Completed" / "Movie" */
  epLabel: string | null;
  /** Teks mentah `.status`: "Ongoing" / "Completed" */
  status: string | null;
  /** "Sub" (`.sb`) */
  sub: string | null;
  /** Kartu episode → tautan lokal langsung ke player */
  isEpisode: boolean;
};

export type DonghuaEpisodeItem = {
  slug: string;
  number: string | null;
  title: string;
  date: string | null;
};

export type DonghuaServer = { label: string; embed: string };

/** "…-episode-130-subtitle-indonesia" → true (kartu langsung ke player). */
export function isEpisodeSlug(slug: string): boolean {
  return /-episode-\d+/.test(slug);
}

/** Slug detail dari slug episode ("x-episode-16-tamat-…" → "x"). */
export function detailSlugOf(slug: string): string {
  const m = slug.match(/^(.*?)-episode-\d+/);
  return m ? m[1] : slug;
}

/** Tautan lokal kartu: episode → player, selain itu → detail. */
export function itemHref(it: Pick<DonghuaItem, "slug" | "isEpisode">): string {
  return it.isEpisode ? `/donghua/watch/${it.slug}` : `/donghua/${it.slug}`;
}
