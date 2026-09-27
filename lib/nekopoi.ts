import * as cheerio from "cheerio";

/**
 * Parser nekopoi.care (video anime dewasa · 18+). Server-side aja —
 * jangan dipanggil dari client component.
 *
 * slug = path URL tanpa garis miring (mis. "hentai/bible-black-new-testament"
 * atau "dldss-547-…-subtitle-indonesia") biar bisa dipakai langsung buat
 * rute catch-all /hentai/[...slug].
 */

const BASE = "https://nekopoi.care";
const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36";

const LIST_MS = 5 * 60_000;
const SEARCH_MS = 2 * 60_000;
const DETAIL_MS = 3 * 60_000;
const STREAM_OK_MS = 3 * 60_000;
const STREAM_MISS_MS = 20_000;

export type HentaiItem = {
  slug: string;
  title: string;
  href: string;
  thumb: string | null;
  date: string | null;
};

export type HentaiList = {
  items: HentaiItem[];
  page: number;
  totalPages: number;
};

export type HentaiEpisode = {
  ep: number;
  title: string;
  slug: string;
  date: string | null;
};

export type StreamLink = { server: string; embedUrl: string };

export type HentaiDetail = {
  slug: string;
  title: string;
  /** poster 2:3 — ada di halaman series */
  poster: string | null;
  /** still 16:9 — ada di halaman episode */
  thumb: string | null;
  synopsis: string;
  genres: string[];
  views: string | null;
  date: string | null;
  duration: string | null;
  page: "series" | "episode";
  episodes: HentaiEpisode[];
  streams: StreamLink[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  series: { slug: string; title: string } | null;
};

export type Stream = { url: string; type: "hls" | "mp4" };

type Cache<T> = { at: number; data: T };

const listCache = new Map<number, Cache<HentaiList>>();
const searchCache = new Map<string, Cache<HentaiItem[]>>();
const detailCache = new Map<string, Cache<HentaiDetail>>();
const streamCache = new Map<string, Cache<Stream | null>>();

function cacheGet<T>(map: Map<string, Cache<T>>, key: string, ttl: number): T | null {
  const hit = map.get(key);
  return hit && Date.now() - hit.at < ttl ? hit.data : null;
}

function cacheSet<T>(map: Map<string, Cache<T>>, key: string, data: T) {
  if (map.size > 60) map.clear();
  map.set(key, { at: Date.now(), data });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "id-ID,id;q=0.9",
      referer: `${BASE}/`,
    },
  });
  if (!res.ok) throw new Error(`nekopoi ${res.status}`);
  return res.text();
}

/** Gambar WP diresize (-300x169.jpg / -210x300.jpg) → strip buat versi penuh. */
function fullRes(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.replace(/^url\((['"]?)(.*)\1\)$/i, "$2").trim();
  return clean ? clean.replace(/-\d+x\d+(\.\w+)$/, "$1") : null;
}

/** "https://nekopoi.care/hentai/judul/" → "hentai/judul" */
function pathOf(href: string): string {
  try {
    return new URL(href, BASE).pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
}

function totalPagesOf($: cheerio.CheerioAPI): number {
  let max = 1;
  $(".page-numbers").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/\/page\/(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
    const text = Number($(el).text().trim());
    if (Number.isFinite(text) && text > 0) max = Math.max(max, text);
  });
  return max;
}

function parseCards($: cheerio.CheerioAPI): HentaiItem[] {
  const out: HentaiItem[] = [];
  $("#nk-episode-grid .nk-post-card").each((_, el) => {
    const $el = $(el);
    const a = $el.find("h2 a").first();
    const href = a.attr("href");
    const title = a.text().trim();
    if (!href || !title) return;
    out.push({
      slug: pathOf(href),
      title,
      href,
      thumb: fullRes($el.find(".nk-thumb-crop").css("background-image")),
      date: $el.find(".dashicons-calendar-alt").parent().text().trim() || null,
    });
  });
  return out;
}

function parseSearchCards($: cheerio.CheerioAPI): HentaiItem[] {
  const out: HentaiItem[] = [];
  $(".nk-search-results li a.nk-search-item").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    const title = $el.find(".nk-search-info h2").first().text().trim();
    if (!href || !title) return;
    out.push({
      slug: pathOf(href),
      title,
      href,
      thumb: fullRes($el.find(".nk-search-thumb").css("background-image")),
      date: null,
    });
  });
  return out;
}

/** Halaman series: daftar episode ("Ep 3" + judul + tanggal). */
function parseEpisodes($: cheerio.CheerioAPI): HentaiEpisode[] {
  const seen = new Set<string>();
  const out: HentaiEpisode[] = [];

  $("a").each((_, a) => {
    const href = $(a).attr("href") || "";
    const m = href.match(/-episode-(\d+)/i);
    if (!m) return;

    const lines = $(a)
      .text()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length || !/^ep\b/i.test(lines[0])) return;
    if (seen.has(href)) return;
    seen.add(href);

    const slug = pathOf(href);
    if (!slug) return;
    out.push({
      ep: Number(m[1]),
      title: lines[1] || lines[0],
      slug,
      date: lines[2] || null,
    });
  });

  return out.sort((a, b) => a.ep - b.ep);
}

function navOf(
  $: cheerio.CheerioAPI,
  sel: string,
): { slug: string; title: string } | null {
  const a = $(sel).first();
  const href = a.attr("href");
  if (!href) return null;
  const slug = pathOf(href);
  if (!slug) return null;
  const title = a.text().replace(/\s+/g, " ").trim() || slug;
  return { slug, title };
}

function parseDetail($: cheerio.CheerioAPI, slug: string): HentaiDetail {
  let title = $("article h1, .entry-title, h1").first().text().trim();
  // Halaman series: h1 = "Informasi Anime  72783 kali" (judulnya di <title>)
  title = title
    .replace(/^Informasi\s+Anime\s*/i, "")
    .replace(/\s*\d+\s*kali\s*$/i, "")
    .trim();
  if (!title) {
    title = ($("title").text() || "").replace(/\s*[|–-]\s*NekoPoi\s*$/i, "").trim();
  }

  // Sinopsis: label "Sinopsis" di <p> pertama, teksnya di <p> berikutnya.
  const paras = $(".konten p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  let synopsis = "";
  const si = paras.findIndex((t) => /^sinopsis/i.test(t));
  if (si >= 0) {
    synopsis = paras[si].replace(/^sinopsis\s*[:\-]?\s*/i, "").trim();
    for (let i = si + 1; !synopsis && i < paras.length; i++) {
      if (/^(genre|producers|producer|duration|durasi|size)\s*:/i.test(paras[i])) continue;
      synopsis = paras[i];
    }
  }
  if (!synopsis) synopsis = $("meta[name=description]").attr("content") || "";

  let genres: string[] = [];
  let duration: string | null = null;
  for (const p of paras) {
    const g = p.match(/Genre\s*:\s*(.+)/i);
    if (g) {
      genres = g[1]
        .split(/,|·/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const d = p.match(/(?:Duration|Durasi)\s*:\s*(.+)/i);
    if (d) duration = d[1].trim();
  }

  const streams: StreamLink[] = [];
  $("#nk-player-tabs a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.startsWith("#nk-stream-")) return;
    const embedUrl = $(href).find("iframe").attr("src");
    if (embedUrl) streams.push({ server: $(el).text().trim(), embedUrl });
  });

  const seriesLink = $(".nk-player-series").attr("href");
  const seriesSlug = seriesLink ? pathOf(seriesLink) : "";

  let views = $(".nk-post-header-meta .dashicons-visibility").parent().text().trim();
  const date = $(".nk-post-header-meta .dashicons-calendar-alt").parent().text().trim();
  if (!views) {
    const m = $("article h1, h1").first().text().match(/(\d+)\s*kali/);
    if (m) views = `${m[1]} kali`;
  }

  const isSeries = streams.length === 0;
  const poster = fullRes($(".nk-series-poster").css("background-image"));
  const thumb = fullRes(
    $(".nk-featured-img img").first().attr("src") ||
      $("meta[property=og:image]").attr("content"),
  );

  const streamsPrimary = streams.filter((s) =>
    /streampoi\.com|streamruby\./i.test(s.embedUrl),
  );

  return {
    slug,
    title,
    poster: isSeries ? poster : null,
    thumb: isSeries ? poster : thumb,
    synopsis,
    genres,
    views: views || null,
    date: date || null,
    duration,
    page: isSeries ? "series" : "episode",
    episodes: isSeries ? parseEpisodes($) : [],
    streams: streamsPrimary.length ? streamsPrimary : streams,
    prev: navOf($, ".nk-episode-prev"),
    next: navOf($, ".nk-episode-next"),
    series: seriesSlug ? { slug: seriesSlug, title: $(".nk-player-series-title").text().trim() } : null,
  };
}

export async function fetchHentaiList(page = 1): Promise<HentaiList | null> {
  const n = Math.max(1, Math.floor(page) || 1);
  const hit = listCache.get(n);
  if (hit && Date.now() - hit.at < LIST_MS) return hit.data;
  try {
    const $ = cheerio.load(await fetchHtml(n > 1 ? `/page/${n}/` : "/"));
    const items = parseCards($);
    const data: HentaiList = { items, page: n, totalPages: totalPagesOf($) };
    if (listCache.size > 8) listCache.clear();
    listCache.set(n, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

export async function fetchHentaiSearch(q: string): Promise<HentaiItem[] | null> {
  const key = q.trim().toLowerCase();
  if (!key) return [];
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_MS) return hit.data;
  try {
    const $ = cheerio.load(await fetchHtml(`/?s=${encodeURIComponent(q)}&post_type=hentai`));
    const items = parseSearchCards($);
    if (searchCache.size > 40) searchCache.clear();
    searchCache.set(key, { at: Date.now(), data: items });
    return items;
  } catch {
    return null;
  }
}

export async function fetchHentaiDetail(slug: string): Promise<HentaiDetail | null> {
  const hit = cacheGet(detailCache, slug, DETAIL_MS);
  if (hit) return hit;
  try {
    const $ = cheerio.load(await fetchHtml(`/${slug}/`));
    const data = parseDetail($, slug);
    if (!data.title) throw new Error("empty detail");
    cacheSet(detailCache, slug, data);
    return data;
  } catch {
    return null;
  }
}

// ——— Decoder packer (Dean Edwards style) ———
// Cuma proses string, TIDAK mengeksekusi kode dari halaman remote.
function matchDelim(s: string, i: number, open: string, close: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let j = i; j < s.length; j++) {
    const ch = s[j];
    if (quote) {
      if (ch === "\\") {
        j++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function readJsString(s: string, i: number): { str: string; end: number } {
  const q = s[i];
  let out = "";
  i++;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      out += s[i + 1];
      i += 2;
      continue;
    }
    if (ch === q) {
      i++;
      break;
    }
    out += ch;
    i++;
  }
  return { str: out, end: i };
}

function unpackPackedScript(html: string): string | null {
  const marker = "eval(function(p,a,c,k,e,d)";
  const start = html.indexOf(marker);
  if (start < 0) return null;

  const open = html.indexOf("(", start);
  if (open < 0) return null;
  const end = matchDelim(html, open, "(", ")");
  if (end < 0) return null;

  const expr = html.slice(start + 5, end + 1);
  const brace = expr.indexOf("{");
  if (brace < 0) return null;
  const fEnd = matchDelim(expr, brace, "{", "}");
  if (fEnd < 0) return null;

  const argsSrc = expr.slice(fEnd + 2, expr.length - 1);
  const payload = readJsString(argsSrc, 0);
  let i = payload.end + 1;

  const radixMatch = argsSrc.slice(i).match(/^\s*(\d+)/);
  if (!radixMatch) return null;
  i += radixMatch[0].length;
  const radix = Number(radixMatch[1]);

  const countMatch = argsSrc.slice(i).match(/^\s*,\s*(\d+)/);
  if (!countMatch) return null;
  const count = Number(countMatch[1]);

  const dictStart = argsSrc.indexOf("'", i);
  if (dictStart < 0) return null;
  const dict = readJsString(argsSrc, dictStart);
  const words = dict.str.split("|");

  let out = payload.str;
  for (let c = count - 1; c >= 0; c--) {
    if (words[c]) out = out.replace(new RegExp("\\b" + c.toString(radix) + "\\b", "g"), words[c]);
  }
  return out;
}

function extractVideoUrl(html: string): Stream | null {
  const decoded = unpackPackedScript(html);
  if (decoded) {
    const m3u8 = decoded.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/i);
    if (m3u8) return { url: m3u8[0], type: "hls" };
    const mp4 = decoded.match(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/i);
    if (mp4) return { url: mp4[0], type: "mp4" };
  }

  const plainM3u8 = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
  if (plainM3u8) return { url: plainM3u8[0], type: "hls" };
  const plainMp4 = html.match(/https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/i);
  if (plainMp4) return { url: plainMp4[0], type: "mp4" };
  return null;
}

async function fetchEmbed(url: string, tries = 2): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml",
          referer: `${BASE}/`,
        },
      });
      if (res.ok) {
        const html = await res.text();
        if (html) return html;
      }
    } catch {
      /* lanjut retry */
    }
    if (i < tries - 1) await sleep(500 + i * 500);
  }
  return null;
}

/** Player doodcdn (playmogo & clones): /pass_md5/<file>-<x>-<y>-<z>-<md5>/<token> */
async function resolveDood(embedUrl: string, html: string): Promise<string | null> {
  const m = html.match(/\$\.get\(['"]\/pass_md5\/([^'"]+)['"]/);
  if (!m) return null;

  let origin: string;
  try {
    origin = new URL(embedUrl).origin;
  } catch {
    return null;
  }

  let base = "";
  for (let i = 0; i < 3 && !/^https?:\/\//i.test(base); i++) {
    try {
      const res = await fetch(`${origin}/pass_md5/${m[1]}`, {
        headers: { "user-agent": UA, referer: embedUrl },
      });
      base = res.ok ? (await res.text()).trim() : "";
    } catch {
      base = "";
    }
    if (!/^https?:\/\//i.test(base)) await sleep(700 + i * 700);
  }
  if (!/^https?:\/\//i.test(base)) return null;

  const token = m[1].split("/").pop() || "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let rand = "";
  for (let i = 0; i < 10; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `${base}${rand}?token=${encodeURIComponent(token)}&expiry=${Date.now()}`;
}

/**
 * Embed → URL video. streampoi/streamruby dicoba dulu (Server 3 paling
 * stabil, playmogo gampang 403); ouo.io dilewatin tanpa request (Cloudflare).
 */
export async function resolveHentaiStream(detail: HentaiDetail): Promise<Stream | null> {
  const hit = streamCache.get(detail.slug);
  if (hit) {
    const fresh = hit.data ? STREAM_OK_MS : STREAM_MISS_MS;
    if (Date.now() - hit.at < fresh) return hit.data;
  }

  const prefer = (s: StreamLink) => /streampoi\.com|streamruby\./i.test(s.embedUrl);
  const candidates = [...detail.streams.filter(prefer), ...detail.streams.filter((s) => !prefer(s))]
    .filter((s) => s.embedUrl && !/ouo\./i.test(s.embedUrl))
    .slice(0, 3);

  let result: Stream | null = null;

  for (const s of candidates) {
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      const html = await fetchEmbed(s.embedUrl, 2);
      if (html) {
        result = extractVideoUrl(html);
        if (!result) {
          const dood = await resolveDood(s.embedUrl, html);
          if (dood) result = { url: dood, type: "mp4" };
        }
      }
      if (!result && attempt === 0) await sleep(1400);
    }
    if (result) break;
  }

  cacheSet(streamCache, detail.slug, result);
  return result;
}
