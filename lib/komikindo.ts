import * as cheerio from "cheerio";

/**
 * Parser komikindo.ch (Manga · Manhwa · Manhua). Server-side aja — jangan
 * dipanggil dari client component.
 */

const BASE = "https://komikindo.ch";
const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36";
const CACHE_MS = 10 * 60_000;

export type KomikItem = {
  slug: string;
  title: string;
  href: string;
  image: string | null;
  /** Manga / Manhwa / Manhua ("" kalau gak ada) */
  type: string;
  /** Contoh "Ch. 914" */
  chapter: string;
  rating: string;
};

export type KomikHome = {
  popular: KomikItem[];
  latest: KomikItem[];
};

export type KomikChapter = {
  /** "68" — teks tag <chapter> */
  label: string;
  href: string;
  date: string;
};

export type KomikDetail = {
  slug: string;
  title: string;
  image: string | null;
  rating: string;
  synopsis: string;
  genres: { name: string; slug: string }[];
  info: { label: string; value: string }[];
  chapters: KomikChapter[];
};

export type KomikReader = {
  detail: KomikDetail;
  chapter: KomikChapter;
  title: string;
  images: string[];
  prev: KomikChapter | null;
  next: KomikChapter | null;
};

let cache: { at: number; data: KomikHome } | null = null;
const detailCache = new Map<string, { at: number; data: KomikDetail }>();
const readerCache = new Map<string, { at: number; images: string[]; title: string }>();
const searchCache = new Map<string, { at: number; data: KomikItem[] }>();

const INFO_LABELS = ["Status", "Pengarang", "Jenis Komik", "Dirilis", "Terakhir Diupdate"];

function cacheGet<T>(map: Map<string, { at: number; data: T }>, key: string): T | null {
  const hit = map.get(key);
  return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
}

function cacheSet<T>(map: Map<string, { at: number; data: T }>, key: string, data: T) {
  if (map.size > 40) map.clear();
  map.set(key, { at: Date.now(), data });
}

async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html",
      "accept-language": "id-ID,id;q=0.9",
      referer: `${BASE}/`,
    },
  });
  if (!res.ok) throw new Error(`komikindo ${res.status}`);
  return res.text();
}

/** Gambar widget WP diresize (-197x319.jpg) → strip buat versi penuh. */
function fullRes(url?: string | null): string | null {
  return url ? url.replace(/-\d+x\d+(\.\w+)$/, "$1") : null;
}

function slugOf(href: string): string {
  const m = href.match(/\/komik\/([^/]+)\/?$/);
  return m ? m[1] : href;
}

/** Segmen terakhir URL chapter (mis. "magic-emperor-chapter-914"). */
export function chapterSlugOf(href: string): string {
  return href.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() || "";
}

function parseCards($: cheerio.CheerioAPI, widgetSelector: string): KomikItem[] {
  const out: KomikItem[] = [];
  $(`${widgetSelector} .animepost`).each((_, el) => {
    const $el = $(el);
    const anchor = $el.find("a[rel=bookmark]").first();
    const href = anchor.attr("href");
    const title =
      $el.find(".tt h3 a").first().text().trim() ||
      $el.find(".tt h3").first().text().trim() ||
      (anchor.attr("title") || "").replace(/^Komik\s+/i, "").trim();
    if (!href || !title) return;
    out.push({
      slug: slugOf(href),
      title,
      href,
      image: fullRes($el.find(".limit img, .limietles img").first().attr("src")),
      type: ($el.find(".typeflag").attr("class") || "").replace("typeflag", "").trim(),
      chapter: $el.find(".lsch a").first().text().trim(),
      rating:
        $el.find(".rating i").first().text().trim() ||
        $el.find(".info-skroep .flex-skroep").first().text().trim(),
    });
  });
  return out;
}

export async function fetchKomikHome(): Promise<KomikHome | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const $ = cheerio.load(await fetchHtml("/"));
    const data: KomikHome = {
      popular: parseCards($, ".post-show.mangapopuler").slice(0, 12),
      latest: parseCards($, ".post-show.chapterbaru").slice(0, 12),
    };
    if (!data.popular.length && !data.latest.length) throw new Error("empty parse");
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}

function parseDetail($: cheerio.CheerioAPI, slug: string): KomikDetail {
  const info: { label: string; value: string }[] = [];
  $(".spe span").each((_, el) => {
    const b = $(el).find("b").first();
    if (!b.length) return;
    const label = b.text().replace(/[:：]\s*$/, "").trim();
    if (!INFO_LABELS.includes(label)) return;
    const value = $(el).text().replace(b.text(), "").trim();
    if (value) info.push({ label, value });
  });

  const genres: { name: string; slug: string }[] = [];
  $(".genre-info a").each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr("href") || "";
    const m = href.match(/\/genres\/([^/]+)\/?$/);
    if (name && m) genres.push({ name, slug: m[1] });
  });

  const chapters: KomikChapter[] = [];
  $("#chapter_list li").each((_, el) => {
    const $el = $(el);
    const label = $el.find("chapter").first().text().trim();
    const href = $el.find("a").first().attr("href");
    if (label && href) {
      chapters.push({ label, href, date: $el.find(".dt a").first().text().trim() });
    }
  });

  const title = $(".entry-title")
    .first()
    .text()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^Komik\s+/i, "");

  return {
    slug,
    title,
    image: fullRes($(".thumb img").first().attr("src")),
    rating: $(".archiveanime-rating i, .ratingmanga i").first().text().trim(),
    synopsis: $(".entry-content-single p, .desc .entry-content p")
      .first()
      .text()
      .trim()
      .replace(/\s+/g, " "),
    genres,
    info,
    chapters,
  };
}

export async function fetchKomikSearch(q: string): Promise<KomikItem[] | null> {
  const key = q.trim().toLowerCase();
  if (!key) return [];
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  try {
    const $ = cheerio.load(await fetchHtml(`/?s=${encodeURIComponent(q)}`));
    let items = parseCards($, ".search-results");
    if (!items.length) items = parseCards($, "");
    items = items.slice(0, 24);
    if (searchCache.size > 40) searchCache.clear();
    searchCache.set(key, { at: Date.now(), data: items });
    return items;
  } catch {
    return null;
  }
}

export async function fetchKomikDetail(slug: string): Promise<KomikDetail | null> {
  const hit = cacheGet(detailCache, slug);
  if (hit) return hit;
  try {
    const $ = cheerio.load(await fetchHtml(`/komik/${slug}/`));
    const data = parseDetail($, slug);
    if (!data.title || !data.chapters.length) throw new Error("empty detail");
    cacheSet(detailCache, slug, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchKomikReader(
  slug: string,
  chSlug: string,
): Promise<KomikReader | null> {
  try {
    const detail = await fetchKomikDetail(slug);
    if (!detail) return null;
    const idx = detail.chapters.findIndex((c) => chapterSlugOf(c.href) === chSlug);
    if (idx < 0) return null;
    const chapter = detail.chapters[idx];

    let cached = readerCache.get(chapter.href);
    if (!cached || Date.now() - cached.at >= CACHE_MS) {
      const $ = cheerio.load(await fetchHtml(chapter.href));
      const images: string[] = [];
      $("#chimg-auh img").each((_, el) => {
        const src = ($(el).attr("src") || "").trim();
        if (src && !src.includes("blogger") && !src.includes("google")) images.push(src);
      });
      if (!images.length) throw new Error("empty images");
      const title = $(".entry-title")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^Komik\s+/i, "");
      if (readerCache.size > 30) readerCache.clear();
      cached = { at: Date.now(), images, title };
      readerCache.set(chapter.href, cached);
    }

    return {
      detail,
      chapter,
      title: cached.title,
      images: cached.images,
      // urutan daftar = terbaru dulu → "prev" (lebih tua) di index bawah
      prev: detail.chapters[idx + 1] ?? null,
      next: detail.chapters[idx - 1] ?? null,
    };
  } catch {
    return null;
  }
}
