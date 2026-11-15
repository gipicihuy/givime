/**
 * Tipe & helper murni buat section Donghua — **tanpa** network/cheerio biar
 * aman dipakai dari client component. Scrape-nya ada di `lib/dongha.ts`
 * (server-side only, gateway dongha.id).
 */

export type DonghuaItem = {
  /** Slug series (`/donghua/<slug>`). */
  slug: string;
  title: string;
  cover: string | null;
  /** "ONA" / "TV" / "Movie" */
  type: string;
  /** Label kecil di poster: "Ep 16", "12 Ep", "S2" */
  epLabel: string | null;
  /** "Ongoing" / "Completed" */
  status: string | null;
  /** Selalu "Sub" buat sumber ini. */
  sub: string | null;
  /** Kartu episode langsung ke player (`/donghua/watch/<episodeId>`). */
  href?: string;
  /** Kompatibilitas tipe lama — selalu false di sumber ini. */
  isEpisode: boolean;
};

export type DonghuaEpisodeItem = {
  /** UUID episode (dipakai di `/donghua/watch/<id>`). */
  slug: string;
  number: string | null;
  /** Label lengkap, mis. "S1 E12" kalau series punya banyak season. */
  label?: string | null;
  title: string;
  date: string | null;
};

export type DonghuaVideo = {
  id: string;
  quality: string | null;
  /** HLS (m3u8) kalau ada, kalau nggak mp4. */
  url: string;
  downloadUrl?: string | null;
  isDubbed?: boolean;
  fileSize?: number | null;
};

export type DonghuaSubtitle = {
  id: string;
  language: string | null;
  label: string;
  /** URL proxy VTT di app ini (butuh auth gateway di server). */
  url: string;
  isDefault?: boolean;
};

/** Server embed — dipertahankan buat tipe lama, sumber baru pakai video HLS. */
export type DonghuaServer = { label: string; embed: string };

/** "…-episode-130-subtitle-indonesia" → true (slug episode sumber lama). */
export function isEpisodeSlug(slug: string): boolean {
  return /-episode-\d+/.test(slug);
}

/** Slug detail dari slug episode ("x-episode-16-tamat-…" → "x"). */
export function detailSlugOf(slug: string): string {
  const m = slug.match(/^(.*?)-episode-\d+/);
  return m ? m[1] : slug;
}

/** Tautan kartu: pakai `href` kalau ada, kalau nggak halaman detail series. */
export function itemHref(it: Pick<DonghuaItem, "slug" | "isEpisode" | "href">): string {
  if (it.href) return it.href;
  const slug = it.isEpisode ? detailSlugOf(it.slug) : it.slug;
  return `/donghua/${slug}`;
}
