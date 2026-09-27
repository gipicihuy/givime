import * as cheerio from "cheerio";

/**
 * Parser ryukomik.my.id (video anime dewasa · 18+). Server-side aja —
 * jangan dipanggil dari client component.
 *
 * Sumber datanya payload JSON di RSC Next.js (`self.__next_f.push(…)` yang
 * memuat objek `"data":{…}`), jadi parser HTML-nya tipis: kartu list/search
 * doang. Gambar mentah nekopoi.care diblokir (403) → dilempar ke proxy
 * apiv2.ryukomik.web.id.
 *
 * slug = path URL di bawah /hentai tanpa garis miring (mis.
 * "episode/joshi-ochi-…-episode-6-subtitle-indonesia" atau
 * "detail/joshi-ochi-…") biar bisa dipakai langsung buat rute catch-all
 * /hentai/[...slug].
 */

const BASE = "https://ryukomik.my.id";
const IMG = "https://apiv2.ryukomik.web.id/neko/image";
const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36";

const LIST_MS = 5 * 60_000;
const SEARCH_MS = 2 * 60_000;
const DETAIL_MS = 3 * 60_000;
const SERIES_MS = 5 * 60_000;
const STREAM_OK_MS = 3 * 60_000;
const STREAM_MISS_MS = 10_000;
// Batas total resolve 1 server-per-server biar tombol "server lain" gak muter.
const RESOLVE_MS = 25_000;

/** AbortSignal.timeout (Node 18+) — null kalau runtime gak punya. */
function tSignal(ms: number): AbortSignal | undefined {
  const t = (AbortSignal as { timeout?: (n: number) => AbortSignal }).timeout;
  return typeof t === "function" ? t(ms) : undefined;
}

export type HentaiItem = {
  slug: string;
  title: string;
  href: string;
  thumb: string | null;
  /** nomor episode dari badge kartu (kalau ada) */
  ep: number | null;
  date: string | null;
};

export type HentaiList = {
  items: HentaiItem[];
  page: number;
  totalPages: number;
};

export type HentaiEpisode = {
  /** null untuk batch/tamat */
  ep: number | null;
  /** label asli sumber ("Ep 6", "Ep Batch", "Ep 9[UNCENSORED]") */
  label: string;
  title: string;
  slug: string;
  date: string | null;
};

export type StreamLink = { server: string; embedUrl: string };

export type HentaiDetail = {
  slug: string;
  title: string;
  /** poster 2:3 — dari halaman seri */
  poster: string | null;
  /** still 16:9 — dari halaman episode (di seri = poster) */
  thumb: string | null;
  synopsis: string;
  genres: string[];
  score: string | null;
  status: string | null;
  aired: string | null;
  date: string | null;
  duration: string | null;
  size: string | null;
  producer: string | null;
  totalEpisodes: string | null;
  /** label episode ("Ep 6[UNCENSORED]") — halaman episode aja */
  label: string | null;
  page: "series" | "episode";
  episodes: HentaiEpisode[];
  streams: StreamLink[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  series: { slug: string; title: string } | null;
};

/** resolveHentaiStream juga nembalin index server yang kepilih (buat "server lain"). */
export type Stream = { url: string; type: "hls" | "mp4"; index?: number };

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

/** URL gambar mentah (nekopoi.care, 403) → proxy apiv2. URL proxy dilewatin. */
function img(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.replace(/^url\((['"]?)(.*)\1\)$/i, "$2").trim();
  if (!clean) return null;
  if (clean.startsWith(IMG)) return clean;
  return `${IMG}?url=${encodeURIComponent(clean)}`;
}

async function fetchHtml(path: string, tries = 3): Promise<string> {
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
        signal: tSignal(12_000),
      });
      if (res.ok) return res.text();
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e;
    }
    if (i < tries - 1) await sleep(600 + i * 600);
  }
  throw new Error(`ryukomik ${last instanceof Error ? last.message : last}`);
}

/** "https://ryukomik.my.id/hentai/episode/xxx/" → "episode/xxx" */
function pathOf(href: string): string {
  try {
    return new URL(href, BASE)
      .pathname.replace(/^\/+|\/+$/g, "")
      .replace(/^hentai\//, "");
  } catch {
    return "";
  }
}

/** "2<!-- --> / <!-- -->285" → 285 */
function totalPagesOf(html: string): number {
  const m = html.match(/(\d+)\s*<!--\s*-->\s*\/\s*<!--\s*-->\s*(\d+)/);
  return m ? Number(m[2]) : 1;
}

/** Kartu list/search: <a href="/hentai/episode|detail/…"><img alt="judul" src="proxy…"> */
function parseCards(html: string): HentaiItem[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: HentaiItem[] = [];

  $('a[href*="/hentai/episode/"], a[href*="/hentai/detail/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const slug = pathOf(href);
    if (!slug || seen.has(slug)) return;
    const $img = $(el).find("img").first();
    const title = ($img.attr("alt") || "").trim() || $(el).text().replace(/\s+/g, " ").trim();
    if (!title) return;
    seen.add(slug);
    const m = title.match(/episode\s*(\d+)/i);
    out.push({
      slug,
      title,
      href: `/hentai/${slug}`,
      thumb: $img.attr("src") || null,
      ep: m ? Number(m[1]) : null,
      date: null,
    });
  });

  return out;
}

/** Ambil objek `"data":{…}` dari payload RSC Next.js. */
function extractData(html: string): DataPayload | null {
  const pushes = html.match(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g) || [];
  for (const chunk of pushes) {
    const raw = chunk.slice(chunk.indexOf('"'), chunk.lastIndexOf('"') + 1);
    let text: string;
    try {
      text = JSON.parse(raw) as string;
    } catch {
      continue;
    }
    const key = text.indexOf('"data":{');
    if (key < 0) continue;
    const start = key + '"data":'.length;
    const end = jsonEnd(text, start);
    if (end < 0) continue;
    try {
      return JSON.parse(text.slice(start, end + 1)) as DataPayload;
    } catch {
      /* coba push berikutnya */
    }
  }
  return null;
}

/** Indeks `}` penutup objek JSON mulai dari `i` (char `{`). */
function jsonEnd(s: string, i: number): number {
  let depth = 0;
  let inStr = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) {
      if (c === "\\") {
        j++;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function epOf(label: string | null | undefined): number | null {
  const s = String(label || "");
  const m = s.match(/episode\s*(\d+)/i) || s.match(/\bep\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

type RawEpisode = { slug?: string; label?: string; title?: string; date?: string };

function normEpisodes(list: RawEpisode[] | undefined): HentaiEpisode[] {
  if (!Array.isArray(list)) return [];
  return list.map((e) => {
    const raw = String(e.slug || "").replace(/^\/+|\/+$/g, "");
    const slug = raw.includes("/") ? pathOf(raw) : `episode/${raw}`;
    const label = e.label || "";
    return {
      ep: epOf(label),
      label,
      title: e.title || label,
      slug,
      date: e.date || null,
    };
  });
}

function normGenres(g: unknown): string[] {
  if (!Array.isArray(g)) return [];
  return g
    .map((x) => (typeof x === "string" ? x : ((x as { name?: string })?.name ?? "")))
    .map((s) => s.trim())
    .filter(Boolean);
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

type DataPayload = {
  title?: string;
  entryTitle?: string;
  thumbnail?: string;
  synopsis?: string;
  genres?: unknown;
  score?: string;
  status?: string;
  aired?: string;
  date?: string;
  duration?: string;
  size?: string;
  producer?: string;
  totalEpisodes?: string;
  label?: string;
  allEpisode?: string;
  players?: { label?: string; src?: string }[];
  episodeList?: RawEpisode[];
};

export async function fetchHentaiList(page = 1): Promise<HentaiList | null> {
  const n = Math.max(1, Math.floor(page) || 1);
  const hit = listCache.get(n);
  if (hit && Date.now() - hit.at < LIST_MS) return hit.data;
  try {
    const html = await fetchHtml(n > 1 ? `/hentai/terbaru?page=${n}` : "/hentai/terbaru");
    const data: HentaiList = { items: parseCards(html), page: n, totalPages: totalPagesOf(html) };
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
    const html = await fetchHtml(`/hentai/search?q=${encodeURIComponent(q)}`);
    const items = parseCards(html);
    if (searchCache.size > 40) searchCache.clear();
    searchCache.set(key, { at: Date.now(), data: items });
    return items;
  } catch {
    return null;
  }
}

async function fetchSeries(seriesSlug: string): Promise<HentaiDetail | null> {
  const hit = cacheGet(detailCache, `detail/${seriesSlug}`, SERIES_MS);
  if (hit) return hit;
  try {
    const html = await fetchHtml(`/hentai/detail/${seriesSlug}`);
    const data = extractData(html);
    if (!data || !data.episodeList) throw new Error("payload seri gak ketemu");
    const detail = buildSeries(data, `detail/${seriesSlug}`);
    cacheSet(detailCache, `detail/${seriesSlug}`, detail);
    return detail;
  } catch {
    return null;
  }
}

function buildSeries(data: DataPayload, slug: string): HentaiDetail {
  const poster = img(data.thumbnail);
  const episodes = normEpisodes(data.episodeList);
  return {
    slug,
    title: str(data.title) || "",
    poster,
    thumb: poster,
    synopsis: str(data.synopsis) || "",
    genres: normGenres(data.genres),
    score: str(data.score),
    status: str(data.status),
    aired: str(data.aired),
    date: null,
    duration: str(data.duration),
    size: null,
    producer: str(data.producer),
    totalEpisodes: str(data.totalEpisodes),
    label: null,
    page: "series",
    episodes,
    streams: [],
    prev: null,
    next: null,
    series: { slug, title: str(data.title) || "" },
  };
}

/**
 * Halaman episode nyimpen players + allEpisode, tapi sinopsis/daftar episode/
 * prev-next ada di halaman seri (`/hentai/detail/<allEpisode>`) — jadi seri
 * diambil terpisah (payload episode-nya sendiri bilang prev/next kosong).
 */
async function buildEpisode(data: DataPayload, slug: string): Promise<HentaiDetail> {
  const seriesSlug = str(data.allEpisode) || "";
  const base: HentaiDetail = {
    slug,
    title: str(data.title) || str(data.entryTitle) || "",
    poster: null,
    thumb: img(data.thumbnail),
    synopsis: "",
    genres: normGenres(data.genres),
    score: null,
    status: null,
    aired: null,
    date: str(data.date),
    duration: str(data.duration),
    size: str(data.size),
    producer: str(data.producer),
    totalEpisodes: null,
    label: str(data.label) || epLabelFromTitle(str(data.title) || ""),
    page: "episode",
    episodes: [],
    streams: Array.isArray(data.players)
      ? (data.players as { label?: string; src?: string }[])
          .map((p) => ({ server: p.label || "", embedUrl: p.src || "" }))
          .filter((s) => s.embedUrl)
      : [],
    prev: null,
    next: null,
    series: seriesSlug ? { slug: `detail/${seriesSlug}`, title: "" } : null,
  };
  if (!seriesSlug) return base;

  try {
    const serie = await fetchSeries(seriesSlug);
    if (!serie) return base;
    const eps = serie.episodes;
    const idx = eps.findIndex((e) => e.slug === slug);
    return {
      ...base,
      poster: serie.poster,
      synopsis: serie.synopsis,
      score: serie.score,
      status: serie.status,
      aired: serie.aired,
      totalEpisodes: serie.totalEpisodes,
      episodes: eps,
      series: { slug: serie.slug, title: serie.title },
      prev: idx > 0 ? { slug: eps[idx - 1].slug, title: eps[idx - 1].title } : null,
      next: idx >= 0 && idx < eps.length - 1 ? { slug: eps[idx + 1].slug, title: eps[idx + 1].title } : null,
    };
  } catch {
    return base;
  }
}

/** "… Episode 6 Subtitle Indonesia" → "Ep 6" */
function epLabelFromTitle(title: string): string | null {
  const m = title.match(/episode\s*(\d+)/i);
  return m ? `Ep ${m[1]}` : null;
}

export async function fetchHentaiDetail(slug: string): Promise<HentaiDetail | null> {
  const clean = slug.replace(/^\/+|\/+$/g, "").replace(/^hentai\//, "");
  if (!clean) return null;

  const hit = cacheGet(detailCache, clean, DETAIL_MS);
  if (hit) return hit;

  try {
    const html = await fetchHtml(`/hentai/${clean}`);
    const data = extractData(html);
    if (!data) throw new Error("payload data gak ketemu");

    const detail = Array.isArray(data.players)
      ? await buildEpisode(data, clean)
      : buildSeries(data, clean);
    if (!detail.title) throw new Error("detail kosong");

    cacheSet(detailCache, clean, detail);
    return detail;
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

async function fetchEmbed(url: string, tries = 2, deadline?: number): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    if (deadline && Date.now() > deadline) return null;
    // Embed streampoi bisa ~12 detik pas cold → jangan potong kependekan.
    const budget = deadline ? Math.max(2_000, Math.min(15_000, deadline - Date.now())) : 15_000;
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml",
          referer: `${BASE}/`,
        },
        cache: "no-store",
        signal: tSignal(budget),
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
        cache: "no-store",
        signal: tSignal(8_000),
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

/** Coba satu embed → URL video (retry pendek buat playmogo yang gampang 403). */
async function resolveEmbed(
  link: StreamLink,
  deadline?: number,
): Promise<{ url: string; type: "hls" | "mp4" } | null> {
  const isPlaymogo = /playmogo\.com/i.test(link.embedUrl);
  const rounds = isPlaymogo ? 1 : 2;
  const maxAttempt = isPlaymogo ? 3 : 2;

  const tryOnce = async (): Promise<{ url: string; type: "hls" | "mp4" } | null> => {
    const html = await fetchEmbed(link.embedUrl, 2, deadline);
    if (!html) return null;
    const video = extractVideoUrl(html);
    if (video) return video;
    const dood = await resolveDood(link.embedUrl, html);
    return dood ? { url: dood, type: "mp4" } : null;
  };

  for (let attempt = 0; attempt < maxAttempt; attempt++) {
    if (deadline && Date.now() > deadline) return null;
    const got = await tryOnce();
    if (got) return got;
    if (attempt < maxAttempt - 1) await sleep(isPlaymogo ? 2000 : 1400);
  }
  for (let round = 1; round < rounds; round++) {
    if (deadline && Date.now() > deadline) return null;
    await sleep(1500);
    const got = await tryOnce();
    if (got) return got;
  }
  return null;
}

/**
 * Players → URL video. "Ryu-lokal" (streampoi/streamruby) dicoba dulu karena
 * paling stabil, playmogo (Server 1/2) gampang 403 → coba pendek aja;
 * ouo.io dilewatin tanpa request (Cloudflare).
 *
 * `opts.skip` = index server yang udah dicoba — dipake tombol "server lain"
 * di player biar gak balik ke server yang sama terus.
 */
export async function resolveHentaiStream(
  detail: HentaiDetail,
  opts?: { skip?: number[] },
): Promise<Stream | null> {
  const skip = new Set((opts?.skip ?? []).filter((n) => Number.isInteger(n)));
  const key = `${detail.slug}#${[...skip].sort((a, b) => a - b).join(",")}`;
  const hit = streamCache.get(key);
  if (hit) {
    const fresh = hit.data ? STREAM_OK_MS : STREAM_MISS_MS;
    if (Date.now() - hit.at < fresh) return hit.data;
  }

  const prefer = (s: StreamLink) => !/playmogo\.com/i.test(s.embedUrl);
  const order = detail.streams
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.embedUrl && !/ouo\./i.test(s.embedUrl))
    .sort((a, b) => Number(prefer(b.s)) - Number(prefer(a.s)))
    .slice(0, 3);
  const candidates = order.filter(({ index }) => !skip.has(index));
  // Server yang di-skip tetap dicoba ulang sebagai cadangan kalau sisanya
  // pada gagal — buat tetep punya jalan kalau server andalan lagi error.
  const passes = skip.size > 0 ? [candidates, order] : [candidates];

  let result: Stream | null = null;
  const deadline = Date.now() + RESOLVE_MS;
  console.log(
    `[resolve] ${detail.slug} skip=[${[...skip].join(",")}] kandidat=${candidates.map((c) => c.index).join(",")}`,
  );

  for (let pass = 0; pass < passes.length && !result; pass++) {
    for (const { s, index } of passes[pass]) {
      if (Date.now() > deadline) break;
      const t0 = Date.now();
      const video = await resolveEmbed(s, deadline);
      console.log(
        `[resolve] idx=${index} (${s.server}) → ${video ? "OK" : "FAIL"} ${Date.now() - t0}ms`,
      );
      if (video) {
        result = { ...video, index };
        break;
      }
    }
  }

  cacheSet(streamCache, key, result);
  return result;
}
