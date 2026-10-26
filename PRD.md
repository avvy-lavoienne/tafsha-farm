# PRD — Aplikasi Manajemen Kebun Tafsha Farm

**Versi:** 1.0 (26 Okt 2026)
**Status:** Draft untuk disetujui
**Lokasi kebun:** Halaman Depan & Lahan Depan Mushola — Desa Pakuwon, Kec. Cisurupan, Kab. Garut

---

## 1. Ringkasan Eksekutif

Aplikasi web PWA untuk mencatat dan mengingatkan seluruh kegiatan berkebun di 2 lokasi: Halaman Depan dan Lahan Depan Mushola. Mencakup pencatatan batch tanam per media (galon Le Minerale 15L, polybag 10x15, 35x35, 40x40), jadwal perawatan harian, logbook + foto, panen, dan stok sarana. Target pengguna: pemilik kebun + 1-2 anggota keluarga pembantu.

Hasil akhir yang diharapkan: tidak ada lagi kegiatan siram/pupuk yang terlewat, setiap galon/polybag jelas isinya apa dan umurnya berapa, serta tahu komoditas mana yang paling berhasil dan paling gagal.

## 2. Latar Belakang & Konteks

- **Skala saat ini:** 2 lokasi, 7 komoditas aktif (cabai, timun, terong, talas, tomat, kangkung, bayam), 2 komoditas rencana (lavender, selada).
- **Media tanam:** galon Le Minerale 15 liter (pakai ulang), polybag 10x15 cm (semai), 35x35 cm & 40x40 cm (tanam besar seperti terong/talas/tomat).
- **Masalah yang dialami:**
  1. Lupa kapan terakhir siram/pupuk per tanaman karena lokasi terpisah.
  2. Tidak tercatat umur tanaman (HST) sehingga panen tidak tepat waktu.
  3. Tidak tahu riwayat gagal tanam (penyebab mati: busuk akar, hama, kekeringan).
  4. Stok media/benih/pupuk tidak terpantau.
  5. Foto progres tersebar di galeri HP, tidak terhubung ke tanamannya.
- **Kondisi lapangan:** sinyal di kebun kadang lemah → aplikasi harus bisa dibuka dan mencatat dalam keadaan offline, sinkron saat online.

## 3. Tujuan & Indikator Keberhasilan

| Tujuan | Indikator (diukur 1 bulan setelah launching) |
|---|---|
| Tidak ada perawatan terlewat | ≥ 90% tugas harian diselesaikan/dicatat |
| Semua media terlacak | 100% galon/polybag aktif tercatat batch-nya |
| Evaluasi berbasis data | Bisa jawab: komoditas apa dengan gagal tanam tertinggi & panen terbanyak |
| Cepat mencatat di kebun | Catat siram + foto < 30 detik dari HP |

## 4. Ruang Lingkup

### 4.1 MVP — Wajib ada di rilis pertama (Fase 1)
1. Manajemen 2 lokasi + sub-blok/bedeng.
2. Master komoditas (9 item: 7 aktif + lavender + selada sebagai rencana).
3. Inventaris media tanam (4 tipe + kondisi).
4. Batch tanam + lifecycle status (semai → tumbuh → panen → selesai/gagal).
5. Tugas harian + pengingat (jadwal siram/pupuk per komoditas).
6. Logbook aktivitas + foto.
7. Pencatatan panen + rekap sederhana.
8. Stok benih/pupuk/sarana sederhana + peringatan stok menipis.
9. PWA: bisa di-install di HP, bisa baca tugas & catat offline.
10. Dashboard ringkas: tugas hari ini, umur tanaman, total panen bulan ini.

### 4.2 Good-to-Have — Fase 2 (setelah MVP stabil)
1. QR label per galon/polybag → scan langsung buka detail batch.
2. Kalender tanam & aturan rotasi media (mencegah tanah lelah).
3. Integrasi cuaca Cisurupan/Garut (rekomendasi skip siram saat hujan).
4. Analisis biaya vs hasil + tingkat kegagalan per komoditas.
5. Pengingat otomatis berbasis umur (misal tomat 60 HST → siap panen).
6. Multi-user keluarga (pemilik + anggota).
7. Ekspor Excel/PDF.
8. SOP tanam per komoditas (khusus lavender & selada yang baru).

### 4.3 Di luar lingkup (tidak dikerjakan)
- Marketplace/penjualan online, integrasi sensor IoT, aplikasi iOS/Android native terpisah.

## 5. Persona & User Story

**Persona 1 — Firman (pemilik):** menanam, merawat, dan evaluasi. Butuh gambaran lengkap + riwayat.
**Persona 2 — Anggota keluarga:** bantu siram. Butuh daftar tugas hari ini yang jelas + cara centang cepat.

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-01 | Pemilik | menambah batch tanam cabai 10 galon di Halaman Depan | jelas apa ditanam di mana |
| US-02 | Pembantu | melihat "Tugas Hari Ini" | tahu apa yang harus disiram/dipupuk |
| US-03 | Pemilik | mencatat siram + foto dalam <30 detik | progres terdokumentasi |
| US-04 | Pemilik | mengubah status batch menjadi gagal + alasannya | tahu penyebab & evaluasi |
| US-05 | Pemilik | mencatat panen kangkung 5 ikat | tahu hasil per komoditas |
| US-06 | Pemilik | dapat peringatan stok pupuk menipis | tidak kehabisan saat dibutuhkan |
| US-07 | Pemilik | membuka aplikasi offline di kebun | tetap bisa kerja tanpa sinyal |

## 6. Kebutuhan Fungsional

### F-01 Lokasi & Sub-Blok
- CRUD lokasi: nama, deskripsi, foto, titik koordinat (opsional), status aktif.
- Data awal: `HAL-01 Halaman Depan`, `MUS-01 Lahan Depan Mushola`.
- Sub-blok per lokasi: misal Halaman Depan → Rak Galon, Deret Polybag; Mushola → Blok A, Blok B.
- Nonaktifkan lokasi tanpa menghapus riwayat.

### F-02 Master Komoditas
- Field: nama, varietas default, tipe panen (sekali/petik berulang/potong), umur panen (HST), kebutuhan air (rendah/sedang/tinggi), interval siram default, catatan SOP.
- Data awal:

| Komoditas | Tipe | Umur panen | Siram default |
|---|---|---|---|
| Cabai | petik berulang | 75–90 HST | 1x pagi |
| Timun | petik berulang | 40–50 HST | 1–2x sehari |
| Terong | petik berulang | 60–70 HST | 1x sehari |
| Talas | sekali | 180–240 HST | 1x sehari, suka lembap |
| Tomat | petik berulang | 60–75 HST | 1x pagi |
| Kangkung | potong | 20–30 HST | 2x sehari |
| Bayam | potong/cabut | 20–30 HST | 2x sehari |
| Lavender (rencana) | hias/minyak | 90–120 HST | 1x, tidak suka becek |
| Selada (rencana) | potong/cabut | 30–40 HST | 2x, teduh parsial |

### F-03 Media Tanam
- Master tipe: Galon 15L, Polybag 10x15, 35x35, 40x40 (+ volume liter, foto contoh).
- Inventaris: jumlah total, terpakai, kosong, rusak. Harga beli opsional untuk hitung biaya.
- Aturan: 1 media besar = 1 batch (terong/tomat/cabai). Polybag kecil/semai dan kangkung/bayam boleh isi >1 tanaman per wadah (catat jumlah bibit).

### F-04 Batch Tanam (modul inti)
- Field wajib: komoditas, jumlah, media, lokasi + sub-blok, tgl semai, tgl pindah tanam.
- Field opsional: varietas, sumber benih, foto awal, catatan.
- Status: `semai | tumbuh | panen | selesai | gagal`.
- Aksi: pindah status, duplikat batch (tanam lagi dengan pola sama), tutup batch + alasan (panen selesai / mati → pilih penyebab: busuk akar, hama kutu/ulat, layu, kekeringan, kebanjiran, lain-lain).
- HST (hari setelah tanam) dihitung otomatis dan tampil di kartu batch.
- Filter: per lokasi, per komoditas, per status, siap panen (HST ≥ umur panen).

### F-05 Tugas & Pengingat
- Tugas dibuat otomatis dari aturan komoditas saat batch dibuat (misal kangkung → siram pagi + sore).
- Jenis tugas: siram, pupuk, semprot organik/pestisida, penyiangan, cek hama, pindah tanam, panen.
- Tampilan utama: "Tugas Hari Ini" dikelompokkan per lokasi, dengan tombol centang cepat + lewati + tunda besok.
- Centang selesai otomatis membuat entri logbook.
- Tugas berulang bisa diubah intervalnya per batch.

### F-06 Logbook + Foto
- Field: tanggal-jam, batch, jenis kegiatan, deskripsi, dosis (untuk pupuk/semprot), foto (maks 3 per entri, kompres otomatis), dikerjakan oleh.
- Timeline per batch: urutan kronologis + foto.
- Bisa input offline, antre sinkron saat online.

### F-07 Panen
- Field: tanggal, batch, jumlah, satuan (kg/gram/ikat/buah/potong), kualitas (bagus/sedang/rusak), peruntukan (konsumsi/jual/bagi).
- Batch tipe petik berulang tetap status `panen` sampai ditutup. Tipe sekali/potong → panen bisa langsung menutup batch.
- Rekap: total per komoditas per bulan, grafik sederhana.

### F-08 Sarana (Benih/Pupuk/Obat)
- Field: nama, kategori, stok, satuan, stok minimum, tanggal kedaluwarsa (opsional).
- Transaksi: masuk (beli) / keluar (pakai, terhubung ke logbook pupuk/semprot).
- Peringatan: badge merah saat stok ≤ minimum.

### F-09 Dashboard
- Kartu: Tugas hari ini (x belum / y selesai), Siap panen (n batch), Gagal bulan ini, Total panen bulan ini.
- Daftar: tugas tertunda, batch mendekati panen (7 hari), stok menipis.
- Filter cepat per lokasi.

## 7. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Platform | Web PWA (install di Android/iOS via browser, ikon sendiri) |
| Performa | Halaman tugas hari ini terbuka < 2 detik di HP 3G; foto dikompres < 500KB |
| Offline | Lihat tugas + tambah logbook/panen offline; sinkron otomatis saat online, tampil status "menunggu sinkron: n" |
| Keamanan | Login email + password (Supabase Auth); data hanya milik akun sendiri (Row Level Security) |
| Backup | Database harian otomatis (bawaan Supabase); ekspor manual Excel tersedia Fase 2 |
| Bahasa | Indonesia |
| Aksesibilitas | Tombol besar untuk dipakai dengan tangan kotor/sarung tangan; kontras cukup di bawah matahari |

## 8. Arsitektur & Tech Stack (Keputusan)

**Keputusan: Next.js PWA di-deploy di Vercel + Supabase (Postgres + Auth + Storage).**

- **Vercel + Supabase = bagus untuk kasus ini.** Vercel untuk hosting web (gratis, deploy otomatis dari GitHub branch `dev` → preview, `main` → produksi). Supabase untuk database + login + penyimpanan foto (free tier cukup untuk skala kebun rumahan, tanpa bikin backend sendiri).
- **PWA bukan lawan dari Vercel+Supabase.** PWA adalah teknik di sisi web-nya (manifest + service worker) agar bisa di-install di HP, dibuka offline, dan kirim notifikasi pengingat. Jadi ketiganya digabung: **Next.js PWA (frontend) + Supabase (backend) + Vercel (hosting).**
- Struktur: `aplikasi (Next.js PWA)` ↔ `Supabase (Postgres + Auth + Storage bucket kebun-foto)`; service worker cache halaman tugas + antrean tulis offline.

### Model Data (Supabase Postgres)
- `locations(id, kode, nama, deskripsi, foto_url, lat, lng, aktif)`
- `sub_blocks(id, location_id, nama)`
- `media_types(id, nama, ukuran, volume_liter)` — galon 15L, polybag 10x15/35x35/40x40
- `media_stocks(media_type_id, total, terpakai, rusak)`
- `commodities(id, nama, tipe_panen, umur_panen_min, umur_panen_maks, siram_default, catatan)`
- `plant_batches(id, commodity_id, location_id, sub_block_id, media_type_id, jumlah, tgl_semai, tgl_tanam, status, penyebab_gagal, catatan)`
- `care_tasks(id, batch_id, jenis, due_date, status, selesai_at)`
- `activity_logs(id, batch_id, jenis, deskripsi, dosis, foto_urls[], oleh, created_at)`
- `harvests(id, batch_id, tanggal, jumlah, satuan, kualitas, peruntukan)`
- `supplies(id, nama, kategori, stok, satuan, min_stok)` + `supply_moves(id, supply_id, arah, jumlah, tanggal, batch_id?)`
- Storage bucket: `kebun-foto`.

## 9. Alur Utama

1. **Tanam baru:** Pilih lokasi → sub-blok → komoditas → media → jumlah → tgl semai/tanam → tugas otomatis dibuat → batch muncul di dashboard.
2. **Rawat harian:** Buka Tugas Hari Ini → kerjakan per lokasi → centang (+foto jika perlu) → jadi logbook.
3. **Panen:** Dari kartu batch → Catat panen → isi jumlah/satuan/kualitas → masuk rekap.
4. **Gagal:** Dari kartu batch → Tandai gagal → pilih penyebab → batch ditutup, media dikembalikan ke stok kosong.
5. **Cek stok:** Buka Sarana → lihat yang badge merah → beli → catat masuk.

## 10. Struktur Halaman (IA)

`/ (Dashboard)` — tugas hari ini, siap panen, rekap
`/kebun` — 2 lokasi + sub-blok
`/batch` — daftar + filter + detail + timeline
`/tugas` — harian/mingguan, per lokasi
`/panen` — riwayat + rekap bulanan
`/sarana` — benih/pupuk/media
`/komoditas` — master 9 komoditas + SOP
`/pengaturan` — akun, notifikasi, ekspor

## 11. Kriteria Penerimaan (Acceptance Criteria)

- [ ] 2 lokasi + 4 tipe media + 9 komoditas terisi sebagai data awal.
- [ ] Bisa buat batch "Cabai 10 galon 15L di Halaman Depan", HST terhitung otomatis.
- [ ] Tugas siram otomatis muncul keesokan paginya; centang tercatat jadi logbook.
- [ ] Catat siram + 1 foto dari HP < 30 detik (diuji di Chrome Android).
- [ ] Matikan internet → tugas hari ini tetap terbuka, catat logbook tersimpan, saat online tersinkron (badge antrean berkurang ke 0).
- [ ] Catat panen kangkung 5 ikat → muncul di rekap bulan berjalan.
- [ ] Stok pupuk di bawah minimum → muncul badge di dashboard.
- [ ] Install PWA di HP (Add to Home Screen) berjalan; ikon + splash tampil.
- [ ] Deploy preview dari branch `dev` di Vercel sukses tanpa error.

## 12. Roadmap

| Milestone | Isi | Output |
|---|---|---|
| M1 — Fondasi | Next.js PWA + Supabase + Auth + deploy Vercel (dev) | URL preview bisa login |
| M2 — Data inti | CRUD lokasi, media, komoditas (data awal masuk) | 2 lokasi & 9 komoditas tampil |
| M3 — Batch | CRUD batch + status + HST + filter | Alur tanam→gagal/panen jalan |
| M4 — Rawat | Tugas harian + logbook + foto + offline | Tugas hari ini + sinkron jalan |
| M5 — Hasil | Panen + sarana + dashboard rekap | Rekap bulanan tampil |
| M6 — Polish | Notifikasi, PWA install, uji HP di kebun | Rilis ke `main` |

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Sinyal lemah di kebun | Desain offline-first sejak M4; cache tugas 7 hari |
| Foto besar bikin lambat/penuh | Kompres otomatis di HP + batas 3 foto/entri |
| Lupa mencatat | Notifikasi pagi + tampilan 1-tombol centang |
| Nama media tercampur (galon vs polybag) | Master media dikunci, hanya pilih dari daftar + label kode |
| Scope membesar (minta marketplace/IoT) | Tegas Fase 2 dulu; backlog terpisah |

---

*Siap dilanjutkan ke desain database + setup proyek (M1) setelah PRD ini disetujui.*
