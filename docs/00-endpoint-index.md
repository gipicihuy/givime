# Endpoint index (quick reference)

Base: `https://karanime.com/wp-json/wp/v2`  
Method: `GET` · Auth: none

| # | Endpoint | Fungsi | Params utama | Status | Sample |
|---|---|---|---|---|---|
| 1 | `/animes` | List/home/katalog | `search`, `page`, `per_page`, `orderby`, `order`, `animestatus`, `animetype`, `animegenre`, `animetop`, `jadwalrilis`, `animeseason`, `Studio`, `_fields` | 200 | `samples/home_ongoing.json` |
| 2 | `/animes?search=` | Pencarian | `search`, `page`, `per_page` | 200 | `samples/search_naruto.json` |
| 3 | `/animes/{id}` | Detail + episode | path `id` | 200 | `samples/detail_by_id.json` |
| 4 | `/animes?slug=` | Detail by slug | `slug` | 200 | `samples/detail_by_slug.json` |
| 5 | *(embedded)* `meta_box.ab_cdngroup` | Daftar episode + URL video | dari #3/#4 | 200 | di detail sample |
| 6 | `ab_linkcdn` (CDN) | Streaming MP4 | URL-encode | 200/206 | — |
| 7 | `/animegenre` | Daftar genre | `per_page`, `page`, `orderby` | 200 | `samples/genres.json` |
| 8 | `/animetype` | Filter TV/Movie | `per_page` | 200 | `samples/animetypes.json` |
| 9 | `/animestatus` | Filter Ongoing/Completed | `per_page` | 200 | `samples/animestatus.json` |
| 10 | `/animetop` | Filter top YA/TIDAK | `per_page` | 200 | `samples/animetop.json` |
| 11 | `/jadwalrilis` | Jadwal hari | `per_page` | 200 | `samples/jadwalrilis.json` |
| 12 | `/animeseason` | Season | `per_page` | 200 | `samples/seasons.json` |
| 13 | `/Studio` | Studio | `per_page` | 200 | `samples/studios.json` |
| 14 | `/media/{id}` | Cover media | path id | 200 | `samples/media_featured.json` |

## ID hard-coded dari app

```
animestatus: 2872=Ongoing  2883=Completed
animetype:   2900=TV       2916=Movie
animetop:    2901=YA       2899=TIDAK
jadwalrilis: 3058=Senin 3059=Selasa 3061=Rabu 3062=Kamis
             3063=Jumat 3057=Sabtu  3064=Minggu 3065=Random
```

## Tidak dipakai untuk web anime

`free.karanime.com`, `vip.karanime.com`, Firebase likes/reports, ads,
analytics, billing, WP write routes.
