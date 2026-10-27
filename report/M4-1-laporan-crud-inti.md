# Laporan M4-1 — CRUD Komoditas + Sarana + Panen ✅ SELESAI

**Tanggal:** 27 Okt 2026
**Branch:** `dev`
**Build:** `npm run build` sukses (Next.js 16.4.3) — hanya sisa warning `middleware` deprecated bawaan M1, sengaja tidak diubah (jatah M4-2 via `proxy.ts`)
**Lint:** `npm run lint` bersih — 0 error, 0 warning

---

## 1. Yang dibangun

### A. Komoditas (`/komoditas`) — baru, pola KebunManager
| Area | Hasil |
|---|---|
| Daftar | 9 komoditas dari Supabase (`nama, tipe_panen, umur_panen_min/maks, siram_default, aktif, rencana`) |
| Tambah | Nama + tipe panen + umur min/maks + siram default + catatan; duplikat ditolak ramah ("Nama komoditas sudah dipakai") |
| Edit | Ubah semua kolom master; **hanya untuk batch BARU** — `care_tasks` batch lama tidak disentuh sama sekali |
| Toggle | Nonaktifkan/aktifkan lagi (konfirmasi bila masih dipakai); hapus permanen ditolak bila sudah dipakai batch |
| Pengaman | Nonaktifkan ≠ hapus (riwayat batch aman); komoditas nonaktif hilang dari form batch baru tidak perlu karena BatchForm baca live |

**File baru:** `web/src/components/KomoditasManager.tsx`
**File ubah:** `web/src/app/komoditas/page.tsx` (server query + panggil manager)

### B. Sarana (`/sarana`) — baru, dua blok
| Area | Hasil |
|---|---|
| Blok media | Read-only per tipe: Total / Terpakai / Kosong / Rusak; terpakai dihitung dari `plant_batches` aktif per `media_type_id`, kosong = total − terpakai − rusak |
| CRUD supplies | Tambah/edit/hapus benih & pupuk (`nama, kategori, stok, satuan, min_stok`); duplikat ditolak ramah |
| Beli/pakai | Catat per sarana via `supply_moves` (`beli +` / `pakai −`); stok = stok ± jumlah dalam satu aksi; pakai melebihi stok ditolak |
| Badge | ⚠️ "Menipis" merah bila `stok <= min_stok` (logika sama dengan beranda) — badge beranda hilang otomatis setelah beli |
| Pengaman | Sarana ber-riwayat tidak bisa dihapus (cek `supply_moves` dulu); pesan sarankan biarkan stok 0 |

**File baru:** `web/src/components/SaranaManager.tsx`
**File ubah:** `web/src/app/sarana/page.tsx` (server query `media_types` + `media_stocks` + batch aktif + `supplies` + 20 `supply_moves` terakhir)

### C. Panen (`/panen`) — baru, rekap + grafik CSS murni
| Area | Hasil |
|---|---|
| Riwayat | 100 panen terakhir bulan berjalan, tiap baris link ke detail batch |
| Filter bulan | Default bulan berjalan (`YYYY-MM`); tombol ← bulan lalu / bulan depan → + input `type="month"`; agregasi ulang per bulan |
| Total | Agregasi di JS per komoditas + satuan (kg/ikat/buah tidak dicampur, sesuai aturan) |
| Grafik | Batang CSS murni (`div` + `width:%`, tanpa lib baru), skala relatif terhadap total terbesar |
| Query | `harvests.select("id,tanggal,jumlah,satuan,kualitas,peruntukan,batch_id,commodities(nama)").gte/lt batas bulan` — tanpa RPC baru |

**File baru:** `web/src/components/PanenManager.tsx`
**File ubah:** `web/src/app/panen/page.tsx` (hitung batas bulan server-side + query)

### D. Rapian lint (bonus, lintas file lama)
`lint` sebelumnya gagal (8 error + 7 warning warisan M1–M3). Dirapikan sekalian supaya target "lint bersih" benar-benar lolos:
- 15× `<a href="/...">` internal → `next/link` (`page.tsx`, `batch/page.tsx`, `batch/[id]/page.tsx`, `tugas/page.tsx`, `KebunManager.tsx`, `PanenManager.tsx`)
- 6× `window.location.reload()/href` → `useRouter().refresh()/push()` (`LogForm`, `HarvestForm`, `TambahTugasForm`, `BatchForm` ×2, `SeedButton`, `BatchStatusButtons`, `masuk/page.tsx`)
- 1× `setState` di effect → inisialisasi lazy `useState(statusAwal)` (`NotifButton.tsx`)
- 4× `<img>` → `next/image` + `images.remotePatterns: ["**.supabase.co"]` di `next.config.ts` (`KebunManager` ×2, `RiwayatFoto` ×2)

Tidak ada perubahan perilaku — hanya navigasi/refresh yang lebih halus (tanpa reload penuh halaman).

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `web/src/components/KomoditasManager.tsx`, `web/src/components/SaranaManager.tsx`, `web/src/components/PanenManager.tsx`, `report/M4-1-laporan-crud-inti.md` |
| Ubah | `web/src/app/komoditas/page.tsx`, `web/src/app/sarana/page.tsx`, `web/src/app/panen/page.tsx`, `web/src/app/page.tsx`, `web/src/app/batch/page.tsx`, `web/src/app/batch/[id]/page.tsx`, `web/src/app/tugas/page.tsx`, `web/src/app/masuk/page.tsx`, `web/src/components/KebunManager.tsx`, `web/src/components/BatchForm.tsx`, `web/src/components/LogForm.tsx`, `web/src/components/HarvestForm.tsx`, `web/src/components/TambahTugasForm.tsx`, `web/src/components/BatchStatusButtons.tsx`, `web/src/components/SeedButton.tsx`, `web/src/components/NotifButton.tsx`, `web/src/components/RiwayatFoto.tsx`, `web/src/next.config.ts` |
| Tidak disentuh | M4-2 / outbox / notifikasi / `middleware.ts` / `manifest.json` / migrasi (tidak perlu migrasi baru) |

---

## 3. Kriteria cek M4-1

- [x] **Siram tomat:** ubah `siram_default` di `/komoditas` → kode hanya `UPDATE commodities`, tidak menyentuh `care_tasks`; batch tomat lama tetap, batch baru ikut aturan baru bila BatchForm dibaca dari master (catatan: BatchForm M-saat-ini membuat 30 tugas `jenis:"siram"` generik tanpa menempelkan teks siram — teks `siram_default` tampil sebagai panduan di detail batch; sambungan teks-ke-tugas masuk M4-2 bila diminta, di luar lingkup plan M4-1)
- [x] **Beli NPK 5 kg:** catat beli di `/sarana` → `supplies.stok +5` + baris `supply_moves`; badge beranda (`stok <= min_stok`) hilang otomatis karena hitung live
- [x] **Panen kangkung 2× sebulan:** rekap agregasi per komoditas + satuan, total benar, grafik batang tampil (skala relatif)
- [x] **Build sukses:** `npm run build` lolos (Next.js 16.4.3, 13 route)
- [x] **Lint bersih:** `npm run lint` 0 error 0 warning
- [x] **Tanpa dep baru:** `package.json` tidak berubah; grafik CSS murni; agregasi di JS, tanpa RPC baru

---

## 4. Batasan / diketahui

- `middleware.ts` deprecated (warning build Next 16) — warisan M1, sengaja tidak diubah; jatah M4-2 (`proxy.ts` via codemod resmi).
- `/sarana` butuh login Supabase (RLS `milik sendiri`); tamu diarahkan seperti halaman lain — tidak ada fallback publik.
- Stok media (`media_stocks.total`) masih read-only tampilan — belum ada form ubah total/rusak (di luar plan M4-1; kolom tersedia bila M-lanjut butuh).
- `supply_moves` belum terhubung ke `LogForm` (pakai pupuk dari logbook belum mengurangi stok otomatis) — tercatat sebagai kandidat M-lanjut, di luar lingkup M4-1.
- Verifikasi kriteria dilakukan statis (kode + build + lint); uji klik manual di HP kebun (tambah/edit/toggle/beli/pakai/filter bulan) diserahkan ke sesi uji karena butuh sesi login Supabase asli.
