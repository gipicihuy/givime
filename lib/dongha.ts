import crypto from "node:crypto";
import zlib from "node:zlib";
import {
  type DonghuaEpisodeItem,
  type DonghuaItem,
  type DonghuaSubtitle,
  type DonghuaVideo,
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
 * Client gateway dongha.id (server-side only).
 *
 * Alurnya: bootstrap sesi (X25519-ish HKDF + ChaCha20-Poly1305 envelope) →
 * login / auto-register akun sekali pakai → panggil endpoint REST Directus
 * yang dibungkus gateway. Semua respons dienkripsi dengan `alg: "C20P"`.
 *
 * Kredensial dibaca dari env (lihat README). Kalau kosong, akun sekali pakai
 * dibuat otomatis lewat mail.tm dan disimpan di memori isolate — cukup buat
 * bikin situs tetap jalan tanpa setup manual.
 */

const GATEWAY_BASE = "https://gateway.dongha.id";
const UA =
  "Mozilla/5.0 (Linux; Android 14; Dongha) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const MAIL_API = "https://api.mail.tm";

const ASSETS_BASE = "https://dongha.epeministudio.com";
const VIDEO_BASE = "https://video.epeministudio.com";
const HLS_BASE = "https://media.epeministudio.com/v";

const CACHE_MS = 5 * 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Cache<T> = { at: number; data: T };
const cache = new Map<string, Cache<unknown>>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key) as Cache<T> | undefined;
  return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
}

function cacheSet<T>(key: string, data: T) {
  if (cache.size > 120) cache.clear();
  cache.set(key, { at: Date.now(), data });
}

function hkdf(ikm: Buffer, salt: Buffer, info: Buffer, length = 32): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, length));
}

function maybeDecompress(buf: Buffer): Buffer {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return zlib.gunzipSync(buf);
  if (buf.length >= 2 && buf[0] === 0x78 && [0x01, 0x9c, 0xda].includes(buf[1]))
    return zlib.inflateSync(buf);
  return buf;
}

function isJsonType(contentType = ""): boolean {
  return (
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("xml") ||
    contentType.includes("urlencoded") ||
    contentType.startsWith("text/")
  );
}

class GatewayError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
    this.body = body;
  }
}

class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

type Session = {
  session_id: string;
  session_secret: string;
  scope: string;
  kid: string;
};

type Envelope = {
  alg?: string;
  nonce?: string;
  ciphertext?: string;
  upstream?: string;
  status?: number | string;
  content_type?: string;
  kid?: string;
};

class Gateway {
  token: string | null;
  session: Session | null = null;
  key: Buffer | null = null;

  constructor({ token = null }: { token?: string | null } = {}) {
    this.token = token;
  }

  async bootstrap(): Promise<Session> {
    const { status, raw } = await this.send("POST", "/gateway/session/bootstrap", "{}");
    let body: { data?: Session } | null = null;
    try {
      body = JSON.parse(raw.toString("utf8")) as { data?: Session };
    } catch {
      body = null;
    }
    if (status !== 200 || !body?.data) throw new GatewayError("bootstrap failed", status, body);
    const data = body.data;
    const info = Buffer.from(`dongha-gateway|v1|${data.scope}|${data.kid}`);
    this.session = data;
    this.key = hkdf(
      Buffer.from(data.session_secret, "base64"),
      Buffer.from(data.session_id),
      info,
    );
    return data;
  }

  private async send(
    method: string,
    pathName: string,
    body?: string | Buffer,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; raw: Buffer }> {
    const h: Record<string, string> = {
      "user-agent": UA,
      accept: "application/json, */*",
      ...headers,
    };
    if (this.session) h["X-Gateway-Kid"] = this.session.kid;
    if (this.token) h.authorization = `Bearer ${this.token}`;
    let payload: Buffer | undefined;
    if (body !== undefined && body !== null) {
      payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
      h["content-type"] = "application/json";
    }
    const res = await fetch(GATEWAY_BASE + pathName, {
      method,
      headers: h,
      body: payload as unknown as BodyInit,
      cache: "no-store",
    });
    return { status: res.status, raw: Buffer.from(await res.arrayBuffer()) };
  }

  private decrypt(env: Envelope, method: string, pathName: string): {
    plaintext: Buffer;
    contentType: string;
    status: number;
  } {
    if (!this.key) throw new Error("gateway not bootstrapped");
    const barePath = pathName.split("?")[0];
    const aad = Buffer.from(
      [
        method,
        barePath,
        env.upstream,
        String(env.status),
        env.content_type,
        env.kid,
      ].join("\n"),
    );
    const nonce = Buffer.from(env.nonce || "", "base64");
    const encrypted = Buffer.from(env.ciphertext || "", "base64");
    const ct = encrypted.subarray(0, -16);
    const decipher = crypto.createDecipheriv("chacha20-poly1305", this.key, nonce, {
      authTagLength: 16,
    });
    decipher.setAAD(aad, { plaintextLength: ct.length });
    decipher.setAuthTag(encrypted.subarray(-16));
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return {
      plaintext: maybeDecompress(pt),
      contentType: env.content_type || "",
      status: Number(env.status) || 200,
    };
  }

  async request(
    method: string,
    pathName: string,
    { body, allowError = true }: { body?: unknown; allowError?: boolean } = {},
  ): Promise<{ status: number; body: unknown; raw: Buffer }> {
    if (!this.session) await this.bootstrap();
    const payload =
      body === undefined || body === null
        ? undefined
        : Buffer.isBuffer(body)
          ? body
          : typeof body === "string"
            ? Buffer.from(body)
            : Buffer.from(JSON.stringify(body));
    const { status, raw } = await this.send(method, pathName, payload);

    let parsed = raw;
    let contentType = "";
    let httpStatus = status;
    let env: Envelope | null = null;
    try {
      env = JSON.parse(raw.toString("utf8")) as Envelope;
    } catch {
      env = null;
    }
    if (env && env.alg === "C20P") {
      let dec: { plaintext: Buffer; contentType: string; status: number };
      try {
        dec = this.decrypt(env, method, pathName);
      } catch (e) {
        throw new GatewayError(
          `decrypt failed: ${e instanceof Error ? e.message : String(e)}`,
          Number(env.status) || 500,
          env,
        );
      }
      parsed = dec.plaintext;
      contentType = dec.contentType;
      httpStatus = dec.status;
    }

    let out: unknown = parsed;
    if (contentType && isJsonType(contentType)) {
      const text = parsed.toString("utf8");
      try {
        out = JSON.parse(text);
      } catch {
        out = text;
      }
    } else if (parsed.length === 0) {
      out = null;
    } else {
      const text = parsed.toString("utf8");
      try {
        out = JSON.parse(text);
      } catch {
        out = parsed;
      }
    }

    if (httpStatus >= 400 && !allowError) {
      const err = out as { errors?: { message?: string }[] } | null;
      const msg = err?.errors?.[0]?.message || `HTTP ${httpStatus}`;
      throw new GatewayError(msg, httpStatus, out);
    }
    return { status: httpStatus, body: out, raw: parsed };
  }

  get<T>(pathName: string, opts?: { allowError?: boolean }): Promise<{
    status: number;
    body: T;
    raw: Buffer;
  }> {
    return this.request("GET", pathName, opts) as Promise<{
      status: number;
      body: T;
      raw: Buffer;
    }>;
  }

  post<T>(
    pathName: string,
    body: unknown,
    opts?: { allowError?: boolean },
  ): Promise<{ status: number; body: T; raw: Buffer }> {
    return this.request("POST", pathName, { ...opts, body }) as Promise<{
      status: number;
      body: T;
      raw: Buffer;
    }>;
  }
}

/* —— env & auth —— */

async function env(name: string): Promise<string | undefined> {
  if (process.env[name]) return process.env[name];
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = (await Promise.resolve(mod.getCloudflareContext())) as unknown as
      | { env?: Record<string, string | undefined> }
      | undefined;
    return ctx?.env?.[name];
  } catch {
    return undefined;
  }
}

type Creds = {
  email?: string;
  password?: string;
  access_token?: string;
  refresh_token?: string;
  expires?: number;
  obtainedAt?: number;
};

let auth: Creds | null = null;
let authPromise: Promise<Creds | null> | null = null;

async function jsonFetch(
  method: string,
  url: string,
  { body, token }: { body?: unknown; token?: string } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "Mozilla/5.0",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 10_000 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return { status: res.status, body: parsed };
  }
  throw new Error("mail.tm rate limited too many times");
}

function members(obj: unknown): Array<{ id?: string; domain?: string }> {
  if (Array.isArray(obj)) return obj as Array<{ id?: string; domain?: string }>;
  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    const list = rec["hydra:member"] ?? rec.member;
    return Array.isArray(list) ? (list as Array<{ id?: string; domain?: string }>) : [];
  }
  return [];
}

function pickData(body: unknown): Creds {
  if (!body || typeof body !== "object") return {};
  const rec = body as Record<string, unknown>;
  const data = rec.data;
  return (data && typeof data === "object" ? data : rec) as Creds;
}

async function newInbox(): Promise<{ address: string; token: string }> {
  const dom = await jsonFetch("GET", `${MAIL_API}/domains`);
  const domain = members(dom.body)[0]?.domain;
  if (!domain) throw new Error("mail.tm: no domain available");
  const user = "dg" + crypto.randomBytes(8).toString("hex");
  const address = `${user}@${domain}`;
  const password = crypto.randomBytes(12).toString("base64url");
  const acc = await jsonFetch("POST", `${MAIL_API}/accounts`, {
    body: { address, password },
  });
  if (acc.status !== 200 && acc.status !== 201)
    throw new Error(`mail.tm account create failed: ${JSON.stringify(acc.body)}`);
  const tok = await jsonFetch("POST", `${MAIL_API}/token`, { body: { address, password } });
  if (tok.status !== 200) throw new Error(`mail.tm token failed: ${JSON.stringify(tok.body)}`);
  return { address, token: (tok.body as { token?: string }).token || "" };
}

async function waitForCode(token: string, timeoutMs = 120_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const patterns = [/code is (\d{6})/i, /kode\s*:?\s*(\d{6})/i, /\b(\d{6})\b/];
  while (Date.now() < deadline) {
    const list = await jsonFetch("GET", `${MAIL_API}/messages`, { token });
    for (const m of members(list.body)) {
      if (!m.id) continue;
      const full = await jsonFetch("GET", `${MAIL_API}/messages/${m.id}`, { token });
      const text = (full.body as { text?: string } | null)?.text || "";
      for (const re of patterns) {
        const hit = re.exec(text);
        if (hit) return hit[1];
      }
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("timed out waiting for verification code");
}

async function registerAccount(): Promise<Creds> {
  const inbox = await newInbox();
  const password = "Dh" + crypto.randomBytes(12).toString("base64url") + "!7";
  const g = new Gateway();

  let reg = await g.post<unknown>("/auth-register", {
    email: inbox.address,
    password,
  });
  if (reg.status === 429) {
    await new Promise((r) => setTimeout(r, 65_000));
    reg = await g.post<unknown>("/auth-register", { email: inbox.address, password });
  }
  if (reg.status !== 200)
    throw new GatewayError(`register failed (${reg.status})`, reg.status, reg.body);

  const code = await waitForCode(inbox.token);
  const ver = await g.post<unknown>("/auth-register/verify", {
    email: inbox.address,
    password,
    code,
  });
  if (ver.status !== 200)
    throw new GatewayError(`verify failed (${ver.status})`, ver.status, ver.body);

  const data = pickData(ver.body);
  return {
    email: inbox.address,
    password,
    ...data,
    obtainedAt: Date.now(),
  };
}

async function loginAccount(email: string, password: string): Promise<Creds> {
  const g = new Gateway();
  const res = await g.post<unknown>("/auth-login", { email, password });
  if (res.status !== 200)
    throw new GatewayError(
      `login failed (${res.status})`,
      res.status,
      res.body,
    );
  return { email, password, ...pickData(res.body), obtainedAt: Date.now() };
}

async function refreshAccount(creds: Creds): Promise<Creds> {
  if (!creds.refresh_token) throw new Error("no refresh token");
  const g = new Gateway();
  const res = await g.post<unknown>("/auth/refresh", {
    refresh_token: creds.refresh_token,
  });
  if (res.status !== 200)
    throw new GatewayError(`refresh failed (${res.status})`, res.status, res.body);
  return { ...creds, ...pickData(res.body), obtainedAt: Date.now() };
}

function tokenFresh(creds: Creds | null): boolean {
  if (!creds?.access_token) return false;
  if (!creds.obtainedAt) return true;
  const ttl = creds.expires ?? 24 * 60 * 60 * 1000;
  return Date.now() < creds.obtainedAt + ttl - 5 * 60_000;
}

async function initialCreds(): Promise<Creds | null> {
  if (auth) return auth;
  const email = await env("DONGHA_EMAIL");
  const password = await env("DONGHA_PASSWORD");
  if (email && password) {
    auth = { email, password };
    return auth;
  }
  const token = await env("DONGHA_ACCESS_TOKEN");
  if (token) {
    auth = { access_token: token };
    return auth;
  }
  if ((await env("DONGHA_AUTO_REGISTER")) === "false") return null;
  auth = await registerAccount();
  return auth;
}

async function ensureCreds(force = false): Promise<Creds | null> {
  if (!force && tokenFresh(auth)) return auth;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    const base = await initialCreds();
    if (!base) return null;
    if (!force && tokenFresh(base)) return base;

    if (base.refresh_token) {
      try {
        auth = await refreshAccount(base);
        return auth;
      } catch {
        /* refresh token mati → login ulang di bawah */
      }
    }
    if (base.email && base.password) {
      try {
        auth = await loginAccount(base.email, base.password);
        return auth;
      } catch {
        /* password mungkin tidak valid lagi → daftar akun baru kalau diizinkan */
      }
    }
    if ((await env("DONGHA_AUTO_REGISTER")) === "false") {
      auth = base;
      return auth;
    }
    auth = await registerAccount();
    return auth;
  })().finally(() => {
    authPromise = null;
  });

  return authPromise;
}

let gatewayPromise: Promise<Gateway> | null = null;

async function getGateway(): Promise<Gateway> {
  const creds = await ensureCreds();
  if (!gatewayPromise) {
    gatewayPromise = (async () => {
      const g = new Gateway({ token: creds?.access_token ?? null });
      await g.bootstrap();
      return g;
    })().catch((e) => {
      gatewayPromise = null;
      throw e;
    });
  }
  const g = await gatewayPromise;
  if (g.token !== (creds?.access_token ?? null)) {
    g.token = creds?.access_token ?? null;
  }
  return g;
}

async function apiGet<T>(pathName: string): Promise<T> {
  let g = await getGateway();
  let res = await g.get<unknown>(pathName, { allowError: true });
  if (res.status === 401) {
    await ensureCreds(true);
    g = await getGateway();
    res = await g.get<unknown>(pathName, { allowError: true });
  }
  if (res.status >= 400) {
    const err = res.body as { errors?: { message?: string }[] } | null;
    const msg = err?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new HttpError(`${msg} (${pathName})`, res.status, res.body);
  }
  return res.body as T;
}

/* —— shape data gateway —— */

type ImageRef = { filename_disk?: string } | string | null;

type GenreRef = {
  id?: string | number;
  name?: string;
  slug?: string;
  genres_id?: { id?: string; name?: string; slug?: string };
};

type SeasonType = { name?: string; slug?: string };

type Season = {
  id: string;
  season_number?: number;
  title?: string;
  title_english?: string;
  title_romaji?: string;
  synopsis?: string;
  poster_image?: ImageRef;
  airing_status?: string;
  broadcast_day?: string | string[] | null;
  broadcast_time?: string | null;
  mal_score?: number | null;
  studio?: { name?: string } | null;
  release_year?: number | null;
  type?: SeasonType | null;
  total_episodes?: number | null;
  episodes?: Episode[];
  episode_count?: number;
};

type Video = {
  id: string;
  quality?: string | null;
  streaming_url?: string | null;
  download_url?: string | null;
  r2_url?: string | null;
  hls_url?: string | null;
  backup_url?: string | null;
  file_size?: number | null;
  codec?: string | null;
  is_dubbed?: boolean;
  status?: string;
};

type Subtitle = {
  id: string;
  language?: string | null;
  label?: string | null;
  format?: string | null;
  file?: { filename_disk?: string; filename_download?: string; type?: string } | null;
  file_url?: string | null;
  is_default?: number | boolean | null;
  sort?: number | null;
};

type Segment = {
  id?: string;
  type?: string;
  start_time?: number;
  end_time?: number;
};

type Series = {
  id: string;
  title?: string;
  title_english?: string | null;
  title_native?: string | null;
  title_romaji?: string | null;
  slug: string;
  synopsis?: string | null;
  synopsis_id?: string | null;
  poster_image?: ImageRef;
  backdrop_image?: ImageRef;
  content_rating?: string | null;
  original_language?: string | null;
  category?: { id?: string; name?: string; slug?: string } | null;
  genres?: GenreRef[];
  seasons?: Season[];
  latest_season?: Season | null;
  episode_count?: number;
};

type Episode = {
  id: string;
  number?: string | number | null;
  title?: string | null;
  title_id?: string | null;
  synopsis?: string | null;
  thumbnail?: ImageRef;
  duration?: string | number | null;
  air_date?: string | null;
  is_filler?: boolean;
  is_premium?: boolean | null;
  status?: string;
  sort?: number | null;
  videos?: Video[];
  subtitles?: Subtitle[];
  segments?: Segment[];
  series_id?: Series | null;
  season_id?: Season | null;
};

type LatestEpisode = {
  series_id?: string;
  series_title?: string;
  series_slug?: string;
  poster_image?: ImageRef;
  season_poster_image?: ImageRef;
  season_number?: number;
  season_type?: string;
  latest_episode?: {
    id: string;
    number?: string | number | null;
    title?: string | null;
    thumbnail?: ImageRef;
    duration?: string | number | null;
    air_date?: string | null;
  };
  new_episodes_count?: number;
};

type CatalogSection = {
  title?: string;
  display_type?: string;
  filter_type?: string;
  filter_slug?: string | null;
  content_category?: string;
  items?: Series[];
};

type HomeFeed = {
  categories?: { id?: string; name?: string; slug?: string }[];
  banners?: {
    id?: string;
    title_override?: string | null;
    subtitle?: string | null;
    image?: string | null;
    series?: Series | null;
  }[];
  latest_episodes?: LatestEpisode[];
  featured_sections?: unknown[];
  catalog_sections?: CatalogSection[];
};

type ExploreBody = {
  data?: Series[];
  meta?: { page?: number; limit?: number; total?: number; total_pages?: number };
};

type ListBody<T> = {
  data?: T[];
  meta?: { total?: number; page?: number; limit?: number };
};

type FiltersBody = {
  data?: {
    categories?: { slug?: string; name?: string }[];
    genres?: { slug?: string; name?: string }[];
    studios?: { slug?: string; name?: string }[];
    years?: number[];
  };
};

type SourcesBody = {
  data?: {
    episode_id?: string;
    videos?: Video[];
  };
};

/* —— helpers —— */

function cleanTitle(s?: string | null): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function cleanNumber(n?: string | number | null): string | null {
  if (n === undefined || n === null || n === "") return null;
  const s = String(n).trim();
  if (!s) return null;
  const num = Number(s);
  return Number.isFinite(num) ? String(num) : s;
}

function imageUrl(file: ImageRef | undefined): string | null {
  const name = typeof file === "string" ? file : file?.filename_disk;
  if (!name) return null;
  if (/^https?:\/\//i.test(name)) return name;
  return `${ASSETS_BASE}/${name}`;
}

function absolutize(p?: string | null, kind: "hls" | "mp4" = "mp4"): string | null {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const s = p.replace(/^\//, "");
  return kind === "hls" ? `${HLS_BASE}/${s}` : `${VIDEO_BASE}/${s}`;
}

function toVideo(v: Video): DonghuaVideo | null {
  const isHls = [v.streaming_url, v.hls_url, v.backup_url].some((u) =>
    String(u || "").includes(".m3u8"),
  );
  const url =
    absolutize(v.streaming_url, "hls") ||
    absolutize(v.hls_url, "hls") ||
    absolutize(v.download_url || v.r2_url, "mp4") ||
    absolutize(v.backup_url, isHls ? "hls" : "mp4");
  if (!url) return null;
  return {
    id: v.id,
    quality: v.quality || null,
    url,
    downloadUrl: absolutize(v.download_url || v.r2_url, "mp4"),
    isDubbed: v.is_dubbed,
    fileSize: v.file_size ?? null,
  };
}

function qualityRank(q?: string | null): number {
  const n = Number((q || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toSubtitles(items: Subtitle[] | undefined): DonghuaSubtitle[] {
  const out: DonghuaSubtitle[] = [];
  const seen = new Set<string>();
  for (const s of items || []) {
    if (!s?.id || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({
      id: s.id,
      language: s.language || null,
      label: cleanTitle(s.label) || (s.language || "Subtitle").toUpperCase(),
      url: `/api/donghua-subtitle/${encodeURIComponent(s.id)}`,
      isDefault: Boolean(s.is_default),
    });
  }
  return out.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

function statusLabel(status?: string): string | null {
  const s = (status || "").toLowerCase();
  if (s === "ongoing") return "Ongoing";
  if (s === "completed") return "Completed";
  return null;
}

function itemFromSeries(s: Series, season?: Season | null): DonghuaItem {
  const latest = season ?? s.latest_season ?? s.seasons?.[0] ?? null;
  const total = latest?.total_episodes ?? latest?.episode_count ?? null;
  const seasonNo = latest?.season_number;
  const epLabel = total
    ? `${total} Ep`
    : seasonNo && seasonNo > 1
      ? `S${seasonNo}`
      : null;
  return {
    slug: s.slug,
    title: cleanTitle(s.title) || s.slug,
    cover: imageUrl(s.poster_image) || imageUrl(latest?.poster_image),
    type: cleanTitle(latest?.type?.name) || "Donghua",
    epLabel,
    status: statusLabel(latest?.airing_status),
    sub: "Sub",
    isEpisode: false,
  };
}

function itemFromLatestEpisode(x: LatestEpisode): DonghuaItem {
  const ep = x.latest_episode;
  const num = cleanNumber(ep?.number);
  return {
    slug: x.series_slug || "",
    title: cleanTitle(x.series_title) || x.series_slug || "Donghua",
    cover: imageUrl(x.poster_image) || imageUrl(x.season_poster_image) || imageUrl(ep?.thumbnail),
    type: cleanTitle(x.season_type) || "Donghua",
    epLabel: num ? `Ep ${num}` : x.season_number ? `S${x.season_number}` : null,
    status: null,
    sub: "Sub",
    href: ep?.id ? `/donghua/watch/${ep.id}` : undefined,
    isEpisode: Boolean(ep?.id),
  };
}

function sortEpisodes(a: DonghuaEpisodeItem, b: DonghuaEpisodeItem): number {
  const na = Number(a.number);
  const nb = Number(b.number);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return (a.label || "").localeCompare(b.label || "", undefined, { numeric: true });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function episodeFields(): string[] {
  return [
    "id",
    "number",
    "title",
    "title_id",
    "synopsis",
    "thumbnail.filename_disk",
    "duration",
    "air_date",
    "is_filler",
    "is_premium",
    "status",
    "sort",
    "videos.id",
    "videos.quality",
    "videos.r2_url",
    "videos.hls_url",
    "videos.backup_url",
    "videos.status",
    "videos.file_size",
    "subtitles.id",
    "subtitles.language",
    "subtitles.label",
    "subtitles.is_default",
    "subtitles.format",
    "subtitles.file.filename_disk",
    "subtitles.file_url",
  ];
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) if (item !== undefined && item !== null) sp.append(k, String(item));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/* —— public API (nama sama dengan modul anichin lama) —— */

export type DonghuaSection = { key: string; title: string; items: DonghuaItem[] };

export type DonghuaGenre = { name: string; slug: string; count?: number };

export type DonghuaHome = { sections: DonghuaSection[]; genres: DonghuaGenre[] };

export type DonghuaListPage = {
  items: DonghuaItem[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  title: string | null;
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
  seriesTitle: string;
  number: string | null;
  cover: string | null;
  detailSlug: string | null;
  videos: DonghuaVideo[];
  subtitles: DonghuaSubtitle[];
  prev: { slug: string; label: string } | null;
  next: { slug: string; label: string } | null;
  synopsis: string | null;
};

const SERIES_LIST_FIELDS = [
  "id",
  "title",
  "slug",
  "poster_image.filename_disk",
  "content_rating",
  "category.slug",
  "original_language",
  "date_created",
  "seasons.id",
  "seasons.season_number",
  "seasons.airing_status",
  "seasons.release_year",
  "seasons.mal_score",
  "seasons.total_episodes",
  "seasons.type.name",
  "seasons.poster_image.filename_disk",
];

const SERIES_DETAIL_FIELDS = [
  "id",
  "title",
  "title_english",
  "title_native",
  "title_romaji",
  "slug",
  "synopsis",
  "synopsis_id",
  "poster_image.filename_disk",
  "backdrop_image.filename_disk",
  "trailer_url",
  "content_rating",
  "original_language",
  "status",
  "category.slug",
  "category.name",
  "genres.genres_id.id",
  "genres.genres_id.name",
  "genres.genres_id.slug",
  "seasons.id",
  "seasons.season_number",
  "seasons.title",
  "seasons.synopsis",
  "seasons.synopsis_id",
  "seasons.poster_image.filename_disk",
  "seasons.airing_status",
  "seasons.broadcast_day",
  "seasons.broadcast_time",
  "seasons.mal_score",
  "seasons.studio.name",
  "seasons.release_year",
  "seasons.type.name",
  "seasons.total_episodes",
];

const EPISODE_DETAIL_FIELDS = [
  "id",
  "number",
  "title",
  "title_id",
  "synopsis",
  "thumbnail.filename_disk",
  "duration",
  "air_date",
  "is_filler",
  "is_premium",
  "series_id.id",
  "series_id.title",
  "series_id.slug",
  "series_id.poster_image.filename_disk",
  "season_id.id",
  "season_id.season_number",
  "season_id.title",
  "season_id.type.name",
  "subtitle_offset_percent",
  "videos.id",
  "videos.quality",
  "videos.r2_url",
  "videos.hls_url",
  "videos.backup_url",
  "videos.file_size",
  "videos.codec",
  "videos.status",
  "subtitles.id",
  "subtitles.language",
  "subtitles.label",
  "subtitles.format",
  "subtitles.file.filename_disk",
  "subtitles.file_url",
  "subtitles.is_default",
  "subtitles.sort",
];

async function fetchFilters(): Promise<NonNullable<FiltersBody["data"]>> {
  const cached = cacheGet<NonNullable<FiltersBody["data"]>>("filters");
  if (cached) return cached;
  const body = await apiGet<FiltersBody>("/explore/filters");
  const data = body.data || {};
  cacheSet("filters", data);
  return data;
}

export async function fetchDonghuaHome(): Promise<DonghuaHome> {
  const cached = cacheGet<DonghuaHome>("home");
  if (cached) return cached;

  const body = await apiGet<{ data?: HomeFeed }>("/home-feed?category=donghua");
  const feed = body.data || {};
  const sections: DonghuaSection[] = [];

  const latest = (feed.latest_episodes || [])
    .filter((x) => x?.latest_episode?.id)
    .map(itemFromLatestEpisode);
  if (latest.length) {
    sections.push({ key: "episode-terbaru", title: "Episode Terbaru", items: latest });
  }

  for (const s of feed.catalog_sections || []) {
    const title = cleanTitle(s.title);
    if (!title) continue;
    const items = (s.items || []).map((it) => itemFromSeries(it, it.latest_season));
    if (!items.length) continue;
    sections.push({ key: slugify(title), title, items });
  }

  let genres: DonghuaGenre[] = [];
  try {
    const filters = await fetchFilters();
    genres = (filters.genres || [])
      .filter((g) => g.slug && g.name && !/hentai|erotica/i.test(g.slug))
      .map((g) => ({ name: cleanTitle(g.name), slug: g.slug as string }));
  } catch {
    genres = [];
  }

  const data = { sections, genres };
  cacheSet("home", data);
  return data;
}

export async function fetchDonghuaCatalog(page = 1): Promise<DonghuaListPage> {
  const key = `catalog:${page}`;
  const cached = cacheGet<DonghuaListPage>(key);
  if (cached) return cached;

  const body = await apiGet<ExploreBody>(
    `/explore${qs({ category: "donghua", sort: "latest", page, limit: 24 })}`,
  );
  const items = (body.data || []).map((it) => itemFromSeries(it, it.latest_season));
  const totalPages = body.meta?.total_pages ?? null;
  const data: DonghuaListPage = {
    items,
    page,
    hasPrev: page > 1,
    hasNext: totalPages != null ? page < totalPages : items.length >= 24,
    title: "Donghua List",
    totalPages,
  };
  cacheSet(key, data);
  return data;
}

export async function fetchDonghuaGenre(
  genreSlug: string,
  page = 1,
): Promise<DonghuaListPage | null> {
  const key = `genre:${genreSlug}:${page}`;
  const cached = cacheGet<DonghuaListPage>(key);
  if (cached) return cached;

  const body = await apiGet<ExploreBody>(
    `/explore${qs({
      category: "donghua",
      genre: genreSlug,
      sort: "popular",
      page,
      limit: 24,
    })}`,
  );
  const items = (body.data || []).map((it) => itemFromSeries(it, it.latest_season));
  if (!items.length && page <= 1) return null;

  let title = genreSlug.replace(/-/g, " ");
  try {
    const filters = await fetchFilters();
    const found = (filters.genres || []).find((g) => g.slug === genreSlug);
    if (found?.name) title = cleanTitle(found.name);
  } catch {
    /* pakai slug */
  }

  const totalPages = body.meta?.total_pages ?? null;
  const data: DonghuaListPage = {
    items,
    page,
    hasPrev: page > 1,
    hasNext: totalPages != null ? page < totalPages : items.length >= 24,
    title,
    totalPages,
  };
  cacheSet(key, data);
  return data;
}

export async function fetchDonghuaSearch(q: string): Promise<DonghuaItem[] | null> {
  const query = q.trim();
  if (!query) return [];
  const key = `search:${query.toLowerCase()}`;
  const cached = cacheGet<DonghuaItem[]>(key);
  if (cached) return cached;

  try {
    const body = await apiGet<ListBody<Series>>(
      `/items/series${qs({
        search: query,
        limit: 30,
        sort: "-date_created",
        fields: SERIES_LIST_FIELDS,
        "filter[category][slug][_eq]": "donghua",
      })}`,
    );
    const items = (body.data || []).map((it) => itemFromSeries(it, it.seasons?.[0]));
    cacheSet(key, items);
    return items;
  } catch {
    return null;
  }
}

export async function fetchDonghuaDetail(slug: string): Promise<DonghuaDetail | null> {
  const clean = slug.replace(/^\/+|\/+$/g, "").replace(/^donghua\//, "");
  if (!clean || UUID_RE.test(clean)) return null;
  const key = `detail:${clean}`;
  const cached = cacheGet<DonghuaDetail>(key);
  if (cached) return cached;

  let series: Series | null = null;
  try {
    const body = await apiGet<ListBody<Series>>(
      `/items/series${qs({
        "filter[slug][_eq]": clean,
        "filter[category][slug][_eq]": "donghua",
        limit: 1,
        fields: SERIES_DETAIL_FIELDS,
      })}`,
    );
    series = body.data?.[0] || null;
  } catch (e) {
    console.error("[dongha] detail series", e);
    return null;
  }
  if (!series) return null;

  const seasons = Array.isArray(series.seasons) ? series.seasons : [];
  const withEpisodes = seasons.filter((s) => s.airing_status !== "upcoming");
  const multiSeason = withEpisodes.length > 1;

  await Promise.all(
    seasons.map(async (season) => {
      try {
        const body = await apiGet<ListBody<Episode>>(
          `/items/episodes${qs({
            "filter[season_id][_eq]": season.id,
            "filter[status][_eq]": "published",
            sort: "number",
            limit: 1000,
            fields: episodeFields(),
          })}`,
        );
        season.episodes = body.data || [];
      } catch (e) {
        console.error("[dongha] detail episodes", season.id, e);
        season.episodes = [];
      }
      season.episode_count = season.episodes?.length ?? 0;
    }),
  );

  const episodes: DonghuaEpisodeItem[] = [];
  for (const season of seasons) {
    for (const ep of season.episodes || []) {
      const num = cleanNumber(ep.number);
      const pad = num ? `E${num}` : "";
      episodes.push({
        slug: ep.id,
        number: num,
        label:
          multiSeason && season.season_number
            ? `S${season.season_number}${pad ? ` ${pad}` : ""}`
            : num,
        title: cleanTitle(ep.title) || (num ? `Episode ${num}` : "Episode"),
        date: ep.air_date ? ep.air_date.slice(0, 10) : null,
      });
    }
  }
  episodes.sort(sortEpisodes);

  const latestSeason = withEpisodes[withEpisodes.length - 1] ?? seasons[0] ?? null;
  const latestEp = episodes[episodes.length - 1] ?? null;

  const genres: DonghuaGenre[] = [];
  for (const g of series.genres || []) {
    const ref = g.genres_id || g;
    if (ref?.slug && ref?.name) genres.push({ name: cleanTitle(ref.name), slug: ref.slug });
  }

  const info: { label: string; value: string }[] = [];
  const status = statusLabel(latestSeason?.airing_status);
  if (status) info.push({ label: "Status", value: status });
  if (latestSeason?.type?.name) info.push({ label: "Tipe", value: cleanTitle(latestSeason.type.name) });
  if (latestSeason?.studio?.name)
    info.push({ label: "Studio", value: cleanTitle(latestSeason.studio.name) });
  if (latestSeason?.release_year)
    info.push({ label: "Tahun rilis", value: String(latestSeason.release_year) });
  if (episodes.length) info.push({ label: "Episode", value: String(episodes.length) });
  if (latestSeason?.mal_score)
    info.push({ label: "Skor", value: String(latestSeason.mal_score) });
  if (series.content_rating)
    info.push({ label: "Rating", value: cleanTitle(series.content_rating) });
  if (series.original_language)
    info.push({ label: "Bahasa", value: cleanTitle(series.original_language).toUpperCase() });
  info.push({ label: "Subber", value: "Dongha" });

  const altTitle =
    cleanTitle(series.title_english) ||
    cleanTitle(series.title_romaji) ||
    cleanTitle(series.title_native) ||
    null;

  const data: DonghuaDetail = {
    slug: series.slug,
    title: cleanTitle(series.title) || cleanTitle(series.title_english) || series.slug,
    altTitle: altTitle && altTitle !== series.title ? altTitle : null,
    cover: imageUrl(series.poster_image) || imageUrl(latestSeason?.poster_image),
    synopsis: cleanTitle(series.synopsis_id) || cleanTitle(series.synopsis),
    info,
    genres,
    episodes,
    latest: latestEp,
    totalEpisodes: episodes.length || null,
  };
  cacheSet(key, data);
  return data;
}

async function fetchSeasonEpisodes(seasonId: string): Promise<Episode[]> {
  try {
    const body = await apiGet<ListBody<Episode>>(
      `/items/episodes${qs({
        "filter[season_id][_eq]": seasonId,
        "filter[status][_eq]": "published",
        sort: "number",
        limit: 1000,
        fields: episodeFields(),
      })}`,
    );
    return body.data || [];
  } catch {
    return [];
  }
}

export async function fetchDonghuaEpisode(episodeId: string): Promise<DonghuaEpisodePage | null> {
  if (!UUID_RE.test(episodeId)) return null;
  const key = `episode:${episodeId}`;
  const cached = cacheGet<DonghuaEpisodePage>(key);
  if (cached) return cached;

  let episode: Episode;
  let sources: SourcesBody["data"] = {};
  try {
    const [ep, src] = await Promise.all([
      apiGet<{ data?: Episode }>(
        `/items/episodes/${episodeId}${qs({ fields: EPISODE_DETAIL_FIELDS })}`,
      ),
      apiGet<SourcesBody>(`/media/episodes/${episodeId}/sources`),
    ]);
    if (!ep.data) return null;
    episode = ep.data;
    sources = src.data || {};
  } catch {
    return null;
  }

  const seasonId = episode.season_id?.id;
  const seasonNo = episode.season_id?.season_number;
  const siblings = seasonId ? await fetchSeasonEpisodes(seasonId) : [];
  const ordered = [...siblings].sort(
    (a, b) => Number(a.number || 0) - Number(b.number || 0),
  );
  const idx = ordered.findIndex((e) => e.id === episodeId);

  const makeNav = (e: Episode | undefined): { slug: string; label: string } | null => {
    if (!e) return null;
    const num = cleanNumber(e.number);
    return { slug: e.id, label: num ? `Ep ${num}` : "Episode" };
  };

  const rawVideos = [...(sources?.videos || [])];
  for (const v of episode.videos || []) {
    if (!rawVideos.some((x) => x.id === v.id)) rawVideos.push(v);
  }
  const videos = rawVideos
    .map(toVideo)
    .filter((v): v is DonghuaVideo => Boolean(v))
    .sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));

  const number = cleanNumber(episode.number);
  const seriesTitle =
    cleanTitle(episode.series_id?.title) ||
    cleanTitle(episode.season_id?.title) ||
    "Donghua";

  const data: DonghuaEpisodePage = {
    slug: episode.id,
    title:
      cleanTitle(episode.title) ||
      `${seriesTitle}${number ? ` Episode ${number}` : ""}`,
    seriesTitle,
    number,
    cover:
      imageUrl(episode.series_id?.poster_image) ||
      imageUrl(episode.season_id?.poster_image) ||
      imageUrl(episode.thumbnail),
    detailSlug: episode.series_id?.slug ?? null,
    videos,
    subtitles: toSubtitles(episode.subtitles),
    prev: idx > 0 ? makeNav(ordered[idx - 1]) : null,
    next: idx >= 0 && idx < ordered.length - 1 ? makeNav(ordered[idx + 1]) : null,
    synopsis: cleanTitle(episode.synopsis) || null,
  };
  void seasonNo;
  cacheSet(key, data);
  return data;
}

/** Isi subtitle VTT dari gateway (butuh auth, jadi lewat route API di app). */
export async function fetchSubtitleVtt(subtitleId: string): Promise<string> {
  if (!UUID_RE.test(subtitleId)) throw new Error("invalid subtitle id");
  const key = `vtt:${subtitleId}`;
  const cached = cacheGet<string>(key);
  if (cached !== null) return cached;
  const g = await getGateway();
  let res = await g.get<unknown>(`/subtitles-vtt/${subtitleId}`, { allowError: true });
  if (res.status === 401) {
    await ensureCreds(true);
    res = await (await getGateway()).get<unknown>(`/subtitles-vtt/${subtitleId}`, {
      allowError: true,
    });
  }
  if (res.status >= 400) throw new HttpError(`subtitle HTTP ${res.status}`, res.status, res.body);
  const text = res.raw.length ? res.raw.toString("utf8") : String(res.body ?? "");
  cacheSet(key, text);
  return text;
}

/** Saran pencarian (dropdown) — slug detail biar `/donghua/<slug>` selalu valid. */
export async function suggestDonghua(
  q: string,
  limit = 8,
): Promise<{ slug: string; title: string; cover: string | null; meta: string }[] | null> {
  const items = await fetchDonghuaSearch(q);
  if (items === null) return null;
  const out: { slug: string; title: string; cover: string | null; meta: string }[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!it.slug || seen.has(it.slug)) continue;
    seen.add(it.slug);
    out.push({
      slug: it.slug,
      title: it.title,
      cover: it.cover,
      meta: [it.epLabel, it.type].filter(Boolean).join(" · ") || "Donghua",
    });
    if (out.length >= limit) break;
  }
  return out;
}
