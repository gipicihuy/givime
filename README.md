# givime

Web anime (Next.js) — data dari karanime.com lewat proxy + cache server-side.

**Root repo = app Next.js** (siap deploy Cloudflare Pages / Workers).

## Run

```bash
npm install --no-bin-links   # env FUSE/Android
npm run dev
```

Kalau build gagal native `.node` (SWC/lightningcss), pindah dulu ke tmpfs — lihat catatan di commit history atau build di mesin biasa / CI.

## Routes

| Path | Fungsi |
|------|--------|
| `/` | Ongoing + Top + Movie |
| `/ongoing` `/completed` `/movies` | list + pagination |
| `/genres` `/genre/[slug]` | genre + filter |
| `/search?q=` | search (hydrate by slug) |
| `/anime/[slug]` | detail + episode |
| `/play/[slug]?ep=N` | video player |

## Struktur

```
app/          # routes Next.js
components/   # UI
lib/api.ts    # client karanime + hydrate + encodeMedia
DESIGN.md     # arah desain UI
AGENTS.md     # aturan agent
animehub.js   # CLI reference (opsional)
docs/         # catatan endpoint (opsional)
```

## Deploy (Cloudflare)

- **Root directory:** `/` (repo root)
- **Build:** `npm install && npm run build`
- **Output:** default Next.js adapter / `@cloudflare/next-on-pages` sesuai pilihan lo

## API quirk

- Search `id` sering 404 → hydrate by slug
- List jangan minta `meta_box.ab_cdngroup`
- Encode path CDN sebelum putar video
