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

let cache: { at: number; data: KomikHome } | null = null;

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(BASE + path, {
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
