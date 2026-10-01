import * as cheerio from "cheerio";
import {
  type DonghuaEpisodeItem,
  type DonghuaItem,
  type DonghuaServer,
  detailSlugOf,
  isEpisodeSlug,
} from "./donghua";

export {
  type DonghuaEpisodeItem,
  type DonghuaItem,
  type DonghuaServer,
  detailSlugOf,
  isEpisodeSlug,
  itemHref,
} from "./donghua";

/**
 * Parser anichin.moe (Donghua Sub Indo). Server-side aja — jangan dipanggil
 * dari client component.
 *
 * Semua tayangan diambil sebagai **embed** (iframe provider) dari halaman
 * episode: `select.mirror option` (value base64 berisi tag iframe) atau iframe
 * bawaan halaman. Gak ada resolusi mp4/m3u8 di sini — nonton lewat iframe.
 */

const BASE = "https://anichin.moe";
const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36";
const CACHE_MS = 10 * 60_000;

export type DonghuaSection = { key: string; title: string; items: DonghuaItem[] };

export type DonghuaGenre = { name: string; slug: string; count?: number };

export type DonghuaHome = { sections: DonghuaSection[]; genres: DonghuaGenre[] };

export type DonghuaListPage = {
  items: DonghuaItem[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  title: string | null;
  /** Genre archive: total halaman dari `.pagination` (list lain gak nunjukin total) */
  totalPages: number | null;
};

export type DonghuaDetail = {
  slug: string;
  title: string;
  altTitle: string | null;
  cover: string | null;
  synopsis: string;
  info: { label: string; value: string }[];
  genres: DonghuaGenre[];
  episodes: DonghuaEpisodeItem[];
  latest: DonghuaEpisodeItem | null;
  totalEpisodes: number | null;
};

export type DonghuaEpisodePage = {
  slug: string;
  title: string;
  /** Judul seri (judul episode dibersihin dari "Episode N …") — buat history */
  seriesTitle: string;
  number: string | null;
  cover: string | null;
  /** Slug detail dari tombol "Semua Episode" (fallback: pangkas "-episode-N…") */
  detailSlug: string | null;
  /** Urutan mentah halaman (server unggulan dipilih `pickBestServer`) */
  servers: DonghuaServer[];
  prev: { slug: string; label: string } | null;
  next: { slug: string; label: string } | null;
};

type Cache<T> = { at: number; data: T };

const homeCache = new Map<string, Cache<DonghuaHome>>();
const listCache = new Map<string, Cache<DonghuaListPage>>();
const searchCache = new Map<string, Cache<DonghuaItem[]>>();
const detailCache = new Map<string, Cache<DonghuaDetail>>();
const episodeCache = new Map<string, Cache<DonghuaEpisodePage>>();
const bestCache = new Map<string, Cache<DonghuaServer | null>>();

function cacheGet<T>(map: Map<string, Cache<T>>, key: string): T | null {
  const hit = map.get(key);
  return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
}

function cacheSet<T>(map: Map<string, Cache<T>>, key: string, data: T) {
  if (map.size > 60) map.clear();
  map.set(key, { at: Date.now(), data });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tSignal(ms: number): AbortSignal {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return new AbortController().signal;
  }
}

async function fetchDoc(path: string, tries = 3): Promise<{ html: string; url: string }> {
  const url = path.startsWith("http") ? path : BASE + path;
  let last: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9",
          referer: `${BASE}/`,
        },
        cache: "no-store",
        signal: tSignal(15_000),
      });
      if (res.ok) return { html: await res.text(), url: res.url || url };
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e;
    }
    if (i < tries - 1) await sleep(500 + i * 500);
  }
  throw new Error(`anichin ${last instanceof Error ? last.message : last}`);
}

async function fetchHtml(path: string, tries = 3): Promise<string> {
  return (await fetchDoc(path, tries)).html;
}

/**
 * Slug yang gak ada di anichin di-redirect balik ke home (HTTP 200, bukan 404).
 * `path` yang diminta home sendiri gak dianggap redirect.
 */
function redirectedHome(path: string, finalUrl: string): boolean {
  try {
    const want = new URL(path, BASE);
    if (want.pathname === "/" || want.pathname === "") return false;
    const got = new URL(finalUrl, BASE);
    const p = got.pathname.replace(/\/+$/, "") || "/";
    return p === "/" || /\/index\.(php|html)$/i.test(p);
  } catch {
    return false;
  }
}

function absUrl(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s || s.startsWith("data:")) return null;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return BASE + s;
  return `${BASE}/${s}`;
}

function slugOf(href: string): string {
  return href
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeEpisodeSlug(path: string): string {
  return slugOf(path);
}

/** Kartu `article.bs` (homepage box, katalog, genre, hasil search). */
function parseCard($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): DonghuaItem | null {
  const root = $(el);
  const a = root.is("a.tip") ? root : root.find("a.tip").first();
  const href = a.attr("href") || "";
  if (!href || !href.startsWith("/")) return null;
  const slug = normalizeEpisodeSlug(href);
  if (!slug) return null;

  const title =
    a.attr("title") ||
    a.find(".tt").text() ||
    a.find("h2").text() ||
    a.find(".ttl").text() ||
    "";
  const img = a.find("img").first();
  const cover = absUrl(img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src"));

  return {
    slug,
    title: title.replace(/\s+/g, " ").trim(),
    cover,
    type: a.find(".typez").text().trim(),
    epLabel: a.find(".epx").text().trim() || null,
    status: a.find(".status").text().trim() || null,
    sub: a.find(".sb").text().trim() || null,
    isEpisode: isEpisodeSlug(slug),
  };
}

function parseCards($: cheerio.CheerioAPI, scope: string): DonghuaItem[] {
  const out: DonghuaItem[] = [];
  const seen = new Set<string>();
  $(`${scope} article.bs`).each((_, el) => {
    const it = parseCard($, el);
    if (it && !seen.has(it.slug)) {
      seen.add(it.slug);
      out.push(it);
    }
  });
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Box homepage — urutan & judul ngikut anichin.moe (Terpopuler, Rilisan, Movie, …). */
async function scrapeHomeSections($: cheerio.CheerioAPI): Promise<DonghuaSection[]> {
  const sections: DonghuaSection[] = [];
  $(".bixbox").each((_, el) => {
    const box = $(el);
    const title = box
      .find("h2, h3")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (!title || /blog/i.test(title)) return;
    const items: DonghuaItem[] = [];
    const seen = new Set<string>();
    box.find("article.bs").each((__, card) => {
      const it = parseCard($, card);
      if (it && !seen.has(it.slug)) {
        seen.add(it.slug);
        items.push(it);
      }
    });
    if (!items.length) return;
    sections.push({ key: slugify(title), title, items });
  });
  return sections;
}

/** Daftar genre (halaman `/genres/`) — teks "Action 397" → name + count. */
async function scrapeGenres(): Promise<DonghuaGenre[]> {
  const $ = cheerio.load(await fetchHtml("/genres/"));
  const out: DonghuaGenre[] = [];
  const seen = new Set<string>();
  $("a[href^='/genres/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const slug = slugOf(href).replace(/^genres\//, "").replace(/\/page\/\d+$/, "");
    if (!slug || seen.has(slug)) return;
    const raw = $(el).text().replace(/\s+/g, " ").trim();
    const m = raw.match(/^(.*?)(?:\s+(\d+))?$/);
    const name = (m?.[1] || "").trim();
    if (!name) return;
    seen.add(slug);
    out.push({ name, slug, count: m?.[2] ? Number(m[2]) : undefined });
  });
  return out.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

/** Sections homepage + genre pills — strukturnya ngikut web anichin.moe. */
export async function fetchDonghuaHome(): Promise<DonghuaHome> {
  const key = "home";
  const cached = cacheGet(homeCache, key);
  if (cached) return cached;

  const $ = cheerio.load(await fetchHtml("/"));
  const sections = await scrapeHomeSections($);
  const genres = await scrapeGenres().catch(() => [] as DonghuaGenre[]);
  const data: DonghuaHome = { sections, genres };
  cacheSet(homeCache, key, data);
  return data;
}

function parseListPage($: cheerio.CheerioAPI, page: number, title: string | null): DonghuaListPage {
  const hpage = $(".hpage");
  const totalPages = parseTotalPages($);
  return {
    items: parseCards($, "body"),
    page,
    hasPrev: hpage.find("a.l").length > 0 || page > 1,
    hasNext: hpage.find("a.r").length > 0,
    title,
    totalPages,
  };
}

/** Genre archive nunjukin nomor halaman ("/page/40/") → total halaman. */
function parseTotalPages($: cheerio.CheerioAPI): number | null {
  let max = 0;
  $(".pagination a, .pagsele a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/\/page\/(\d+)\//);
    if (m) max = Math.max(max, Number(m[1]));
    const n = Number(($(el).text() || "").replace(/\D/g, ""));
    if (n) max = Math.max(max, n);
  });
  return max > 0 ? max : null;
}

/** Katalog "Donghua List" — `/anime/?page=N`. */
export async function fetchDonghuaCatalog(page = 1): Promise<DonghuaListPage> {
  const key = `catalog:${page}`;
  const cached = cacheGet(listCache, key);
  if (cached) return cached;

  const path = page > 1 ? `/anime/?page=${page}` : "/anime/";
  const doc = await fetchDoc(path);
  if (redirectedHome(path, doc.url)) {
    const empty: DonghuaListPage = {
      items: [],
      page,
      hasPrev: page > 1,
      hasNext: false,
      title: null,
      totalPages: null,
    };
    return empty;
  }
  const $ = cheerio.load(doc.html);
  const h1 = $("h1").first().text().replace(/\s+/g, " ").trim() || null;
  const data = parseListPage($, page, h1);
  cacheSet(listCache, key, data);
  return data;
}

/** Arsip genre — `/genres/<slug>/` + `/page/N/`. */
export async function fetchDonghuaGenre(
  genreSlug: string,
  page = 1,
): Promise<DonghuaListPage | null> {
  const key = `genre:${genreSlug}:${page}`;
  const cached = cacheGet(listCache, key);
  if (cached) return cached;

  const path = page > 1 ? `/genres/${genreSlug}/page/${page}/` : `/genres/${genreSlug}/`;
  const doc = await fetchDoc(path);
  if (redirectedHome(path, doc.url)) return null;
  const $ = cheerio.load(doc.html);
  const h1 = $("h1").first().text().replace(/\s+/g, " ").trim() || null;
  if (!h1 || !$("article.bs").length) {
    if (page <= 1) return null;
  }
  const data = parseListPage($, page, h1);
  cacheSet(listCache, key, data);
  return data;
}

/** Hasil pencarian — `/?s=<q>`. */
export async function fetchDonghuaSearch(q: string): Promise<DonghuaItem[] | null> {
  const query = q.trim();
  if (!query) return [];
  const key = query.toLowerCase();
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  try {
    const $ = cheerio.load(await fetchHtml(`/?s=${encodeURIComponent(query)}`));
    const items = parseCards($, "body");
    cacheSet(searchCache, key, items);
    return items;
  } catch {
    return null;
  }
}

function textOf($: cheerio.CheerioAPI, sel: string): string {
  return $(sel)
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

/** Detail judul — `/slug/`. */
export async function fetchDonghuaDetail(slug: string): Promise<DonghuaDetail | null> {
  const clean = slug.replace(/^\/+|\/+$/g, "").replace(/^donghua\//, "");
  const key = clean;
  const cached = cacheGet(detailCache, key);
  if (cached) return cached;

  let $: cheerio.CheerioAPI;
  try {
    const path = `/${clean}/`;
    const doc = await fetchDoc(path);
    if (redirectedHome(path, doc.url)) return null;
    $ = cheerio.load(doc.html);
  } catch {
    return null;
  }

  const title = textOf($, "h1.entry-title");
  if (!title || /404|not found/i.test(title)) return null;

  const info: { label: string; value: string }[] = [];
  $(".infox .spe span, .spe span").each((_, el) => {
    const raw = $(el).text().replace(/\s+/g, " ").trim();
    const i = raw.indexOf(":");
    if (i <= 0) return;
    const label = raw.slice(0, i).trim();
    const value = raw.slice(i + 1).trim();
    if (label && value) info.push({ label, value });
  });

  const genres: DonghuaGenre[] = [];
  $(".genxed a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const gslug = slugOf(href).replace(/^genres\//, "");
    const name = $(el).text().replace(/\s+/g, " ").trim();
    if (gslug && name) genres.push({ name, slug: gslug });
  });

  const episodes: DonghuaEpisodeItem[] = [];
  $(".eplister a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const eslug = slugOf(href);
    if (!eslug || !isEpisodeSlug(eslug)) return;
    const num = $(el).find(".epl-num").text().trim();
    episodes.push({
      slug: eslug,
      number: num || (eslug.match(/-episode-(\d+)/)?.[1] ?? null),
      title: $(el).find(".epl-title").text().replace(/\s+/g, " ").trim() || eslug,
      date: $(el).find(".epl-date").text().trim() || null,
    });
  });

  const totalRaw =
    info.find((x) => /^episode$/i.test(x.label))?.value ??
    textOf($, ".infox .spe");
  const totalEpisodes = episodes.length
    ? episodes.length
    : Number(totalRaw?.match(/\d+/)?.[0] ?? 0) || null;

  const img = $(".thumb img").first();
  const data: DonghuaDetail = {
    slug: clean,
    title,
    altTitle: textOf($, ".alter") || null,
    cover: absUrl(img.attr("src") || img.attr("data-src")),
    synopsis: textOf($, ".entry-content p") || textOf($, ".entry-content"),
    info,
    genres,
    episodes,
    latest: episodes[0] ?? null,
    totalEpisodes,
  };
  cacheSet(detailCache, key, data);
  return data;
}

/** Value mirror option = base64 tag `<iframe …>` → src. */
function decodeEmbed(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  try {
    const html = atob(v);
    const m = html.match(/src\s*=\s*["']([^"']+)["']/i);
    return m ? absUrl(m[1]) : null;
  } catch {
    return null;
  }
}

function cleanLabel(s: string): string {
  return s
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Halaman episode — daftar server embed + prev/next. */
export async function fetchDonghuaEpisode(epSlug: string): Promise<DonghuaEpisodePage | null> {
  const clean = epSlug.replace(/^\/+|\/+$/g, "").replace(/^donghua\//, "");
  const key = clean;
  const cached = cacheGet(episodeCache, key);
  if (cached) return cached;

  let $: cheerio.CheerioAPI;
  try {
    const path = `/${clean}/`;
    const doc = await fetchDoc(path);
    if (redirectedHome(path, doc.url)) return null;
    $ = cheerio.load(doc.html);
  } catch {
    return null;
  }

  const title = textOf($, "h1.entry-title");
  if (!title || /404|not found/i.test(title)) return null;

  const servers: DonghuaServer[] = [];
  const seen = new Set<string>();
  const push = (label: string, embed: string | null) => {
    if (!embed) return;
    const url = absUrl(embed);
    if (!url || seen.has(url)) return;
    seen.add(url);
    servers.push({ label: label || hostnameOf(url) || "Server", embed: url });
  };

  $("select.mirror option").each((_, el) => {
    const label = cleanLabel($(el).text());
    const value = $(el).attr("value") || "";
    if (!value || !label || /pilih server/i.test(label)) return;
    push(label, decodeEmbed(value));
  });

  // iframe bawaan halaman (player site sendiri) kalau belum keburu ada di option
  $("iframe[src]").each((_, el) => {
    const src = absUrl($(el).attr("src"));
    push(hostnameOf(src || "") || "Player", src);
  });

  const detailHref = $(
    'a[aria-label="Semua Episode"], .naveps a[href][aria-label="Semua Episode"]',
  )
    .first()
    .attr("href");
  const navAnchor = (rel: "prev" | "next") => {
    const a = $(`.naveps a[rel="${rel}"]`).first();
    const href = a.attr("href");
    if (!href) return null;
    const slug = slugOf(href);
    if (!slug) return null;
    return {
      slug,
      label: rel === "prev" ? "Episode sebelumnya" : "Episode berikutnya",
    };
  };

  const thumb = $(".thumb img").first();
  const number = title.match(/episode\s*(\d+)/i)?.[1] ?? clean.match(/-episode-(\d+)/)?.[1] ?? null;
  const detailSlug = detailHref
    ? slugOf(detailHref)
    : isEpisodeSlug(clean)
      ? detailSlugOf(clean)
      : null;

  const data: DonghuaEpisodePage = {
    slug: clean,
    title,
    seriesTitle: title.replace(/\s*episode\s*\d+.*$/i, "").trim() || title,
    number,
    cover: absUrl(thumb.attr("src") || thumb.attr("data-src")),
    detailSlug,
    servers,
    prev: navAnchor("prev"),
    next: navAnchor("next"),
  };
  cacheSet(episodeCache, key, data);
  return data;
}

/**
 * Provider paling enak dulu: OK.ru (dicek dulu — bisa keblokir copyright),
 * Dailymotion, Dood, sisanya urutan halaman. Cocoknya against **hostname**
 * (bukan URL utuh) biar protokol/host prefix gak bikin regex lolos.
 */
const PREFERRED: RegExp[] = [
  /(^|\.)ok\.ru$/i,
  /(^|\.)dailymotion\.com$/i,
  /(^|\.)(dood|dooood|ds2play|doodstream|doodcdn|playmogo|vidloo|vidloody|d0o0d)\./i,
  /(^|\.)mega\.nz$/i,
  /(^|\.)rumble\.com$/i,
  /(^|\.)d\.tube$/i,
  /nunadrama/i,
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function rankOf(embed: string): number {
  const host = hostOf(embed);
  if (!host) return PREFERRED.length;
  const i = PREFERRED.findIndex((re) => re.test(host));
  return i < 0 ? PREFERRED.length : i;
}

function rankedServers(servers: DonghuaServer[]): DonghuaServer[] {
  return servers
    .map((s, i) => ({ s, i, r: rankOf(s.embed) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.s);
}

/** OK.ru suka nge-block per-video (copyright) → dicek sekali, hasilnya di-cache. */
async function okRuBlocked(embed: string): Promise<boolean> {
  try {
    const html = await fetchHtml(embed, 1);
    return /нарушени|заблокирован|copyright|правообладател/i.test(html);
  } catch {
    // gak keburu dicek (jaringan) → biarin, user masih bisa ganti server manual
    return false;
  }
}

/**
 * Server unggulan untuk satu halaman episode: urutan preferensi di atas,
 * OK.ru dilewati kalau embed-nya keblokir copyright.
 */
export async function pickBestServer(
  page: Pick<DonghuaEpisodePage, "slug" | "servers">,
): Promise<DonghuaServer | null> {
  if (!page.servers.length) return null;
  const key = page.slug;
  const hit = bestCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const ranked = rankedServers(page.servers);
  let best: DonghuaServer | null = ranked[0] ?? null;
  const isOkRu = (s: DonghuaServer) => /(^|\.)ok\.ru$/i.test(hostOf(s.embed));
  if (best && isOkRu(best) && (await okRuBlocked(best.embed))) {
    best = ranked.find((s) => !isOkRu(s)) ?? best;
  }
  cacheSet(bestCache, key, best);
  return best;
}

/** Urutan server buat ditampilin di player (preferensi tanpa cek blokir). */
export function orderedServers(servers: DonghuaServer[]): DonghuaServer[] {
  return rankedServers(servers);
}

/** Saran pencarian (dropdown) — slug detail biar `/donghua/<slug>` selalu valid. */
export async function suggestDonghua(
  q: string,
  limit = 8,
): Promise<
  { slug: string; title: string; cover: string | null; meta: string }[] | null
> {
  const items = await fetchDonghuaSearch(q);
  if (items === null) return null;
  const out: { slug: string; title: string; cover: string | null; meta: string }[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const slug = it.isEpisode ? detailSlugOf(it.slug) : it.slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      title: it.isEpisode
        ? it.title.replace(/\s*episode\s*\d+.*$/i, "").trim() || it.title
        : it.title,
      cover: it.cover,
      meta: [it.epLabel, it.type].filter(Boolean).join(" · ") || "Donghua",
    });
    if (out.length >= limit) break;
  }
  return out;
}
