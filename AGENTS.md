# AGENTS.md

## Project
- **Web (fokus):** Next.js app di **root** repo (`app/`, `lib/`, `components/`)
- **CLI (opsional):** `animehub.js` — reverse-engineered karanime.com WP REST
- **Base API:** `https://karanime.com/wp-json/wp/v2` (GET, no auth)

## Design & UI
Baca `DESIGN.md` sebelum UI work (clean & minimal terang). Filter anti-slop sesi agent (bukan file project).

## Deploy
Repo root = root directory Cloudflare. Jangan taruh app di subfolder `web/`.

## Constraints
- Never commit secrets (PAT/GITHUB_TOKEN), `node_modules/`, or `AnimeHub_3.3.1.apks`
- List queries must not request `meta_box.ab_cdngroup`
- Search `id` often wrong — hydrate by slug
- CDN URLs must be path-segment URL-encoded before playback
