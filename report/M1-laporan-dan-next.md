# Laporan M1 — Fondasi Tafsha Farm ✅ LOLOS

**Tanggal:** 26 Okt 2026
**Branch:** `dev` → push ke `origin/dev`
**Status validasi user:** Lolos semua 10 skenario uji

---

## 1. Yang dibangun

| Area | Hasil |
|---|---|
| Hosting + backend | Next.js 16 PWA di `web/`, Supabase (Postgres + Auth + RLS) |
| Database | 11 tabel + fungsi `seed_tafsha_farm()` (0001) + perbaikan seed (0002) |
| Data awal | 2 lokasi (Halaman Depan, Lahan Mushola), 4 media (galon 15L + 3 polybag), 9 komoditas |
| Halaman | Beranda dinamis, Masuk, Pengingat, Tanam + form, Detail batch, Kebun/Panen/Sarana/Komoditas (placeholder M2+) |
| Paradigma | **Pengingat murni** — dibaca saja, tanpa centang/laporan. Catatan & panen opsional manual |

## 2. Hasil validasi (10/10 lolos)

1. ✅ Daftar + masuk akun baru
2. ✅ Seed data awal dari aplikasi (bukan SQL manual)
3. ✅ Tambah batch → detail kebuka, HST tampil
4. ✅ Pengingat siram hari ini muncul per lokasi
5. ✅ Angka beranda cocok dengan halaman Pengingat
6. ✅ Status: mulai panen → tutup (konfirmasi) → arsip → buka lagi
7. ✅ Catatan muncul di Riwayat
8. ✅ Panen tercatat → rekap beranda bertambah
9. ✅ Halaman Pengingat kebuka offline (cache PWA)
10. ✅ Form tanpa jumlah tidak error aneh

## 3. Keputusan desain penting

- Tugas = notifikasi biasa (🔔/⚠️ + tanggal), **tidak ada tombol centang**.
- `Selesaikan` diganti `Tutup batch` + konfirmasi + tombol `Buka lagi` (data aman).
- Seed lewat tombol di aplikasi (RPC), tidak perlu SQL Editor manual.
- Bug seed 500 (INSERT 2 baris + RETURNING INTO 1 var) diperbaiki di 0002.

## 4. Diketahui / batasan

- `middleware.ts` deprecated di Next 16 (ganti `proxy.ts`) — warning saja, masih jalan. Rapikan saat upgrade.
- `NODE_ENV=production` di environment Windows ini bikin install skip devDeps — selalu install dengan `NODE_ENV=development`.
- Bucket storage `kebun-foto` belum dibuat (foto logbook M4).

---

# What To Do Next — M2: Data Inti (CRUD Kebun + Komoditas)

**Tujuan:** halaman Kebun, Komoditas, Sarana, Panen tidak lagi placeholder.

## M2-1 Halaman Kebun (`/kebun`)
- [ ] Daftar 2 lokasi + sub-blok (data asli dari Supabase)
- [ ] Tambah / edit / nonaktifkan lokasi + sub-blok
- [ ] Hitung per lokasi: batch aktif, siap panen
- Kriteria: tambah "Blok C" di Mushola → muncul di form batch baru

## M2-2 Halaman Komoditas (`/komoditas`)
- [ ] Daftar 9 komoditas + umur panen + siram default
- [ ] Tambah / edit komoditas (untuk lavender & selada saat mulai ditanam)
- [ ] Tandai aktif / rencana
- Kriteria: ubah siram tomat → batch tomat baru ikut aturan baru

## M2-3 Halaman Sarana (`/sarana`)
- [ ] Stok media per tipe (total / terpakai / kosong / rusak)
- [ ] CRUD benih + pupuk + peringatan stok menipis (badge beranda sudah ada, tinggal halamannya)
- [ ] Catat beli / pakai
- Kriteria: beli NPK 5 kg → stok bertambah, badge beranda hilang

## M2-4 Halaman Panen (`/panen`)
- [ ] Riwayat semua panen + filter bulan + total per komoditas
- [ ] Grafik batang sederhana per bulan
- Kriteria: panen kangkung 2x dalam sebulan → total benar di rekap

## Urutan kerja
M2-1 → M2-2 → M2-3 → M2-4. Estimasi tiap bagian 1 sesi. Setelah M2 beres → M3 (polish batch: duplikat batch, pindah media, foto) → M4 (offline tulis + notifikasi push) → deploy Vercel `main`.
