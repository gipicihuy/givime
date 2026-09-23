# Givime (web)

Next.js 15 · TypeScript · Tailwind — proxy + cache server-side ke karanime WP REST.

## Run

```bash
# di env FUSE/Android: install tanpa symlink
npm install --no-bin-links
npm run dev   # script sudah panggil node_modules/next/... langsung
```

### Build native (SWC/lightningcss)

Binary `.node` sering gagal load di mount FUSE. Kalau build error soal `.node`:

```bash
rsync -a --exclude=node_modules --exclude=.next /path/to/web/ /tmp/givime-web/
cd /tmp/givime-web && npm install && npm run build && npm start
```

## Routes

| Path | Fungsi |
|------|--------|
| `/` | Ongoing + Top + Movie |
| `/ongoing` `/completed` `/movies` | list + pagination |
| `/genres` `/genre/[slug]` | genre + filter |
| `/search?q=` | search (hydrate by slug) |
| `/anime/[slug]` | detail + episode |
| `/play/[slug]?ep=N` | video player |

## lib/api.ts

- `LIST_FIELDS` — list tanpa `ab_cdngroup`
- `hydrateBySlug()` — fix id search yang 404
- `encodeMedia()` — URL-encode path CDN
- ISR: list 5–10m, detail 1h, genre 1h, taxonomy 1h
