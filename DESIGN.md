# DESIGN.md — Givime (situs anime)

## Direction
**App-like dark streaming.** Bottom nav = **tujuan inti** (Home / Search / Browse / History) — **bukan** tab per-kategori. Kategori (Ongoing/Completed/Movie/Genre) di dalam `/browse`. Home = section **rail** poster vertikal (scroll native, **tanpa** tombol chevron geser). Cover 2:3. Aksen **oranye**. Tanpa credit sumber, tanpa URL CDN di UI. Icon-only bottom nav (`aria-label`).

## Identity
- **Nama:** Givime
- **Feel:** buka → scroll section → tap poster → play → history lokal
- **Referensi bottom nav:** Netflix / YouTube / Spotify / Crunchyroll — Home, Search, Browse/Discover, Library/History (kategori konten **bukan** tab sendiri)

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
| Accent | `#ff6a1a` |
| Accent-ink | `#1a0a02` |

Cap: 1 accent + neutrals.

## Layout
- **Top bar:** logo + search only
- **Bottom nav fixed 4 item:** icon-only Home · Search · Browse · History; active oranye; Browse aktif untuk route kategori (`/ongoing` dst)
- **Home sections (stack):** Ongoing → Top → Movie → Completed  
  masing-masing: `Shelf` = section head + rail poster vertikal 128–148px
- **Browse:** hub kartu kategori → list pages
- **History:** localStorage (di-track saat play)
- **List pages:** `AnimeGrid` poster 3→6 kolom
- **Detail:** cover 200px + info; CTA oranye
- **Player:** 16:9; **jangan** tampilkan URL MP4 / source / credit origin

## Components
- `AnimeCard` = poster vertical (thumb 2:3 + title 2-line + ep/score)
- `Shelf` = section head + rail flex overflow-x scroll-snap (client, **tanpa** tombol scroll)
- `AnimeGrid` = responsive poster grid
- `BottomNav` = client, 4 tujuan inti, `aria-label` + `aria-current`
- `HistoryTracker` / `lib/history.ts` = riwayat tonton lokal
- Icons: `components/Icons.tsx` only

## Motion
≤150ms hover; rail scroll native; poster scale 1.03 on hover.

## Forbidden
- URL CDN / “Source: …” / “data dari karanime” di UI
- Tab bottom per-kategori (Ongoing/Movie/Genre sebagai tab sendiri)
- Tombol chevron geser di rail (jelek — pakai scroll native/swipe)
- Aksen teal lama (`#25efcd`)
- Vertical-only home without horizontal rail
