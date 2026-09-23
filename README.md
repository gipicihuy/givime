# givime

Web anime (Next.js) + CLI reverse-engineered karanime.com.

## Web

```bash
cd web
npm install --no-bin-links   # env tanpa symlink
npm run dev
```

Routes: `/` · `/ongoing` · `/completed` · `/movies` · `/genres` · `/genre/[slug]` · `/search` · `/anime/[slug]` · `/play/[slug]?ep=N`

Detail run/build native: [`web/README.md`](web/README.md)

## Design

Arah UI: [`DESIGN.md`](DESIGN.md)

## API quirk

- Search `id` sering 404 → hydrate by slug (`web/lib/api.ts`)
- Jangan minta `meta_box.ab_cdngroup` di list
- Encode path CDN sebelum putar video
