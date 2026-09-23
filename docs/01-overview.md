# Overview — AnimeHub API

## Sumber analisis

| Item | Detail |
|---|---|
| File | `/mnt/animehub-api/AnimeHub_3.3.1.apks` |
| Package | `com.nalgroup.animehub` |
| Engine | Flutter (Dart AOT di `lib/arm64-v8a/libapp.so`) |
| API layer (di binary) | `package:animehub/actions/main_api.dart` (`BaseApi`) |
| Tanggal reverse | 2026-09-22 |

Endpoint tidak ada di DEX Java; semua string API ada di **`libapp.so`**.

## Base URL

```
https://karanime.com/wp-json/wp/v2
```

Ini **WordPress REST API** standar + custom post type `anime` + custom taxonomy.

Host lain yang muncul di binary:

| Host | Peran | Status saat dites |
|---|---|---|
| `karanime.com` | Catalog / metadata (WP REST) | ✅ 200 |
| `r2.umum.work` | CDN video MP4 (dari `ab_linkcdn`) | ✅ 200 / 206 |
| `free.karanime.com` | Legacy stream helper (`https://free.karanime.com/?id=...`) | ❌ DNS tidak resolve |
| `vip.karanime.com` | Legacy VIP stream (`https://vip.karanime.com/?id=...`) | ⚠️ 301 → Wasabi S3, object 404 |
| `new.karanime.com` | (ada di binary) | ⚠️ redirect block/mirror |
| `eropa.karanime.com`, `node1.karanime.com` | Legacy nodes | ❌ DNS tidak resolve |
| `animehub-bb38d-default-rtdb...firebasedatabase.app` | RTDB app | (bukan catalog) |
| Firestore | Koleksi `ANIME_LIST`, `ANIME_LIKES`, `ANIME_REPORTS` | (like/report — bukan catalog) |

**Untuk web anime: gunakan `karanime.com` + `ab_linkcdn`.** Host free/vip legacy sudah tidak reliable.

## Auth

- **GET publik: tanpa API key, tanpa token, tanpa nonce.**
- CORS aktif untuk origin lain (`access-control-allow-origin` memantul ke Origin request).
- Header opsional wajar: `User-Agent`, `Accept: application/json`.
- Endpoint POST/PATCH/DELETE ada di route WP, tapi **butuh auth WP** — di luar scope web read-only.

## Pola URL

```
{BASE}/{collection}
{BASE}/{collection}/{id}
```

Collection penting:

| Path | Isi |
|---|---|
| `/animes` | Daftar/detail anime (CPT `anime`) |
| `/animegenre` | Genre |
| `/animetype` | TV / Movie |
| `/animestatus` | Ongoing / Completed |
| `/animetop` | Flag top (YA/TIDAK) |
| `/jadwalrilis` | Jadwal rilis (Senin–Minggu) |
| `/animeseason` | Season (Winter 2024, dll.) |
| `/Studio` | Studio (huruf besar S) |

## Parameter query standar WP yang dipakai app

| Param | Nilai | Fungsi |
|---|---|---|
| `search` | teks | Pencarian |
| `page` | int ≥ 1 | Halaman |
| `per_page` | 1–100 | Ukuran halaman (0 atau 101 → **400**) |
| `orderby` | `id\|date\|title\|modified\|rand` | Urutan (`rand` didukung) |
| `order` | `asc\|desc` | Arah urut |
| `slug` | slug | Ambil 1 anime by slug |
| `include` | `id,id` | Ambil by ID list |
| `_fields` | `a,b,c` / `meta_box.ero_image` | Pilih field (kurangi payload) |
| `_embed` | `_embed` / `_embed=wp:featuredmedia` | Sertakan media |

Taxonomy filter (ID term):

| Param | Contoh ID |
|---|---|
| `animegenre` | `2873` = Action |
| `animetype` | `2900` = TV, `2916` = Movie |
| `animestatus` | `2872` = Ongoing, `2883` = Completed |
| `animetop` | `2901` = YA, `2899` = TIDAK |
| `jadwalrilis` | `3058` = Senin … `3064` = Minggu, `3065` = Random |
| `Studio` | ID studio (mis. `1078` = A-1 Pictures) |

Beberapa param bisa digabung (`animestatus` + `animetype` + `animegenre`).

## Pagination headers

Response list mengirim:

```
X-WP-Total: <total item>
X-WP-TotalPages: <total halaman>
Link: <...>; rel="next"   (jika ada halaman berikut)
```

## Status test (ringkas, 2026-09-22)

| Endpoint | Status |
|---|---|
| `GET /animes?...` berbagai filter | **200** |
| `GET /animes/{id}` | **200** |
| `GET /animes?slug=...` | **200** |
| `GET /animegenre` dll. | **200** |
| `GET /animes/999999999` | **404** |
| `per_page=0` / `101` / `orderby=invalid` | **400** |
| Video `ab_linkcdn` (HEAD + Range) | **200 / 206** `video/mp4` |

Contoh response ada di `../samples/`.
