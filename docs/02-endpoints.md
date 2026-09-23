# Endpoints — penting untuk web anime

Semua test di bawah memakai:

```bash
BASE="https://karanime.com/wp-json/wp/v2"
```

Method default: **GET**. Auth: tidak perlu.

---

## 1. Daftar anime (home / katalog / infinite scroll)

**URL**

```
GET {BASE}/animes
```

**Kegunaan**: home, katalog, load-more, random row, ongoing/completed, movie.

### Query penting

| Param | Required | Keterangan |
|---|---|---|
| `per_page` | recommended | 1–100 (app sering pakai `1`–`99`) |
| `page` | untuk pagination | mulai dari `1` |
| `orderby` | optional | `id`, `date`, `title`, `modified`, **`rand`** |
| `order` | optional | `asc` / `desc` |
| `animestatus` | optional | `2872` ongoing, `2883` completed |
| `animetype` | optional | `2900` TV, `2916` movie |
| `animegenre` | optional | ID genre (gabung bisa beberapa dengan koma: `2873,2877`) |
| `animetop` | optional | `2901` top=YA |
| `jadwalrilis` | optional | ID hari |
| `animeseason` | optional | ID season |
| `Studio` | optional | ID studio |
| `search` | optional | teks bebas |
| `_fields` | recommended untuk list | **hindari** `meta_box.ab_cdngroup` di list |

### Contoh request (field ringan)

```http
GET /wp-json/wp/v2/animes?animestatus=2872&orderby=modified&order=desc&per_page=12&_fields=id,slug,title,date,modified,featured_media,link,animegenre,animetype,animestatus,meta_box.ero_image,meta_box.ero_episode,meta_box.ero_status,meta_box.ero_type,meta_box.ero_skor,meta_box.ero_tayang,meta_box.ero_sub,meta_box.ero_durasi,meta_box.ero_genreapp,meta_box.ero_japanese,meta_box.ero_trailer
```

**Status**: `200`  
**Headers**: `X-WP-Total`, `X-WP-TotalPages`  
**Sample**: `samples/home_ongoing.json`, `samples/list_random.json`

> ⚠️ Default response **ikut menyertakan seluruh episode** di
> `meta_box.ab_cdngroup`. Untuk list/home **wajib** pakai `_fields` tanpa
> `ab_cdngroup` supaya payload kecil. Detail episode hanya diambil saat
> masuk halaman detail.

### Contoh kombinasi terverifikasi

| Tujuan | Query |
|---|---|
| Ongoing terbaru | `animestatus=2872&orderby=modified&order=desc&per_page=12` |
| Completed | `animestatus=2883&orderby=date&order=desc` |
| Movie | `animetype=2916&orderby=date&order=desc` |
| Top/popular | `animetop=2901&orderby=modified&order=desc` |
| Random row | `orderby=rand&order=asc&per_page=10` |
| A–Z | `orderby=title&order=asc` |
| Genre Action | `animegenre=2873&orderby=rand&order=asc` |
| Jadwal Senin | `jadwalrilis=3058&orderby=title&order=asc` |
| Ongoing + TV + Action | `animestatus=2872&animetype=2900&animegenre=2873` |

Semua di atas dites **200**.

---

## 2. Pencarian anime

**URL**

```
GET {BASE}/animes?search={query}&per_page={n}&page={p}
```

**Kegunaan**: search screen.

### Contoh

```http
GET /wp-json/wp/v2/animes?search=naruto&per_page=12&page=1
```

**Status**: `200` (sample: 14 hasil untuk `naruto`)  
**Sample**: `samples/search_naruto.json`  
**Empty**: `search=zzzzqqxyznotfound` → `200` body `[]` + `X-WP-Total: 0`

Opsional digabung filter: `search=...&animestatus=2883`.

### Alternatif (kurang disarankan untuk UI utama)

```
GET {BASE}/search?search=naruto&type=post&subtype=anime
```

Dites `200`, tapi payload hanya ringkasan (`id,title,url`) dan `subtype`
kadang terbaca `post`. Untuk web anime **lebih baik** cari lewat `/animes`.

---

## 3. Detail anime (by ID)

**URL**

```
GET {BASE}/animes/{id}
```

**Kegunaan**: halaman detail, ambil episode + URL video + synopsis.

### Contoh

```http
GET /wp-json/wp/v2/animes/75405
```

**Status**: `200`  
**Sample**: `samples/detail_by_id.json`  
**404**: `GET /animes/999999999` → `404` body kecil

Field inti:

- `id`, `slug`, `title.rendered`, `content.rendered` (sinopsis HTML)
- `link` → URL web publik `https://karanime.com/anime/{slug}/`
- `featured_media` → ID media cover
- taxonomy ID: `animegenre[]`, `animetype[]`, `animestatus[]`, …
- `meta_box` → metadata + **daftar episode**

---

## 4. Detail anime (by slug)

**URL**

```
GET {BASE}/animes?slug={slug}
```

**Kegunaan**: routing web `/anime/{slug}`.

### Contoh

```http
GET /wp-json/wp/v2/animes?slug=manaria-friends
```

**Status**: `200`, array length 1  
**Sample**: `samples/detail_by_slug.json`  
Slug tidak ada → `200` + `[]`.

---

## 5. Daftar episode + URL streaming

Episode **bukan endpoint terpisah**. Ada di dalam detail/list anime:

```json
"meta_box": {
  "ab_cdngroup": [
    { "ab_namaep": "1", "ab_linkcdn": "https://r2.umum.work/....mp4", "_state": "expanded" },
    { "ab_namaep": "12", "ab_linkcdn": "https://r2.umum.work/....mp4", "_state": "expanded" }
  ]
}
```

| Field | Arti |
|---|---|
| `ab_namaep` | Nomor episode (string) |
| `ab_linkcdn` | URL video MP4 langsung (URL-encode saat request) |
| `_state` | UI accordion app (`expanded`) — opsional untuk web |

Ambil dari:

```http
GET {BASE}/animes/{id}
```

atau `?slug=`.

**Status video**: contoh `r2.umum.work` → `200`/`206`, `content-type: video/mp4`, support `Range`.

Detail lengkap: `04-streaming.md`.

---

## 6. Genre list

**URL**

```
GET {BASE}/animegenre?per_page=100&page={p}&orderby=id&order=asc
```

**Kegunaan**: chip genre, filter kategori, halaman genre.

**Status**: `200`, total **106** genre (2 halaman)  
**Sample**: `samples/genres.json`

Field penting tiap term:

```json
{ "id": 2873, "name": "Action", "slug": "action", "count": 883, "link": "https://karanime.com/animegenre/action/" }
```

`count` = jumlah anime pada genre itu.

### Anime per genre

```
GET {BASE}/animes?animegenre={id}&per_page=24&page=1
```

Atau langsung dari term (ada `_links["wp:post_type"]`).

---

## 7. Taxonomy / filter lain

Semua: `GET` + `?per_page=` + opsional `page`.

| Endpoint | Total (dites) | Sample | Kegunaan |
|---|---|---|---|
| `/animetype` | 2 (`TV`, `Movie`) | `samples/animetypes.json` | filter tipe |
| `/animestatus` | 2 (`Ongoing`, `Completed`) | `samples/animestatus.json` | filter status |
| `/animetop` | 2 (`YA`, `TIDAK`) | `samples/animetop.json` | filter top |
| `/jadwalrilis` | 8 (Senin–Minggu + Random) | `samples/jadwalrilis.json` | calendar/jadwal |
| `/animeseason` | 130 | `samples/seasons.json` | filter season |
| `/Studio` | 235 | `samples/studios.json` | filter studio (path huruf besar `Studio`) |

### ID taxonomy yang dipakai hard-coded di app

**Status**

- `2872` Ongoing
- `2883` Completed

**Type**

- `2900` TV
- `2916` Movie

**Top**

- `2901` YA
- `2899` TIDAK

**Jadwal (hari)**

- `3058` Senin
- `3059` Selasa
- `3061` Rabu
- `3062` Kamis
- `3063` Jumat
- `3057` Sabtu
- `3064` Minggu
- `3065` Random

---

## 8. Cover / media

```
GET {BASE}/media/{featured_media_id}
```

atau opsi inline:

```
GET {BASE}/animes?...&_embed=wp:featuredmedia
```

**Status**: `200`  
**Sample**: `samples/media_featured.json`

Cover juga bisa dari `meta_box.ero_image` (URL absolut, sering MAL/CDN).

Ukuran WP bila pakai embed: `thumbnail`, `medium`, `large`, `full`, dll. di `media_details.sizes`.

> Catatan: `_embed=wp:term` pada data anime yang dites **kosong** — resolve
> nama genre/status/type lewat endpoint taxonomy (`/animegenre?include=...`)
> atau cache dari list taxonomy. App sendiri memanggil
> `getAnimeGenre` / `getAnimeGenreId` terpisah.

---

## 9. Image episode / thumbnail tambahan

Tidak ada endpoint thumbnail-per-episode di API.

- Cover anime: `meta_box.ero_image` / `featured_media`
- `ero_cover`, `ero_gallery` biasanya `[]`
- `ero_trailer` = YouTube ID (embed di web: `https://www.youtube.com/embed/{ero_trailer}`)

---

## Endpoint yang ditemukan tapi diabaikan untuk web anime

- `/posts`, `/pages`, `/blogs` (artikel blog — opsional, bukan core anime)
- `/comments` WP (dites kosong untuk anime; likes app pakai Firestore)
- Route write (`POST`/`PUT`/`DELETE`) — butuh auth CMS
- Firebase/ads/billing/analytics — tidak relevan
- `free.karanime.com`, `vip.karanime.com` — legacy, sudah tidak reliable
