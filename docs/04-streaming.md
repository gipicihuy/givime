# Streaming, episode, subtitle

## 1. Sumber data episode

**Tidak ada API `/episodes` terpisah.**

Episode berada di response anime:

```http
GET https://karanime.com/wp-json/wp/v2/animes/{id}
GET https://karanime.com/wp-json/wp/v2/animes?slug={slug}
```

```json
"meta_box": {
  "ero_episode": "12",
  "ab_cdngroup": [
    {
      "ab_namaep": "1",
      "ab_linkcdn": "https://r2.umum.work/Hontokyu S2/Hontokyu S2 - 01 [720p].mp4",
      "_state": "expanded"
    }
  ]
}
```

Di binary app field ini dibaca via key `ab_cdngroup`, `ab_namaep`, `ab_linkcdn`
(model `package:animehub/actions/models/anime_model.dart`).

## 2. Info “episode” vs jumlah real

| Field | Arti |
|---|---|
| `meta_box.ero_episode` | label jumlah episode (string); bisa `99999` untuk ongoing panjang |
| `meta_box.ab_cdngroup.length` | jumlah entri video yang benar-benar ada |
| `content.rendered` | sinopsis anime, **bukan** transcript episode |

Untuk UI “Total episode”, lebih aman pakai `length(ab_cdngroup)` di detail,
dan `ero_episode` hanya sebagai label cepat di card list.

## 3. Streaming video

### Cara resmi yang berfungsi (dari APK)

1. Buka detail anime → `ab_cdngroup`
2. Pilih episode → `ab_linkcdn`
3. Play **langsung** (MP4 progressive / byte-range)

### Verifikasi (dites)

```http
HEAD https://r2.umum.work/ManaFriend/ManaFriend%2001%20%5B720p%5D.mp4
```

Atau contoh ongoing:

```
https://r2.umum.work/Hontokyu%20S2/Hontokyu%20S2%20-%2001%20%5B720p%5D.mp4
```

| Hasil | Nilai |
|---|---|
| HTTP | `200` (HEAD), `206` (Range `bytes=0-1023`) |
| `content-type` | `video/mp4` |
| `accept-ranges` | `bytes` |
| auth | tidak ada |

**WAJIB** URL-encode spasi ` ` → `%20` dan `[]` → `%5B%5D` (atau encode penuh).

### Player yang cocok

- HTML5 `<video src="..." controls>` — cukup untuk MP4
- Atau hls.js/plyr jika nanti ada `m3u8`
- App memakai `better_player_plus`; di binary ada parser HLS
  (`#EXT-X-STREAM-INF`, `#EXT-X-MEDIA`, subtitle HLS) — berguna jika ada
  konten m3u8 di masa depan

### Host legacy di binary (jangan andalkan)

| URL di binary | Status dites |
|---|---|
| `https://free.karanime.com/?id={id}` | DNS gagal resolve |
| `https://vip.karanime.com/?id={id}` | `301` → `https://s3.ap-southeast-1.wasabisys.com/singa/?id=...` → **404** |
| `eropa.karanime.com`, `node1.karanime.com` | DNS gagal |
| `new.karanime.com` | redirect mirror/block |

Flag di binary: `isServerVIP` (bedakan server free vs VIP di app lama).

**Kesimpulan untuk web**: stream dari `ab_linkcdn` saja.

## 4. Subtitle

### Yang ditemukan

- **Tidak ada endpoint subtitle terpisah** (tidak ada `/subtitle`, tidak ada field `.vtt`/`.srt` di `meta_box`).
- Metadata subtitle hanya label: `meta_box.ero_sub` → contoh `"Sub"`.
- Player app mendukung parse subtitle dari:
  - playlist HLS (`#EXT-X-MEDIA:TYPE=SUBTITLES`)
  - URL network (`Failed to read subtitles from network`)
  - file/memory
- Episode sample yang dites semuanya **MP4 polos** — tidak ada track subtitle
  sidecar di API.

### Implikasi untuk web

- Tampilkan badge `ero_sub` (Sub/Dub) di card/detail.
- Jika butuh subtitle, harus dari sumber lain (mis. open subtitle eksternal)
  atau hanya jika `ab_linkcdn` berupa m3u8 yang memuat `EXT-X-MEDIA`.
- Jangan mengarang endpoint subtitle — tidak ada di APK.

## 5. Info tambahan di player / detail

| Field | Penggunaan |
|---|---|
| `ero_trailer` | Trailer YouTube: `https://www.youtube.com/embed/{ero_trailer}` |
| `ero_durasi` | Durasi per episode (teks) |
| `ero_skor` | Skor |
| `ero_japanese` | Judul JP |
| `content.rendered` | Sinopsis |

## 6. Resep “halaman nonton” (web)

```http
# 1) resolve slug → detail
GET /wp-json/wp/v2/animes?slug=one-piece

# 2) episode list = meta_box.ab_cdngroup
# 3) pilih entri → ab_linkcdn → <video src>

# prev/next episode: sort by int(ab_namaep), cari index±1
```

Tidak perlu auth. Tidak perlu token signed URL (CDN terbuka).

## 7. Catatan hak cipta / ToS

Dokumentasi ini hanya hasil analisis teknis APK untuk kebutuhan engineering
referensi API. Penggunaan konten streaming tetap tunduk pada hukum dan
ketentuan penyedia konten.
