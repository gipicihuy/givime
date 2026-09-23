# Givime

Web anime (Next.js) yang memakai API reverse-engineered dari karanime.com lewat proxy + cache server-side.

## Struktur

```
animehub.js          # CLI (reverse-engineered API client)
docs/                # endpoint reference
web/                 # Next.js app
.opencode/skills/    # anti-slop agent skills
DESIGN.md            # arah desain UI
AGENTS.md            # agent routing + constraints
```

## Web (`web/`)

```bash
cd web
npm install --no-bin-links   # filesystem tanpa symlink
npm run dev                  # http://localhost:3000
```

Halaman: `/`, `/ongoing`, `/completed`, `/movies`, `/genres`, `/genre/[slug]`, `/search`, `/anime/[slug]`, `/play/[slug]?ep=N`

## CLI

```bash
node animehub.js help
node animehub.js search "one piece" --all --json
```

## Design

Arah UI: **clean & minimal terang** — baca `DESIGN.md`. Filter anti-slop: `.opencode/skills/antislop*`.

## Jangan commit

- Token / PAT
- `node_modules/`, `.next/`
- `AnimeHub_3.3.1.apks`
