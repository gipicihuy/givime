# DESIGN.md — Givime (situs anime)

## Direction
**App-like dark streaming.** Bottom nav (Home / Ongoing / Search / Movies / Genre) + home = section **rail** poster vertikal yang **scroll ke kanan**. Cover normal (2:3). Tanpa credit sumber, tanpa URL CDN di UI.

## Identity
- **Nama:** Givime
- **Feel:** buka → scroll section → tap poster → play
- **Referensi structure:** AnimeHub (menu Home/Search/Genre/Movies/Schedule/Update/Bookmark) — di web kita pakai subset yang relevan

## Dials
`Dial: ENERGY 2 / RHYTHM 2 / MOTION 1`

## Palette
| Role | Value |
|------|--------|
| Canvas | `#0f0f10` |
| Surface | `#17171a` |
| Ink | `#f2f2f3` |
| Muted | `#9b9ba3` |
| Border | `#2c2c33` |
| Accent | `#25efcd` |
| Accent-ink | `#062b26` |

Cap: 1 accent + neutrals.

## Layout
- **Top bar:** logo + search only (nav pindah ke bawah)
- **Bottom nav fixed 5 item:** Home · Ongoing · Search · Movies · Genre (SVG, active teal)
- **Home sections (stack):** Ongoing → Top → Movie → Completed  
  masing-masing: `AnimeRail` horizontal-scroll poster **vertikal** 128–148px
- **List pages:** `AnimeGrid` poster 3→6 kolom
- **Detail:** cover 200px + info; CTA teal
- **Player:** 16:9; **jangan tampilkan** URL MP4 / source / credit origin
- Footer: minimal / tanpa “data dari …”

## Components
- `AnimeCard` = poster vertical (thumb 2:3 + title 2-line + ep/score)
- `AnimeRail` = flex overflow-x scroll-snap
- `AnimeGrid` = responsive poster grid
- `BottomNav` = client, `aria-current`
- Icons: `components/Icons.tsx` only

## Motion
≤150ms hover; rail scroll native; poster scale 1.03 on hover.

## Forbidden
- URL CDN / “Source: …” / “data dari karanime” di UI
- Nav top penuh (sudah pindah bottom)
- Vertical-only home without horizontal rail
