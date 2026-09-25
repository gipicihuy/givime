# DESIGN.md — Givime (situs anime)

## Direction
**Editorial + cinematic dark streaming.** Bukan Netflix-clone seragam: home dibuka **featured hero carousel** multi-item (backdrop + gradient + CTA + chevron prev/next + dots), opsi **Lanjutkan menonton** (history lokal), lalu rail dengan **kepala ornamen 3-garis** ala stalker (bukan nomor `01`). Bottom nav tetap tujuan inti (Home / Search / Browse / History) — kategori di `/browse`. Rail scroll native tanpa chevron geser. Cover 2:3. Aksen **lime `#BFFF3A`**. Tanpa credit sumber / URL CDN. Icon-only bottom nav.

## Identity
- **Nama:** Givime
- **Feel:** buka → hero carousel → rail → lanjutkan menonton (tengah) → scroll → tap → play → history lokal
- **Referensi:** layout magazine (ornamen 3-garis, head asymmetric) + cinematic hero (nontonime-style blur/gradient), bukan grid Netflix default

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
- **Display (judul hero, page title, detail title):** Bricolage Grotesque — hierarchy weight/size + display vs sans, bukan font beda-beda

## Layout
- **Top bar:** logo saja (search pindah ke `/search`)
- **Bottom nav fixed 4 item:** icon-only Home · Search · Browse · History; active lime; Browse aktif untuk route kategori (`/ongoing` dst)
- **Home:** hero featured carousel **tinggi tetap** (340/400px; chevron **tanpa bulatan** sisi tengah + dots; autoplay 5s track slide) → **Lanjutkan menonton** (setelah hero ala nontonime; layout **landscape 16:9 + progress bar + jam `00:00 / 24:00`**, beda dari shelf poster 2:3; localStorage auto-hide) → **Ongoing → Top → Genre (pill top-24 sort count + "Lihat semua" → `/genres`; Movie tetap di Jelajah) → Completed** (Shelf head: ornamen 3-garis diagonal lime)
- **Browse:** hub kartu kategori (termasuk **Jadwal**) → list pages
- **Jadwal:** `/jadwal` — date strip 7 hari (Sen–Min, aktif lime, hari ini dot) + list horizontal (border-left tone); **hanya `jadwalrilis` lokal**, urut skor desc; tanpa episode/skor disembunyikan (tanpa strip `—`)
- **History:** localStorage; **timeline per tanggal** (badge pill date + garis vertikal) → card horizontal compact (thumb 2:3 kiri, **judul bold**, Episode secondary, **jam kanan-atas bold**, **progress bar** + `00:00 / 24:00` spasi di sekitar `/`); klik → `/play/…?ep=…&t=` (seek ke detik)
- **Search page:** input full-width di atas + suggest dropdown (debounce ~280ms, poster thumb 36×54, flat rows, meta `{total} Eps · ★ score`); hasil grid di bawah
- **List pages:** `AnimeGrid` poster 3→6 kolom; `page-title` display font
- **Detail:** hero **full-bleed** (backdrop cover **blur+scrim gelap**; poster jelas di depan + shadow; chips / meta pemisah `·` / genre-chip glass / CTA lime glow) → Sinopsis → Info **definition-grid tanpa kartu** (label uppercase mikro + nilai) → Episode grid (head ornamen + hairline, grid rapat); semua data meta tetap (status/tipe/tahun/ep/durasi/skor/genre); tanpa meta-table, tanpa badge angka, tanpa 2-pill segmented
- **Player:** 16:9; **jangan** tampilkan URL MP4 / source / credit origin

## Components
- `FeaturedHero` = home hero cinematic multi-slide **fixed height** (track full-width slide ±100% ~700ms + backdrop cover-fit + gradient + chevron sisi + dots + **autoplay 5s** + **touch swipe** + CTA; body per-slide absolute/fixed box biar gak resize hero; `touch-action: pan-y`)
- `ContinueWatching` = rail history lokal **setelah hero**, layout landscape 16:9 + progress + `fmtProgress` (`00:00 / duration`, bar 0% kalau t=0); **resume frame** dari `src` video di detik `t` (fallback poster); auto-hide
- `HistoryTracker` / `lib/history.ts` = riwayat + progres `t`/`d` (detik) + `src` video; player `timeupdate`/`pause` → `updateProgress`; `?t=` seek
- Icons: `components/Icons.tsx` only (termasuk `IconSchedule` untuk Jadwal)
- `Shelf` = head ornamen 3-garis (bukan nomor) + rail flex overflow-x scroll-snap (client, **tanpa** tombol scroll; **tanpa** edge-fade mask)
- `AnimeGrid` = responsive poster grid
- `Pager` = nomor halaman pill + chevron icon-only (tanpa teks Prev/Next)
- `BottomNav` = client, 4 tujuan inti, `aria-label` + `aria-current`
- `EpisodeSection` = client, section head + 1 tombol toggle Terbaru (asc default / desc) + auto-fill grid
- `AnimeCard` = poster vertical (thumb 2:3 **tanpa badge status**; score `★ n.nn` lime **pojok kanan-atas** dark chip; **Ep N** di atas gradient bawah poster; title 2-line di bawah poster)
- `HistoryPage` = timeline date-pill + vertical line + horizontal card (title/ep/jam bold/progress `00:00 / duration`); link `?t=` seek; token lime

## Motion
≤150ms hover; rail scroll native; poster scale 1.03 (tanpa glow/shadow); hero **autoplay 5s** **track full-width slide ±100%** ~700ms `cubic-bezier(0.22,1,0.36,1)` (transform-only, bukan fade/36px; pause hover/focus/offscreen/`prefers-reduced-motion`/touch); **swipe kiri-kanan** ≥48px ganti slide.

## Forbidden
- URL CDN / “Source: …” / “data dari karanime” di UI
- Tab bottom per-kategori (Ongoing/Movie/Genre sebagai tab sendiri)
- Tombol chevron geser di rail (pakai scroll native/swipe)
- Home = 4 rail seragam **tanpa** hero featured
- Nomor section `01 Ongoing` (ganti ornamen 3-garis)
- Aksen teal/oranye lama; blue-purple gradient AI; Inter/Geist
- Vertical-only home without horizontal rail
