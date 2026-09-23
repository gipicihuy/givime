export const BASE = "https://karanime.com/wp-json/wp/v2";

export const IDS = {
  status: { ongoing: 2872, completed: 2883 },
  type: { tv: 2900, movie: 2916 },
  top: { ya: 2901, tidak: 2899 },
  jadwal: {
    senin: 3058,
    selasa: 3059,
    rabu: 3061,
    kamis: 3062,
    jumat: 3063,
    sabtu: 3057,
    minggu: 3064,
    random: 3065,
  },
} as const;

export const LIST_FIELDS = [
  "id",
  "slug",
  "title",
  "date",
  "modified",
  "featured_media",
  "link",
  "animegenre",
  "animetype",
  "animestatus",
  "meta_box.ero_image",
  "meta_box.ero_episode",
  "meta_box.ero_status",
  "meta_box.ero_type",
  "meta_box.ero_skor",
  "meta_box.ero_tayang",
  "meta_box.ero_sub",
  "meta_box.ero_durasi",
  "meta_box.ero_genreapp",
  "meta_box.ero_japanese",
  "meta_box.ero_trailer",
].join(",");

export type MetaBox = {
  ero_image?: string;
  ero_episode?: string;
  ero_episodebaru?: string;
  ero_status?: string;
  ero_type?: string;
  ero_skor?: string;
  ero_tayang?: string;
  ero_sub?: string;
  ero_durasi?: string;
  ero_genreapp?: string;
  ero_japanese?: string;
  ero_trailer?: string;
  ab_cdngroup?: Episode[];
  [k: string]: unknown;
};

export type Episode = {
  ab_namaep: string;
  ab_linkcdn: string;
  _state?: string;
};

export type Anime = {
  id: number;
  slug: string;
  title: { rendered: string } | string;
  date?: string;
  modified?: string;
  link?: string;
  content?: { rendered: string };
  featured_media?: number;
  animegenre?: number[];
  animetype?: number[];
  animestatus?: number[];
  meta_box?: MetaBox | MetaBox[] | [];
};

export type ListResult = {
  items: Anime[];
  total: number | null;
  totalPages: number | null;
};

export type Genre = { id: number; name: string; slug: string; count?: number };

function buildUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url;
}

async function api<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  revalidate = 300,
): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "givime-web/1.0" },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url.pathname}`);
  }
  return res.json() as Promise<T>;
}

async function apiFull<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  revalidate = 300,
): Promise<{ body: T; total: number | null; totalPages: number | null }> {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "givime-web/1.0" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as T;
  return {
    body,
    total: Number(res.headers.get("x-wp-total")) || null,
    totalPages: Number(res.headers.get("x-wp-totalpages")) || null,
  };
}

export function titleOf(x: Anime): string {
  if (typeof x.title === "string") return x.title;
  return stripHtml(x.title?.rendered ?? "");
}

export function stripHtml(s = ""): string {
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function metaOf(x: Anime): MetaBox {
  const mb = x.meta_box;
  if (!mb || Array.isArray(mb)) return {};
  return mb as MetaBox;
}

export function episodeLabel(x: Anime): string {
  const mb = metaOf(x);
  return String(mb.ero_episode ?? mb.ero_episodebaru ?? "?");
}

export function encodeMedia(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname
      .split("/")
      .map((s) => encodeURIComponent(decodeURIComponent(s)))
      .join("/");
    return u.toString();
  } catch {
    return encodeURI(url);
  }
}

export function sortEps(eps: Episode[] = []): Episode[] {
  return [...eps].sort((a, b) => Number(a.ab_namaep) - Number(b.ab_namaep));
}

/**
 * Hydrate via slug. Balik `null` kalau post hantu
 * (muncul di search, tapi `?slug=` kosong / id 404 → detail 404).
 */
async function hydrateBySlug(items: Anime[]): Promise<(Anime | null)[]> {
  if (!items.length) return items;
  return Promise.all(
    items.map(async (s) => {
      if (!s.slug) return s;
      try {
        const arr = await api<Anime[]>("/animes", { slug: s.slug, _fields: LIST_FIELDS }, 600);
        const full = Array.isArray(arr) ? arr[0] : null;
        // ghost: search index ≠ collection — jangan tampilin card yang 404
        if (!full) return null;
        const mb = metaOf(full);
        const coverFallback = mb.ero_image ? {} : await coverFromFeatured(full);
        return {
          ...s,
          id: full.id,
          slug: full.slug,
          title: full.title,
          link: full.link,
          date: full.date,
          modified: full.modified,
          featured_media: full.featured_media,
          animegenre: full.animegenre,
          animetype: full.animetype,
          animestatus: full.animestatus,
          meta_box: { ...metaOf(s), ...mb, ...coverFallback },
        };
      } catch {
        // network error → keep search row (bukan ghost pasti)
        return s;
      }
    }),
  );
}

/** Cover dari `featured_media` → `/media/{id}` kalau `ero_image` kosong. */
async function coverFromFeatured(item: Anime): Promise<{ ero_image?: string }> {
  const fm = item.featured_media;
  if (!fm || fm === 0) return {};
  try {
    const media = await api<{ source_url?: string; media_details?: { sizes?: Record<string, { source_url?: string }> } }>(
      `/media/${fm}`,
      { _fields: "source_url,media_details.sizes.medium_large.source_url,media_details.sizes.medium.source_url,media_details.sizes.thumbnail.source_url" },
      86400,
    );
    const url =
      media.media_details?.sizes?.medium_large?.source_url ||
      media.media_details?.sizes?.medium?.source_url ||
      media.media_details?.sizes?.thumbnail?.source_url ||
      media.source_url;
    return url ? { ero_image: url } : {};
  } catch {
    return {};
  }
}

function normalizeTitle(s: string): string {
  return stripHtml(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function slugifyQuery(q: string): string {
  return normalizeTitle(q).replace(/\s+/g, "-");
}

/** Exact title > exact slug > title mulai query > urutan API. */
function scoreSearchHit(a: Anime, qNorm: string, qSlug: string): number {
  const t = normalizeTitle(titleOf(a));
  const slug = (a.slug || "").toLowerCase();
  if (t === qNorm) return 100;
  if (slug === qSlug) return 90;
  if (t.startsWith(qNorm) || qNorm.startsWith(t)) return 60;
  if (t.includes(qNorm)) return 40;
  return 0;
}

export async function getList(
  params: Record<string, string | number | undefined | null>,
  revalidate = 300,
): Promise<ListResult> {
  const r = await apiFull<Anime[]>(
    "/animes",
    { _fields: LIST_FIELDS, per_page: 12, page: 1, ...params },
    revalidate,
  );
  return { items: r.body ?? [], total: r.total, totalPages: r.totalPages };
}

export async function searchAnime(
  q: string,
  page = 1,
  limit = 12,
): Promise<ListResult> {
  if (!q.trim()) return { items: [], total: 0, totalPages: 0 };

  const qNorm = normalizeTitle(q);
  const qSlug = slugifyQuery(q);

  // 1) search standar
  const raw = await apiFull<Anime[]>(
    "/animes",
    {
      search: q,
      page,
      per_page: limit,
      _fields:
        "id,slug,title,date,modified,featured_media,link,meta_box.ero_episodebaru,meta_box.ero_seri,meta_box.ero_credit",
    },
    120,
  );

  const rawItems = raw.body ?? [];

  // 2) pin judul resmi lewat slug (WP search sering gak balikin series utama, e.g. slug=one-piece)
  let pinned: Anime | null = null;
  if (page === 1 && qSlug) {
    try {
      const bySlug = await api<Anime[]>("/animes", { slug: qSlug, _fields: LIST_FIELDS }, 300);
      pinned = bySlug?.[0] ?? null;
    } catch {
      pinned = null;
    }
  }

  const merged: Anime[] = [];
  const seen = new Set<string>();
  for (const item of pinned ? [pinned, ...rawItems] : rawItems) {
    const key = item.slug || String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  // pinned sudah LIST_FIELDS; hydrate skip slug yang sama biar dobel fetch
  const toHydrate = merged.filter((item) => !(pinned && item === pinned));
  const hydRest = (await hydrateBySlug(toHydrate)).filter((x): x is Anime => x != null);
  const hydById = new Map(hydRest.map((x) => [x.slug || String(x.id), x]));
  const hydrated = merged
    .map((item) =>
      pinned && item === pinned ? item : hydById.get(item.slug || String(item.id)) || null,
    )
    .filter((x): x is Anime => x != null);

  // sort relevansi (stable: score desc, lalu index)
  const withScore = hydrated.map((item, i) => ({
    item,
    i,
    score: scoreSearchHit(item, qNorm, qSlug),
  }));
  withScore.sort((a, b) => b.score - a.score || a.i - b.i);
  const items = withScore.map((x) => x.item);

  // total: + pin, − ghost yang dibuang di page ini
  let total = raw.total;
  const dropped = merged.length - (hydRest.length + (pinned ? 1 : 0));
  if (page === 1 && pinned && !rawItems.some((x) => x.slug === pinned!.slug) && total != null) {
    total = total + 1;
  }
  if (total != null && dropped > 0) total = Math.max(0, total - dropped);

  return { items, total, totalPages: raw.totalPages };
}

export async function getDetail(key: string): Promise<Anime | null> {
  if (/^\d+$/.test(key)) {
    const data = await api<Anime | Anime[]>(`/animes/${key}`, {}, 3600);
    return Array.isArray(data) ? data[0] ?? null : data;
  }
  const arr = await api<Anime[]>("/animes", { slug: key }, 3600);
  return arr?.[0] ?? null;
}

export async function getEpisodes(key: string): Promise<{ anime: Anime; eps: Episode[] }> {
  const anime = await getDetail(key);
  if (!anime) throw new Error("Anime tidak ditemukan");
  return { anime, eps: sortEps(metaOf(anime).ab_cdngroup ?? []) };
}

export async function getGenres(limit = 100): Promise<Genre[]> {
  return api<Genre[]>("/animegenre", { per_page: limit, orderby: "id", order: "asc" }, 86400);
}

export async function resolveGenre(slugOrId: string): Promise<Genre | null> {
  if (/^\d+$/.test(slugOrId)) {
    const all = await getGenres();
    return all.find((g) => String(g.id) === slugOrId) ?? null;
  }
  const all = await getGenres();
  return all.find((g) => g.slug === slugOrId || g.name.toLowerCase() === slugOrId.toLowerCase()) ?? null;
}

export function synopsisOf(anime: Anime, max = 280): string {
  const html = anime.content?.rendered ?? "";
  const text = stripHtml(html);
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
