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

export type SuggestItem = {
  slug: string;
  title: string;
  cover?: string;
  totalEps?: number;
  score?: string;
  status?: string;
};

const SUGGEST_FIELDS = [
  "id",
  "slug",
  "title",
  "featured_media",
  "meta_box.ero_image",
  "meta_box.ero_episode",
  "meta_box.ero_episodebaru",
  "meta_box.ero_skor",
  "meta_box.ero_status",
].join(",");

async function maxCdnEp(slug: string): Promise<number> {
  try {
    const full = await api<Anime[]>("/animes", { slug }, 3600);
    const a = Array.isArray(full) ? full[0] : null;
    if (!a) return 0;
    const eps = sortEps(metaOf(a).ab_cdngroup ?? []);
    let max = 0;
    for (const e of eps) {
      const n = epNum(String(e.ab_namaep));
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
  } catch {
    return 0;
  }
}

/** Cari buat dropdown suggest: hydrate by slug biar cover + total Eps keisi. */
export async function suggestAnime(q: string, limit = 8): Promise<SuggestItem[]> {
  const term = q.trim();
  if (!term) return [];
  try {
    const r = await apiFull<Anime[]>(
      "/animes",
      { search: term, page: 1, per_page: limit, _fields: SUGGEST_FIELDS },
      60,
    );
    const hits = r.body ?? [];
    if (!hits.length) return [];

    const items = await Promise.all(
      hits.map(async (hit): Promise<SuggestItem | null> => {
        try {
          // Wajib hydrate: search kadang balikin slug hantu (404 di detail)
          let full: Anime | null = null;
          if (hit.slug) {
            for (const cand of slugCandidates(hit.slug)) {
              try {
                const bySlug = await api<Anime[]>(
                  "/animes",
                  { slug: cand, _fields: SUGGEST_FIELDS },
                  600,
                );
                if (bySlug?.[0]) {
                  full = bySlug[0];
                  break;
                }
              } catch {
                // coba kandidat berikutnya
              }
            }
          }
          if (!full || !full.slug) return null;

          const a = full;
          const mb = metaOf(a);
          let cover = mb.ero_image || undefined;
          if (!cover) {
            const fb = await coverFromFeatured(a);
            cover = fb.ero_image || undefined;
          }

          let totalEps = 0;
          const label = episodeLabel(a);
          if (label) {
            const n = Number(label);
            if (Number.isFinite(n) && n > 0) totalEps = n;
          }
          if (!totalEps) {
            totalEps = await maxCdnEp(a.slug);
          }

          return {
            slug: a.slug,
            title: titleOf(a),
            cover,
            totalEps: totalEps || undefined,
            score: mb.ero_skor || undefined,
            status: mb.ero_status || undefined,
          };
        } catch {
          return null;
        }
      }),
    );
    return items.filter((x): x is SuggestItem => x != null);
  } catch {
    return [];
  }
}

function buildUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url;
}

/** Parse JSON; throw kalau body non-JSON (origin kadang balikin HTML activation error). */
async function readJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Non-JSON from ${label}: ${text.slice(0, 60).replace(/\s+/g, " ")}`,
    );
  }
}

/**
 * GET JSON. Origin karanime intermittent (HTML “Product activation error”,
 * HTTP 200) → retry tanpa cache sebelum menyerah.
 */
async function fetchJson<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  revalidate = 300,
): Promise<{ data: T; res: Response }> {
  const url = buildUrl(path, params);
  const label = url.pathname + url.search.slice(0, 40);
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "givime-web/1.0" },
        // attempt 0: Next data cache; retry: no-store biar HTML error gak nempel
        ...(attempt === 0
          ? { next: { revalidate } as { revalidate: number } }
          : { cache: "no-store" as const }),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} for ${label}`);
        continue;
      }
      const ct = res.headers.get("content-type") || "";
      const data = await readJson<T>(res, label);
      if (ct && !ct.includes("json") && typeof data !== "object") {
        lastErr = new Error(`Unexpected content-type ${ct} for ${label}`);
        continue;
      }
      return { data, res };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function api<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  revalidate = 300,
): Promise<T> {
  return (await fetchJson<T>(path, params, revalidate)).data;
}

async function apiFull<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  revalidate = 300,
): Promise<{ body: T; total: number | null; totalPages: number | null }> {
  const { data, res } = await fetchJson<T>(path, params, revalidate);
  return {
    body: data,
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
  const raw = mb.ero_episode ?? mb.ero_episodebaru;
  if (raw == null || raw === "") return "";
  const n = Number(raw);
  //99999 = placeholder ongoing panjang (mis. One Piece) — jangan tampilkan
  if (!Number.isFinite(n) || n >= 99999) return "";
  return String(raw);
}

/**
 * List query ga bawa ab_cdngroup; label 99999 disembunyikan.
 * Fetch detail buat item tanpa label valid → patch ero_episode = max nomor CDN.
 */
async function hydrateEpCounts(items: Anime[]): Promise<Anime[]> {
  const need = items.filter((a) => !episodeLabel(a) && a.slug);
  if (!need.length) return items;

  const patched = await Promise.all(
    items.map(async (a) => {
      if (episodeLabel(a) || !a.slug) return a;
      try {
        const full = await getDetail(a.slug);
        if (!full) return a;
        const eps = sortEps(metaOf(full).ab_cdngroup ?? []);
        let max = 0;
        for (const e of eps) {
          const n = epNum(String(e.ab_namaep));
          if (Number.isFinite(n) && n > max) max = n;
        }
        if (max <= 0) return a;
        return { ...a, meta_box: { ...metaOf(a), ero_episode: String(max) } };
      } catch {
        return a;
      }
    }),
  );
  return patched;
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

/** Ambil nomor episode dari label ("542 Part 1" → 542, "227 - 228" → 227). */
function epNum(label: string): number {
  const m = label.match(/\d+/);
  return m ? Number(m[0]) : Number.NaN;
}

export function sortEps(eps: Episode[] = []): Episode[] {
  const seen = new Set<string>();
  const unique: Episode[] = [];
  for (const e of eps) {
    const key = String(e.ab_namaep);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  return unique.sort((a, b) => {
    const na = epNum(String(a.ab_namaep));
    const nb = epNum(String(b.ab_namaep));
    const aN = Number.isNaN(na);
    const bN = Number.isNaN(nb);
    if (aN && bN) return 0;
    if (aN) return 1;
    if (bN) return -1;
    return na - nb;
  });
}

/**
 * Slug kandidat kalau search balikin “slug hantu”:
 *   haikyuu-season-2-episode-1 → haikyuu-season-2
 *   kimetsu-…-yuukaku-hen-season-2 → kimetsu-…-yuukaku-hen
 *   one-piece-episode-0        → one-piece
 */
function slugCandidates(slug: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  add(slug);

  const strips: Array<(s: string) => string> = [
    (s) => s.replace(/-episode-\d+$/i, ""),
    (s) => s.replace(/-season-\d+$/i, ""),
    (s) => s.replace(/-part-\d+$/i, ""),
    (s) => s.replace(/-\d+$/, ""),
    (s) => s.replace(/-(episode|season|part)-\d+$/i, ""),
  ];

  let frontier = [slug];
  for (let depth = 0; depth < 3; depth++) {
    const next: string[] = [];
    for (const s of frontier) {
      for (const strip of strips) {
        const t = strip(s);
        if (t && t !== s && !seen.has(t)) {
          add(t);
          next.push(t);
        }
      }
    }
    if (!next.length) break;
    frontier = next;
  }
  return out;
}

/**
 * Hydrate per-item (parallel, index-aligned dengan `items`).
 * - sukses → Anime dengan slug/id asli (bisa beda dari search slug)
 * - semua kandidat slug kosong → null (ghost beneran)
 */
async function hydrateBySlug(items: Anime[]): Promise<(Anime | null)[]> {
  if (!items.length) return [];
  return Promise.all(
    items.map(async (s) => {
      if (!s.slug) return s;
      try {
        let full: Anime | null = null;
        for (const cand of slugCandidates(s.slug)) {
          const arr = await api<Anime[]>("/animes", { slug: cand, _fields: LIST_FIELDS }, 600);
          const hit = Array.isArray(arr) ? arr[0] : null;
          if (hit) {
            full = hit;
            break;
          }
        }
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
        // network error → keep search row
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
  const items = await hydrateEpCounts(r.body ?? []);
  return { items, total: r.total, totalPages: r.totalPages };
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

  // hydrate index-aligned — JANGAN key map pakai slug hasil re-map
  // (bug: lookup slug search asli vs key slug final → semua remap di-drop)
  const toHydrate = merged.filter((item) => !(pinned && item === pinned));
  const hydAligned = await hydrateBySlug(toHydrate);

  const hydrated: Anime[] = [];
  const seenFinal = new Set<string>();
  const pushUnique = (item: Anime) => {
    const k = item.slug || String(item.id);
    if (seenFinal.has(k)) return;
    seenFinal.add(k);
    hydrated.push(item);
  };

  if (pinned) pushUnique(pinned);

  for (const final of hydAligned) {
    if (!final) continue;
    pushUnique(final);
  }

  // sort relevansi (stable: score desc, lalu index)
  const withScore = hydrated.map((item, i) => ({
    item,
    i,
    score: scoreSearchHit(item, qNorm, qSlug),
  }));
  withScore.sort((a, b) => b.score - a.score || a.i - b.i);
  const items = await hydrateEpCounts(withScore.map((x) => x.item));

  // total = header WP (source of truth buat pager); items = setelah hydrate/dedupe
  return { items, total: raw.total, totalPages: raw.totalPages };
}

export async function getDetail(key: string): Promise<Anime | null> {
  if (/^\d+$/.test(key)) {
    try {
      const data = await api<Anime | Anime[]>(`/animes/${key}`, {}, 3600);
      return Array.isArray(data) ? data[0] ?? null : data;
    } catch {
      return null;
    }
  }

  // exact slug
  try {
    const arr = await api<Anime[]>("/animes", { slug: key }, 3600);
    if (arr?.[0]) return arr[0];
  } catch {
    // lanjut kandidat
  }

  // slug hantu search (mis. …-season-2 → …-yuukaku-hen)
  for (const cand of slugCandidates(key)) {
    if (cand === key) continue;
    try {
      const arr = await api<Anime[]>("/animes", { slug: cand }, 3600);
      if (arr?.[0]) return arr[0];
    } catch {
      // coba berikutnya
    }
  }
  return null;
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
