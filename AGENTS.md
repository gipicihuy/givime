# AGENTS.md

## Project
- **CLI:** `animehub.js` — reverse-engineered karanime.com WP REST client (see README, `docs/`)
- **Web:** `web/` — Next.js app that proxies that API with cache
- **Base API:** `https://karanime.com/wp-json/wp/v2` (GET, no auth)

## Design & UI
<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `DESIGN.md` (direction) then the anti-slop filter skills under `.opencode/skills/`:
- Core filter: `.opencode/skills/antislop/SKILL.md`
- UI / visual: `.opencode/skills/antislop-ui/SKILL.md`
- Copy & text: `.opencode/skills/antislop-copywriting/SKILL.md`
- Mobile / responsive: `.opencode/skills/antislop-layoutmobile/SKILL.md`

Apply anti-slop **during** UI work (plan + execution), not only after. End UI delivery with the Delivery Gate.
<!-- antislop:end -->

## Constraints
- Never commit secrets (PAT/GITHUB_TOKEN), `node_modules/`, or `AnimeHub_3.3.1.apks`
- List queries must not request `meta_box.ab_cdngroup` (payload explosion)
- Search `id` is often wrong — hydrate by slug
- CDN URLs must be path-segment URL-encoded before playback
