# DESIGN.md — Givime (situs anime)

## Direction
**Editorial + cinematic dark streaming.** Bukan Netflix-clone seragam: home dibuka **featured hero** (backdrop poster + gradient + CTA), lalu rail bernomor editorial (`01 Ongoing` …). Bottom nav tetap tujuan inti (Home / Search / Browse / History) — kategori di `/browse`. Rail scroll native tanpa chevron. Cover 2:3. Aksen **lime `#BFFF3A`**. Tanpa credit sumber / URL CDN. Icon-only bottom nav.

## Identity
- **Nama:** Givime
- **Feel:** buka → hero → scroll rail bernomor → tap → play → history lokal
- **Referensi:** layout magazine (numbered sections, head asymmetric) + cinematic hero (nontonime-style blur/gradient), bukan grid Netflix default

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
| Accent | `#BFFF3A` |
| Accent-ink | `#121a00` |

Cap: 1 accent + neutrals.

## Type
- **UI/body:** Plus Jakarta Sans (bukan Geist/Inter — hindari vibe default AI)
- **Display (judul hero, page title, detail title, section number):** Bricolage Grotesque — hierarchy weight/size + display vs sans, bukan font beda-beda

## Layout
- **Top bar:** logo saja (search pindah ke `/search`)
- **Bottom nav fixed 4 item:** icon-only Home · Search · Browse · History; active lime; Browse aktif untuk route kategori (`/ongoing` dst)
- **Home:** hero featured (1 judul Top/terbaru: backdrop cover + bottom gradient + title display + meta + CTA Putar) → rail **01 Ongoing → 02 Top → 03 Movie → 04 Completed** (Shelf head asymmetric: nomor display kiri, judul, “Lihat semua” kanan; rail edge-fade + card-lift)
- **Browse:** hub kartu kategori → list pages
- **History:** localStorage (di-track saat play)
- **Search page:** input full-width di atas + suggest dropdown (debounce ~280ms, poster thumb 36×54, flat rows, meta `{total} Eps · ★ score`); hasil grid di bawah
- **List pages:** `AnimeGrid` poster 3→6 kolom; `page-title` display font
- **Detail:** hero (poster + title display/badges/genre-chip/CTA) → Sinopsis → Info fact-list → Episode; tanpa meta-table, tanpa badge angka, tanpa 2-pill segmented
- **Player:** 16:9; **jangan** tampilkan URL MP4 / source / credit origin

## Components
- `FeaturedHero` = home hero cinematic (backdrop cover + gradient + CTA)
- `AnimeCard` = poster vertical (thumb 2:3 + title 2-line + ep/score)
- `Shelf` = head bernomor (`01`…) + rail flex overflow-x scroll-snap (client, **tanpa** tombol scroll; edge-fade)
- `AnimeGrid` = responsive poster grid
- `Pager` = nomor halaman pill + chevron icon-only (tanpa teks Prev/Next)
- `BottomNav` = client, 4 tujuan inti, `aria-label` + `aria-current`
- `EpisodeSection` = client, section head + 1 tombol toggle Terbaru (asc default / desc) + auto-fill grid
- `HistoryTracker` / `lib/history.ts` = riwayat tonton lokal
- Icons: `components/Icons.tsx` only

## Motion
≤150ms hover; rail scroll native; poster scale 1.03 + lime shadow lift; hero static (tanpa autoplay carousel).

## Forbidden
- URL CDN / “Source: …” / “data dari karanime” di UI
- Tab bottom per-kategori (Ongoing/Movie/Genre sebagai tab sendiri)
- Tombol chevron geser di rail (pakai scroll native/swipe)
- Home = 4 rail seragam **tanpa** hero featured
- Aksen teal/oranye lama; blue-purple gradient AI; Inter/Geist
- Vertical-only home without horizontal rail
