# Laporan M10 — Estimasi Batch di Landing ✅ SELESAI

**Tanggal:** 30 Okt 2026
**Branch:** `dev`
**Typecheck:** `npx tsc --noEmit` bersih. **Migrasi SQL:** tidak ada.
**File diubah:** `web/src/app/api/publik/bibit/route.ts`

## 1. Masalah

Di Supabase sudah ada 2 batch tanam, tetapi landing page tidak menampilkan estimasi kapan bibitnya tersedia.

## 2. Akar masalah

1. API landing memakai `.eq("tujuan", "jual")`. Form batch default `tujuan = "kebun"`, jadi 2 batch tersebut tidak pernah masuk query.
2. Estimasi hanya dihitung dari `commodities.umur_siap_min`. Bila kolom itu kosong (mis. Timun), batch tidak punya estimasi sama sekali.
3. Batch yang sudah melewati umur siap tetapi `stok_siap = 0` hilang dari dua-duanya: bukan `siap` (stok 0) dan bukan `estimasi` (umur sudah lewat).
4. `.env.local` lokal belum punya `SUPABASE_SERVICE_ROLE_KEY`, sehingga API mengembalikan `{ kosong: true }` saat tes lokal. Di Vercel key sudah terpasang.

## 3. Perubahan

- Query mengambil semua batch aktif (`status` bukan `selesai/gagal`) tanpa filter `tujuan`, plus kolom `tujuan` dan `umur_panen_min/maks`.
- Estimasi memakai `umur_siap_min`, fallback ke `umur_panen_min` bila kosong.
- Batch yang sudah lewat umur tapi stok siap masih 0 tetap tampil dengan estimasi "hari ini" (tidak hilang).
- `sudahSiap` kini murni `stok_siap > 0`.
- Katalog etalase tetap **hanya** dari batch `tujuan = 'jual'`, jadi stok jualan tidak tercampur batch kebun.
- `totalBatch` menghitung semua batch aktif (label "batch aktif dirawat" jadi akurat).

## 4. Verifikasi

Dev server + `GET /api/publik/bibit` mengembalikan 2 batch:

```json
{
  "totalSiap": 0,
  "totalBatch": 2,
  "estimasi": [
    { "nama": "Terong", "jumlah": 20, "hst": 6, "siapMin": 30, "estimasi": "2026-11-23", "sisaHari": 24 },
    { "nama": "Timun", "jumlah": 15, "hst": 4, "siapMin": 40, "estimasi": "2026-12-05", "sisaHari": 36 }
  ]
}
```

Keduanya tampil di tabel `#batch` dan kartu `#estimasi` landing.

## 5. Catatan

- Timun memakai fallback `umur_panen_min` (40 HST) karena `umur_siap_min` masih kosong. Isi lewat halaman Komoditas (centang 🌱 Jual bibit) bila ingin estimasi bibit yang lebih akurat.
- 2 batch di atas bertujuan `kebun`, jadi hanya muncul di estimasi — bukan di etalase stok. Ubah tujuan ke "Bibit jual" bila ingin masuk katalog.
- Cache API `revalidate = 120` detik; setelah deploy tunggu ±2 menit.
- Halaman `/komoditas` dan tabel `commodities` sudah sinkron (14 baris, kolom sama). Semua `harga_pcs` masih null — itu data, bukan bug.
