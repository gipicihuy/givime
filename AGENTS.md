# AGENTS.md

## Project
- **CLI:** `animehub.js` — reverse-engineered karanime.com WP REST client
- **Web:** `web/` — Next.js app (fokus utama)
- **Base API:** `https://karanime.com/wp-json/wp/v2` (GET, no auth)

## Design & UI
Baca `DESIGN.md` sebelum UI work (clean & minimal terang). Filter anti-slop sesi agent (bukan file project).

## Constraints
- Never commit secrets (PAT/GITHUB_TOKEN), `node_modules/`, or `AnimeHub_3.3.1.apks`
- List queries must not request `meta_box.ab_cdngroup`
- Search `id` often wrong — hydrate by slug
- CDN URLs must be path-segment URL-encoded before playback
