# DESIGN.md — Givime (situs anime)

## Direction
**Clean & minimal terang.** Content-first: daftar anime, cover, dan episode yang jelas — bukan landing page marketing.

## Identity
- **Nama:** Givime
- **Feel:** rapi, lega, gampang dipakai tiap hari (browse → detail → nonton)
- **Audience:** penonton anime Indonesia yang cari judul + sub episode cepat

## Dials
`Dial: ENERGY 2 / RHYTHM 2 / MOTION 1`

## Palette (light)
| Role | Value | Use |
|------|--------|-----|
| Canvas | `#fafafa` | page bg |
| Surface | `#ffffff` | cards, nav |
| Ink | `#171717` | primary text |
| Muted | `#737373` | meta, secondary |
| Border | `#e5e5e5` | dividers, card edge |
| Accent | `#e11d48` | status Ongoing, primary CTA, focus ring only |
| Accent-soft | `#fff1f2` | rare badge bg for Ongoing |
| Success | `#15803d` | Completed chip (sparse) |

**Cap:** max 2 core + 1 accent + neutrals. No blue-purple gradients, no glow, no glassmorphism by default.

## Typography
- **UI:** `Inter` (or system-ui stack) — 400 body, 600 titles
- **Numerals / ep / score:** tabular-nums
- Scale: 14 / 16 / 18 / 24 / 32 (no giant hero type)

## Layout rules
- Max content width ~1120px; horizontal padding 16–24px
- Grid: 2 col mobile → 4 col desktop for anime cards; gap consistent (`gap-4` / `gap-6`)
- Cards: flat by default (`border`, no shadow). One elevation level only if a dropdown/modal needs lift
- Radius: `8px` cards/inputs, `6px` chips, `999px` only for status pills
- Nav solid white + bottom border — no backdrop blur
- Whitespace as structure; section labels small uppercase tracking-wide muted

## Components notes
- **AnimeCard:** 2:3 cover, title 1 line clamp, meta row (status · ep · score)
- **Chips:** Ongoing = accent-soft; Completed = neutral border
- **Video player:** native controls first; page around player stays quiet
- **Search:** obvious input in nav; results same card grid (not a different template)
- **Empty/loading/error:** name cause + next action (e.g. “Judul tidak ditemukan — coba kata lain”)

## Motion
- CSS only; ≤150ms hover/opacity
- No infinite decorative loops, no parallax, no staggered hero reveals

## Forbidden (unless purpose written)
- Generic blue/purple/cyan gradient heroes
- Sparkle/star/AI icons as decoration
- Fake stats, “10k+ users”, marketing fluff copy
- Pill-shaped everything, page-wide glow, bento mosaic without content reason
- Dark-by-default for “tech” look

## Copy voice
Plain Indonesian/English UI labels from real data: title, status, episode count, score. No “Discover your next adventure.”
