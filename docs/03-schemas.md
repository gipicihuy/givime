# Schemas & field reference

## 3.1 Anime item (collection `/animes`)

Response list: **JSON array** of object.  
Response detail by id: **single object**.  
Response by slug: **array** (0 atau 1 item).

### Top-level fields

| Field | Type | Contoh / catatan |
|---|---|---|
| `id` | int | `75405` — primary key |
| `slug` | string | `honoo-no-toukyuujo-dodge-danko` — untuk URL web |
| `title.rendered` | string | Judul (HTML, biasanya polos) |
| `content.rendered` | string | Sinopsis HTML (`<p>...</p>`) |
| `link` | string | URL publik di site WP |
| `date` | string ISO | createdAt WP |
| `modified` | string ISO | sering dipakai untuk “terbaru” |
| `status` | string | `publish` |
| `type` | string | `anime` |
| `featured_media` | int | ID media cover |
| `comment_status` | string | `open`/`closed` |
| `animegenre` | int[] | ID genre |
| `animetype` | int[] | ID TV/Movie |
| `animestatus` | int[] | ID ongoing/completed |
| `animetop` | int[] | ID top flag |
| `jadwalrilis` | int[] | ID hari rilis |
| `animeseason` | int[] | ID season |
| `Studio` | int[] | ID studio (key case-sensitive) |
| `tags` | int[] | tag WP |
| `meta_box` | object | metadata kustom + episode |
| `class_list` | string[] | class HTML WP (opsional) |
| `_links` | object | HATEOAS WP |
| `_embedded` | object? | hanya jika `_embed` |

### `meta_box` (custom fields)

| Field | Type | Arti | Dipakai di list? |
|---|---|---|---|
| `ero_image` | string URL | Cover utama | ✅ |
| `ero_cover` | array | Cover ekstra (sering `[]`) | opsional |
| `ero_gallery` | array | Gallery (sering `[]`)` | opsional |
| `ero_sub` | string | `Sub` / `Dub` / campuran | ✅ |
| `ero_status` | string | `Ongoing`/`Completed` (label) | ✅ |
| `ero_type` | string | `TV`/`Movie` (label) | ✅ |
| `ero_skor` | string | Skor numerik sebagai string, mis. `"8.73"` | ✅ |
| `ero_tayang` | string | Tahun rilis, mis. `"2026"` | ✅ |
| `ero_episode` | string | Jumlah episode (label), mis. `"12"` / `"99999"` | ✅ |
| `ero_durasi` | string | `"23 min. per ep."` | ✅ |
| `ero_genreapp` | string | Genre label dipisah koma | ✅ |
| `ero_japanese` | string | Judul Jepang | opsional |
| `ero_trailer` | string | YouTube video ID | opsional |
| `ero_mature` | string | `Yes`/`No` | opsional |
| `ero_hot` | string | `Yes`/`No` | opsional |
| `ero_censor` | string | `Censored`/… | opsional |
| `ero_autogenerateimgcat` | string | flag internal | abaikan |
| `ab_cdngroup` | object[] | **Daftar episode + URL video** | **hanya detail** |

### `ab_cdngroup[]` (episode)

| Field | Type | Arti |
|---|---|---|
| `ab_namaep` | string | Nomor episode (`"1"`, `"1179"`) |
| `ab_linkcdn` | string | URL video langsung (biasanya `.mp4`) |
| `_state` | string | UI app (`expanded`) |

Urutan array umumnya episode awal → akhir (belum dijamin numerik sort —
di web sebaiknya sort `int(ab_namaep)`).

Contoh nyata (One Piece): 1181 entri, host `r2.umum.work`.

---

## 3.2 Taxonomy term (`/animegenre`, `/animetype`, …)

| Field | Type | Arti |
|---|---|---|
| `id` | int | dipakai sebagai nilai filter di `/animes?...=` |
| `name` | string | label UI |
| `slug` | string | URL / SEO |
| `count` | int | jumlah post anime |
| `description` | string | deskripsi |
| `link` | string | URL arsip di site |
| `taxonomy` | string | nama taxonomy |
| `parent` | int\|null | hierarchy (genre biasanya 0/null) |
| `meta_box` | array/object | biasanya kosong untuk term |

Filter by post:

```
GET {BASE}/animegenre?post={anime_id}
GET {BASE}/Studio?post={anime_id}
```

Dites: `post=2869` → genre 4 item (`200`).

---

## 3.3 Media (`/media/{id}`)

| Field | Arti |
|---|---|
| `id` | media id |
| `source_url` | URL file |
| `alt_text` | alt |
| `media_details.sizes.*.source_url` | thumbnail/medium/large |
| `media_type` | `image` |
| `mime_type` | mis. `image/jpeg` |

---

## 3.4 Mapping fitur web → resource

| Fitur web | Resource / query |
|---|---|
| Home row ongoing | `/animes?animestatus=2872&orderby=modified&desc` |
| Home random | `/animes?orderby=rand&per_page=N` |
| Top/popular | `/animes?animetop=2901` |
| Search | `/animes?search=` |
| Detail | `/animes/{id}` atau `?slug=` |
| Episode list | `meta_box.ab_cdngroup` di detail |
| Stream | `ab_linkcdn` |
| Genre page | `/animegenre/{id}` term + `/animes?animegenre={id}` |
| Jadwal | `/animes?jadwalrilis={id}` |
| Pagination | `page` + `X-WP-TotalPages` |
| Status/type filter | `animestatus`, `animetype` |

---

## 3.5 Hubungan antar endpoint

```
/animes ──featured_media──► /media/{id}
   │
   ├── animegenre[] ──► /animegenre/{id} atau /animegenre?include=
   ├── animetype[]  ──► /animetype
   ├── animestatus[]──► /animestatus
   ├── animetop[]   ──► /animetop
   ├── jadwalrilis[]──► /jadwalrilis
   ├── animeseason[]──► /animeseason
   ├── Studio[]     ──► /Studio
   │
   └── meta_box.ab_cdngroup[].ab_linkcdn ──► CDN video (r2.umum.work)
```

App di binary memanggil helper terpisah:

- `getAllAnime`, `getOngoingAnime`, `getCompletedAnime`, `getMovieAnime`, `getTopAnime`
- `getSearchAnime`
- `getAnimeDetails`
- `getAnimeGenre`, `getAnimeGenreId`

…semuanya di atas base `https://karanime.com/wp-json/wp/v2` + path
`/animes` / `/animegenre` + query yang sama seperti dokumentasi ini.
