# Recipes — query siap pakai untuk fitur web anime

Semua memakai:

```bash
BASE="https://karanime.com/wp-json/wp/v2"
```

Variabel umum:

```bash
# field ringan untuk LIST (tanpa episode)
FIELDS='_fields=id,slug,title,date,modified,featured_media,link,animegenre,animetype,animestatus,meta_box.ero_image,meta_box.ero_episode,meta_box.ero_status,meta_box.ero_type,meta_box.ero_skor,meta_box.ero_tayang,meta_box.ero_sub,meta_box.ero_durasi,meta_box.ero_genreapp,meta_box.ero_japanese,meta_box.ero_trailer'
```

> Jangan masukkan `meta_box.ab_cdngroup` ke list query — payload meledak
> (satu anime bisa ratusan episode).

---

## R1. Home — Ongoing terbaru

```bash
curl -sS "$BASE/animes?animestatus=2872&orderby=modified&order=desc&per_page=12&$FIELDS"
```

- Sample: `samples/home_ongoing.json`
- Status: 200

## R2. Home — Random / “Rekomendasi”

```bash
curl -sS "$BASE/animes?orderby=rand&order=asc&per_page=10&$FIELDS"
```

- Sample: `samples/list_random.json`

## R3. Home — Top / Popular

```bash
curl -sS "$BASE/animes?animetop=2901&orderby=modified&order=desc&per_page=12&$FIELDS"
```

ID top diambil dari `/animetop` (`2901` = YA).

## R4. Home — Completed terbaru

```bash
curl -sS "$BASE/animes?animestatus=2883&orderby=date&order=desc&per_page=12&$FIELDS"
```

## R5. Home — Movie

```bash
curl -sS "$BASE/animes?animetype=2916&orderby=date&order=desc&per_page=12&$FIELDS"
```

## R6. Search

```bash
curl -sS "$BASE/animes?search=naruto&per_page=12&page=1&$FIELDS"
```

- Sample: `samples/search_naruto.json`
- Empty → `[]` + `X-WP-Total: 0`

Gabung status:

```bash
curl -sS "$BASE/animes?search=naruto&animestatus=2883&per_page=12"
```

## R7. Detail by slug (routing web)

```bash
curl -sS "$BASE/animes?slug=manaria-friends"
```

```ts
// pseudocode
const [anime] = await fetch(`${BASE}/animes?slug=${slug}`).then(r => r.json());
if (!anime) return 404;
const episodes = [...(anime.meta_box?.ab_cdngroup ?? [])]
  .sort((a, b) => Number(a.ab_namaep) - Number(b.ab_namaep));
```

## R8. Detail by id

```bash
curl -sS "$BASE/animes/75405"
```

- Sample: `samples/detail_by_id.json`

## R9. Daftar genre (chip filter)

```bash
curl -sS "$BASE/animegenre?per_page=100&page=1&orderby=id&order=asc"
curl -sS "$BASE/animegenre?per_page=100&page=2"
```

- Total: **106**
- Sample: `samples/genres.json`

## R10. Anime per genre (halaman genre / filter)

```bash
# Action = 2873
curl -sS "$BASE/animes?animegenre=2873&orderby=modified&order=desc&per_page=24&page=1&$FIELDS"
```

Bisa digabung:

```bash
curl -sS "$BASE/animes?animegenre=2873&animestatus=2872&animetype=2900&per_page=24"
```

## R11. Jadwal / Calendar

```bash
# Senin = 3058
curl -sS "$BASE/animes?jadwalrilis=3058&orderby=title&order=asc&per_page=50&$FIELDS"
```

Mapping hari:

| ID | Hari |
|---:|---|
| 3058 | Senin |
| 3059 | Selasa |
| 3061 | Rabu |
| 3062 | Kamis |
| 3063 | Jumat |
| 3057 | Sabtu |
| 3064 | Minggu |
| 3065 | Random |

## R12. Filter type + status (tabs)

```bash
# Ongoing Movie
curl -sS "$BASE/animes?animestatus=2872&animetype=2916&orderby=date&order=desc&per_page=24&$FIELDS"
```

## R13. A–Z catalog

```bash
curl -sS "$BASE/animes?orderby=title&order=asc&per_page=100&page=1&$FIELDS"
```

## R14. Pagination infinite scroll

```bash
PAGE=1
curl -sS -D - -o page.json \
  "$BASE/animes?animestatus=2872&orderby=modified&order=desc&per_page=20&page=$PAGE&$FIELDS" \
  | tr -d '\r' | grep -iE '^(HTTP/|x-wp-total:|x-wp-totalpages:|link:)'
```

Loop sampai `page > X-WP-TotalPages` atau body `[]`.

Validasi server:

| `per_page` | Hasil |
|---:|---|
| 1–100 | OK |
| 0 | **400** |
| 101 | **400** |

`orderby` selain yang didukung (mis. `notreal`) → **400**.

## R15. Resolve taxonomy ID → label

App memanggil genre terpisah; untuk web:

```bash
# batch id
curl -sS "$BASE/animegenre?include=2877,2878,2937&per_page=100"
# atau load semua sekali lalu cache
curl -sS "$BASE/animegenre?per_page=100"
```

Cache di client/CDN: genre/type/status/top/jadwal jarang berubah.

## R16. Cover image

Prioritas:

1. `meta_box.ero_image` (URL absolut, sering sudah siap)
2. `_embed=wp:featuredmedia` → `source_url` / `media_details.sizes.medium`
3. `GET /media/{featured_media}`

## R17. Halaman nonton

```bash
# detail
curl -sS "$BASE/animes?slug=${SLUG}"
# → pilih ab_cdngroup[i].ab_linkcdn
# → URL-encode → <video>
```

Lihat `04-streaming.md`.

---

## Payload size tips

| Kebutuhan | `_fields` / path |
|---|---|
| Card list / home | meta_box **tanpa** `ab_cdngroup` |
| Detail | tanpa `_fields` (atau include semua meta_box) |
| Search asli | cukup `id,slug,title,featured_media,meta_box.ero_*` |
| Genre page header | `?slug=` detail sekali, list lain `_fields` ringan |

Contoh detail ringan tetap bawa episode:

```bash
curl -sS "$BASE/animes/75405"
# ~5KB untuk 12 episode pada sample; One Piece bisa jauh lebih besar
```

Untuk anime episode sangat banyak (1000+), pertimbangkan:
- cache response detail aggressively
- jangan panggil detail di list grid
