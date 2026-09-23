
/**
 * AnimeHub CLI — reverse-engineered API client
 *
 * Usage:
 *   node animehub.js <command> [args...]
 *   node animehub.js help
 *
 * Run: node animehub.js help
 */

const BASE = "https://karanime.com/wp-json/wp/v2";
const CDN_HOST_HINT = "r2.umum.work";

/** Taxonomy IDs (hard-coded di APK AnimeHub) */
const IDS = {
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
};

/** Field ringan untuk LIST — tanpa ab_cdngroup (episode) */
const LIST_FIELDS = [
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

/**
 * Search endpoint balikin id salah (404) + meta_box tipis.
 * Hydrate ulang via slug biar id & field list (status/skor/ep/…) valid.
 */
async function hydrateBySlug(items) {
  if (!Array.isArray(items) || items.length === 0) return items;
  return Promise.all(
    items.map(async (s) => {
      const slug = s?.slug;
      if (!slug) return s;
      try {
        const arr = await api("/animes", { slug, _fields: LIST_FIELDS });
        const full = Array.isArray(arr) ? arr[0] : null;
        if (!full) return s;
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
          // merge: pertahanin ero_episodebaru dari search sbg fallback
          meta_box: { ...s.meta_box, ...full.meta_box },
        };
      } catch {
        return s;
      }
    }),
  );
}

// ─── HTTP ───────────────────────────────────────────────────────────

async function api(path, params = {}, { full = false } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "animehub-cli/1.0" },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (full) {
    return {
      ok: res.ok,
      status: res.status,
      total: res.headers.get("x-wp-total"),
      totalPages: res.headers.get("x-wp-totalpages"),
      url: url.toString(),
      body,
    };
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body
        ? JSON.stringify(body)
        : String(body).slice(0, 300);
    throw Object.assign(new Error(`HTTP ${res.status} — ${msg}`), {
      status: res.status,
      url: url.toString(),
    });
  }
  return body;
}

async function head(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return {
      status: res.status,
      type: res.headers.get("content-type"),
      length: res.headers.get("content-length"),
      ranges: res.headers.get("accept-ranges"),
      url: res.url,
    };
  } catch (e) {
    return { status: 0, error: String(e.message || e), url };
  }
}

function encodeMedia(url) {
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

// ─── format ────────────────────────────────────────────────────────

function stripHtml(s = "") {
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

function titleOf(x) {
  return stripHtml(x?.title?.rendered ?? x?.title ?? "");
}

function cardLine(x) {
  const mb = Array.isArray(x.meta_box) ? {} : x.meta_box || {};
  const eps = mb.ero_episode ?? mb.ero_episodebaru ?? "?";
  return [
    `#${x.id}`,
    titleOf(x),
    mb.ero_status || "",
    mb.ero_type || "",
    mb.ero_tayang || "",
    `ep=${eps}`,
    `score=${mb.ero_skor || "-"}`,
    `sub=${mb.ero_sub || "-"}`,
  ]
    .filter(Boolean)
    .join("  |  ");
}

function printJson(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function printList(arr, meta = {}) {
  if (meta.total != null) {
    console.error(
      `# total=${meta.total} pages=${meta.totalPages} returned=${Array.isArray(arr) ? arr.length : "?"}`,
    );
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    console.log("(empty)");
    return;
  }
  for (const x of arr) console.log(cardLine(x));
}

function resolveTaxoParam(key, val, table) {
  if (val == null || val === "") return undefined;
  const s = String(val).toLowerCase();
  if (/^\d+$/.test(s)) return s;
  if (table && table[s] != null) return String(table[s]);
  throw new Error(
    `Nilai ${key}="${val}" tidak dikenal. Pakai ID angka atau salah satu: ${Object.keys(table || {}).join(", ")}`,
  );
}

function parseFlags(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      pos.push(a);
    }
  }
  return { flags, pos };
}

function need(cond, msg) {
  if (!cond) {
    console.error("ERROR:", msg);
    process.exit(1);
  }
}

// ─── commands ──────────────────────────────────────────────────────

const commands = {
  /** HOME / LIST */
  async latest(flags) {
    // ongoing terbaru
    const status = resolveTaxoParam("status", flags.status ?? "ongoing", IDS.status);
    const type = resolveTaxoParam("type", flags.type, IDS.type);
    const params = {
      animestatus: status,
      orderby: flags.orderby ?? "modified",
      order: flags.order ?? "desc",
      per_page: flags.limit ?? 12,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    if (type) params.animetype = type;
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  async ongoing(flags) {
    return commands.latest({ ...flags, status: "ongoing" });
  },

  async completed(flags) {
    return commands.latest({ ...flags, status: "completed", orderby: flags.orderby ?? "date" });
  },

  async movie(flags) {
    const params = {
      animetype: IDS.type.movie,
      orderby: flags.orderby ?? "date",
      order: flags.order ?? "desc",
      per_page: flags.limit ?? 12,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    if (flags.status) params.animestatus = resolveTaxoParam("status", flags.status, IDS.status);
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  async top(flags) {
    const params = {
      animetop: IDS.top.ya,
      orderby: flags.orderby ?? "modified",
      order: flags.order ?? "desc",
      per_page: flags.limit ?? 12,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  async random(flags) {
    const params = {
      orderby: "rand",
      order: "asc",
      per_page: flags.limit ?? 10,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    if (flags.status) params.animestatus = resolveTaxoParam("status", flags.status, IDS.status);
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  async az(flags) {
    const params = {
      orderby: "title",
      order: flags.order ?? "asc",
      per_page: flags.limit ?? 24,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  /** SEARCH */
  async search(flags, pos) {
    const q = pos[0] ?? flags.q ?? flags.query;
    need(q, 'Usage: node animehub.js search "naruto" [--limit 12] [--page 1] [--status ongoing|completed|ID] [--json] [--all] [--raw]');
    const params = {
      search: q,
      per_page: flags.limit ?? 12,
      page: flags.page ?? 1,
      orderby: flags.orderby ?? undefined,
      order: flags.order ?? undefined,
      // search endpoint beda shape: id sering 404 + meta_box tipis → hydrate via slug kecuali --raw
      _fields: "id,slug,title,date,modified,featured_media,link,meta_box.ero_episodebaru,meta_box.ero_seri,meta_box.ero_credit",
    };
    if (flags.status) params.animestatus = resolveTaxoParam("status", flags.status, IDS.status);

    async function finish(items, meta = {}) {
      const body = flags.raw ? items : await hydrateBySlug(items);
      if (flags.json) {
        if (meta.total != null) {
          console.error(`# total=${meta.total} pages=${meta.totalPages}${flags.all ? " (all)" : ""}`);
        }
        return printJson(body);
      }
      return printList(body, meta);
    }

    if (flags.all) {
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const r = await api("/animes", { ...params, per_page: 100, page }, { full: true });
        if (!Array.isArray(r.body) || r.body.length === 0) break;
        items.push(...r.body);
        totalPages = Number(r.totalPages) || page;
        page++;
      } while (page <= totalPages);
      return finish(items, { total: items.length, totalPages });
    }

    const r = await api("/animes", params, { full: true });
    const items = Array.isArray(r.body) ? r.body : [];
    return finish(items, { total: r.total, totalPages: r.totalPages });
  },

  /** DETAIL */
  async detail(flags, pos) {
    const key = pos[0] ?? flags.id ?? flags.slug;
    need(key, 'Usage: node animehub.js detail <id|slug> [--json]');
    let data;
    if (/^\d+$/.test(String(key))) {
      data = await api(`/animes/${key}`);
      if (Array.isArray(data)) data = data[0];
    } else {
      const arr = await api("/animes", { slug: key });
      data = Array.isArray(arr) ? arr[0] : arr;
    }
    need(data, `Anime "${key}" tidak ditemukan`);
    if (flags.json) return printJson(data);
    printDetail(data);
  },

  async episodes(flags, pos) {
    const key = pos[0] ?? flags.id ?? flags.slug;
    need(key, 'Usage: node animehub.js episodes <id|slug> [--json]');
    const data = await loadAnime(key);
    const eps = sortEps(data?.meta_box?.ab_cdngroup || []);
    if (flags.json) return printJson(eps);
    console.log(`# ${titleOf(data)}  id=${data.id}  episodes=${eps.length}`);
    for (const e of eps) {
      console.log(`ep ${String(e.ab_namaep).padStart(4, " ")}  ${e.ab_linkcdn}`);
    }
  },

  async play(flags, pos) {
    const key = pos[0] ?? flags.id ?? flags.slug;
    need(key, 'Usage: node animehub.js play <id|slug> --ep <n> [--probe]');
    const ep = flags.ep ?? flags.episode;
    need(ep != null, "Wajib: --ep <nomor episode>");
    const data = await loadAnime(key);
    const eps = sortEps(data?.meta_box?.ab_cdngroup || []);
    const target = eps.find((e) => String(e.ab_namaep) === String(ep));
    need(target, `Episode ${ep} tidak ada. Tersedia: ${eps.map((e) => e.ab_namaep).join(", ") || "(kosong)"}`);
    const raw = target.ab_linkcdn;
    const playable = encodeMedia(raw);
    const out = {
      anime: titleOf(data),
      animeId: data.id,
      slug: data.slug,
      episode: target.ab_namaep,
      raw,
      playable,
    };
    if (flags.probe !== false && flags["no-probe"] === undefined) {
      out.head = await head(playable);
    }
    printJson(out);
  },

  /** FILTER / LIST VARIAN */
  async genrelist(flags) {
    const params = {
      per_page: flags.limit ?? 100,
      page: flags.page ?? 1,
      orderby: flags.orderby ?? "id",
      order: flags.order ?? "asc",
    };
    const r = await api("/animegenre", params, { full: true });
    if (flags.json) return printJson(r.body);
    console.error(`# genres total=${r.total} pages=${r.totalPages}`);
    for (const g of r.body || []) {
      console.log(`${String(g.id).padStart(5)}  ${g.name}  (count=${g.count})  slug=${g.slug}`);
    }
  },

  async genre(flags, pos) {
    const g = pos[0] ?? flags.name ?? flags.id;
    need(g, 'Usage: node animehub.js genre <id|slug|nama> [--limit 12] [--page 1]');
    let id = /^\d+$/.test(String(g)) ? String(g) : null;
    if (!id) {
      const all = await api("/animegenre", { per_page: 100, orderby: "id", order: "asc" });
      const slug = String(g).toLowerCase();
      const hit = all.find((x) => x.slug === slug || x.name.toLowerCase() === slug);
      need(hit, `Genre "${g}" tidak ditemukan. Lihat: node animehub.js genrelist`);
      id = String(hit.id);
      console.error(`# resolved ${g} -> id=${id} (${hit.name})`);
    }
    const params = {
      animegenre: id,
      orderby: flags.orderby ?? "modified",
      order: flags.order ?? "desc",
      per_page: flags.limit ?? 12,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  async jadwal(flags, pos) {
    const day = pos[0] ?? flags.day;
    need(day, `Usage: node animehub.js jadwal <senin|selasa|...|minggu|random|ID>`);
    const id = resolveTaxoParam("jadwal", day, IDS.jadwal);
    const params = {
      jadwalrilis: id,
      orderby: flags.orderby ?? "title",
      order: flags.order ?? "asc",
      per_page: flags.limit ?? 50,
      page: flags.page ?? 1,
      _fields: LIST_FIELDS,
    };
    const r = await api("/animes", params, { full: true });
    printList(r.body, r);
  },

  async statuslist(flags) {
    const r = await api("/animestatus", { per_page: 100 }, { full: true });
    if (flags.json) return printJson(r.body);
    for (const t of r.body || []) console.log(`${t.id}  ${t.name}  slug=${t.slug} count=${t.count}`);
  },

  async typelist(flags) {
    const r = await api("/animetype", { per_page: 100 }, { full: true });
    if (flags.json) return printJson(r.body);
    for (const t of r.body || []) console.log(`${t.id}  ${t.name}  slug=${t.slug} count=${t.count}`);
  },

  async jadwallist(flags) {
    const r = await api("/jadwalrilis", { per_page: 100 }, { full: true });
    if (flags.json) return printJson(r.body);
    for (const t of r.body || []) console.log(`${t.id}  ${t.name}  slug=${t.slug} count=${t.count}`);
  },

  async studiolist(flags) {
    const r = await api("/Studio", {
      per_page: flags.limit ?? 100,
      page: flags.page ?? 1,
      orderby: "count",
      order: "desc",
    }, { full: true });
    if (flags.json) return printJson(r.body);
    console.error(`# studios total=${r.total}`);
    for (const t of r.body || []) console.log(`${t.id}  ${t.name}  count=${t.count}`);
  },

  async seasonlist(flags) {
    const r = await api("/animeseason", {
      per_page: flags.limit ?? 50,
      page: flags.page ?? 1,
      orderby: "id",
      order: "desc",
    }, { full: true });
    if (flags.json) return printJson(r.body);
    console.error(`# seasons total=${r.total}`);
    for (const t of r.body || []) console.log(`${t.id}  ${t.name}  slug=${t.slug}`);
  },

  async filter(flags) {
    // generic multi-filter
    const params = {
      per_page: flags.limit ?? 12,
      page: flags.page ?? 1,
      orderby: flags.orderby ?? "modified",
      order: flags.order ?? "desc",
      _fields: flags.raw ? undefined : LIST_FIELDS,
    };
    if (flags.status) params.animestatus = resolveTaxoParam("status", flags.status, IDS.status);
    if (flags.type) params.animetype = resolveTaxoParam("type", flags.type, IDS.type);
    if (flags.top) params.animetop = resolveTaxoParam("top", flags.top, IDS.top);
    if (flags.genre) params.animegenre = resolveTaxoParam("genre", flags.genre, null) ?? flags.genre;
    if (flags.jadwal) params.jadwalrilis = resolveTaxoParam("jadwal", flags.jadwal, IDS.jadwal);
    if (flags.season) params.animeseason = flags.season;
    if (flags.studio) params.Studio = flags.studio;
    if (flags.search) params.search = flags.search;
    const r = await api("/animes", params, { full: true });
    if (flags.json) {
      console.error(`# total=${r.total} pages=${r.totalPages} url=${r.url}`);
      return printJson(r.body);
    }
    printList(r.body, r);
    if (flags.url) console.error(r.url);
  },

  async raw(flags, pos) {
    const path = pos[0] ?? flags.path;
    need(path, 'Usage: node animehub.js raw "/animes?search=naruto&per_page=3"');
    // allow full path with query already
    if (path.startsWith("http")) {
      const res = await fetch(path, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => null);
      console.error(`HTTP ${res.status} total=${res.headers.get("x-wp-total")} pages=${res.headers.get("x-wp-totalpages")}`);
      return printJson(body);
    }
    const [p, qs] = path.split("?");
    const params = {};
    if (qs) for (const [k, v] of new URLSearchParams(qs)) params[k] = v;
    const r = await api(p, params, { full: true });
    console.error(`HTTP ${r.status} total=${r.total} pages=${r.totalPages}`);
    console.error(r.url);
    printJson(r.body);
  },

  async info() {
    printJson({
      base: BASE,
      collections: {
        animes: "/animes",
        animegenre: "/animegenre",
        animetype: "/animetype",
        animestatus: "/animestatus",
        animetop: "/animetop",
        jadwalrilis: "/jadwalrilis",
        animeseason: "/animeseason",
        Studio: "/Studio",
        media: "/media/{id}",
      },
      ids: IDS,
      video: {
        field: "meta_box.ab_cdngroup[].ab_linkcdn",
        host: CDN_HOST_HINT,
        note: "MP4 langsung, URL-encode spasi & []",
      },
      auth: "none for GET",
      perPage: "1..100 (0/101 => 400)",
      paginationHeaders: ["X-WP-Total", "X-WP-TotalPages", "Link"],
    });
  },

  help() {
    printHelp();
  },
};

async function loadAnime(key) {
  if (/^\d+$/.test(String(key))) {
    const d = await api(`/animes/${key}`);
    return Array.isArray(d) ? d[0] : d;
  }
  const arr = await api("/animes", { slug: key });
  return Array.isArray(arr) ? arr[0] : arr;
}

function sortEps(list) {
  return [...list].sort((a, b) => Number(a.ab_namaep) - Number(b.ab_namaep));
}

function printDetail(x) {
  const mb = x.meta_box || {};
  const eps = sortEps(mb.ab_cdngroup || []);
  console.log(`ID          : ${x.id}`);
  console.log(`Slug        : ${x.slug}`);
  console.log(`Title       : ${titleOf(x)}`);
  console.log(`Link        : ${x.link}`);
  console.log(`Modified    : ${x.modified}`);
  console.log(`Status tax  : ${(x.animestatus || []).join(",")}  (${mb.ero_status || "?"})`);
  console.log(`Type tax    : ${(x.animetype || []).join(",")}  (${mb.ero_type || "?"})`);
  console.log(`Genre tax   : ${(x.animegenre || []).join(",")}`);
  console.log(`Genre label : ${mb.ero_genreapp || ""}`);
  console.log(`Score       : ${mb.ero_skor || "-"}  Year=${mb.ero_tayang || "-"}  Ep=${mb.ero_episode || "-"}  Sub=${mb.ero_sub || "-"}`);
  console.log(`Duration    : ${mb.ero_durasi || "-"}`);
  console.log(`Japanese    : ${mb.ero_japanese || "-"}`);
  console.log(`Trailer YT  : ${mb.ero_trailer || "-"}`);
  console.log(`Cover       : ${mb.ero_image || ""}`);
  console.log(`featured_media: ${x.featured_media}`);
  console.log(`Episodes    : ${eps.length}`);
  if (eps[0]) console.log(`  first     : ep ${eps[0].ab_namaep} -> ${eps[0].ab_linkcdn}`);
  if (eps.at(-1)) console.log(`  last      : ep ${eps.at(-1).ab_namaep} -> ${eps.at(-1).ab_linkcdn}`);
  const syn = stripHtml(x.content?.rendered || "");
  console.log(`Synopsis    : ${syn.slice(0, 280)}${syn.length > 280 ? "…" : ""}`);
  console.log(`\n# contoh play:`);
  if (eps[0]) console.log(`node animehub.js play ${x.id} --ep ${eps[0].ab_namaep}`);
}

function printHelp() {
  console.log(`
AnimeHub CLI  —  base ${BASE}
Auth: tidak perlu (GET)

USAGE
  node animehub.js <command> [args] [--flags]

COMMANDS (urutan penting untuk test web anime)

  latest|ongoing|completed|movie|top|random|az
      List anime. Flags:
        --limit <n>     per_page (default 12, max 100)
        --page <n>      halaman, default 1
        --status <s>    ongoing|completed|<id>   (untuk latest)
        --type <t>      tv|movie|<id>            (untuk latest)
        --orderby <k>   modified|date|title|id|rand
        --order <asc|desc>

      Contoh:
        node animehub.js latest --limit 12
        node animehub.js latest --status ongoing --type tv --limit 20
        node animehub.js completed --limit 10
        node animehub.js movie --limit 10
        node animehub.js top --limit 12
        node animehub.js random --limit 8
        node animehub.js az --limit 50 --page 2

  search <query>
      Flags: --limit --page --status --orderby --order --json --all --raw
      Default hydrate via slug (id search sering 404; field status/skor/ep diambil dari detail).
      --raw = tanpa hydrate (id/meta tipis mentah dari search)
      Contoh:
        node animehub.js search "one piece" --limit 12
        node animehub.js search "one piece" --limit 12 --json
        node animehub.js search "one piece" --json | jq '.[] | {id, slug, title: .title.rendered, status: .meta_box.ero_status, ep: .meta_box.ero_episode, score: .meta_box.ero_skor}'
        node animehub.js search "one piece" --all --json | jq 'length'
        node animehub.js search naruto --status completed --limit 5

  detail <id|slug>
      Ambil 1 anime (termasuk episode).
      Flags: --json
      Contoh:
        node animehub.js detail 75405
        node animehub.js detail one-piece
        node animehub.js detail 75405 --json

  episodes <id|slug>
      Daftar episode + URL video.
      Flags: --json
      Contoh:
        node animehub.js episodes 75405
        node animehub.js episodes manaria-friends --json

  play <id|slug> --ep <n>
      Ambil 1 episode + URL playable (+ HEAD probe).
      Flags: --ep wajib, --no-probe (skip HEAD)
      Contoh:
        node animehub.js play 75405 --ep 1
        node animehub.js play one-piece --ep 100 --no-probe

  genrelist
      Semua genre (id, name, count).
        node animehub.js genrelist
        node animehub.js genrelist --page 2

  genre <id|slug|nama>
      Anime per genre.
        node animehub.js genre action --limit 12
        node animehub.js genre 2873 --page 2

  jadwal <hari>
      senin selasa rabu kamis jumat sabtu minggu random  (atau ID)
        node animehub.js jadwal senin
        node animehub.js jadwal 3058 --limit 20

  statuslist | typelist | jadwallist | studiolist | seasonlist
      Daftar term taxonomy.
        node animehub.js statuslist
        node animehub.js typelist
        node animehub.js jadwallist
        node animehub.js studiolist --limit 50
        node animehub.js seasonlist

  filter
      Multi-filter generic.
      Flags: --status --type --top --genre --jadwal --season --studio
             --search --limit --page --orderby --order --json --url
      Contoh:
        node animehub.js filter --status ongoing --type tv --genre 2873 --limit 10
        node animehub.js filter --status ongoing --type movie --limit 5 --url
        node animehub.js filter --jadwal senin --limit 20

  raw "/animes?search=naruto&per_page=3"
      Request mentah path+query ke base.
        node animehub.js raw "/animes?animetop=2901&per_page=3&_fields=id,slug,title"
        node animehub.js raw "/animegenre?per_page=100"

  info
      Metadata base, ID taxonomy, field episode.
        node animehub.js info

IDS (dari APK)
  status: ongoing=${IDS.status.ongoing} completed=${IDS.status.completed}
  type:   tv=${IDS.type.tv} movie=${IDS.type.movie}
  top:    ya=${IDS.top.ya} tidak=${IDS.top.tidak}
  jadwal: ${Object.entries(IDS.jadwal).map(([k, v]) => `${k}=${v}`).join(" ")}

PAGINATION
  Header: X-WP-Total, X-WP-TotalPages
  per_page valid: 1..100

STREAMING
  Field: meta_box.ab_cdngroup[].ab_linkcdn
  Host sample: ${CDN_HOST_HINT} (MP4, URL-encode)

SAMPLE JSON: samples/
`);
}

// ─── main ──────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const { flags, pos } = parseFlags(argv.slice(1));

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    printHelp();
    return;
  }
  const fn = commands[cmd];
  if (!fn) {
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }
  try {
    await fn(flags, pos);
  } catch (e) {
    console.error("ERROR:", e.message || e);
    if (e.url) console.error("URL:", e.url);
    process.exit(1);
  }
}

main();
