# Laporan M8 — Logout ke Landing + Jualan Bibit per Pcs ✅ SELESAI

**Tanggal:** 29 Okt 2026
**Branch:** `dev`
**Build:** `npm run build` sukses (Next.js 16.4.3, 21 route: + `/bibit` + `/api/publik/bibit`, baris `ƒ Proxy (Middleware)` tetap ada)
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `tsc --noEmit` bersih
**Dep baru:** tidak ada. **Migrasi SQL:** 1 file baru (wajib dijalankan manual sekali).

---

## 1. Analisa report M1–M7

| Temuan | Status |
|---|---|
| Logout (`LogoutButton`) redirect ke `/masuk` — user minta ke landing | ✅ Diubah ke `/landing.html` (logout + hapus akun) |
| Komoditas masih 9 lama (cabai, timun, terong, talas, tomat, kangkung, bayam + lavender/selada rencana), tanpa harga bibit | ✅ Migrasi 0007: 13 komoditas, 8 fokus jual bibit |
| Batch tanpa `tujuan`, tanpa `stok_siap`, tanpa tracker | ✅ Kolom + tabel `batch_moves` + `bibit_sales` |
| Landing tanpa etalase jualan | ✅ Seksi `#bibit` live via `/api/publik/bibit` |
| Tamu yang buka `/` diarahkan ke `/landing.html` (middleware + page) — sudah benar | Tidak diubah |

## 2. Yang dibangun

### A. Logout → landing (bukan form login)
- `components/LogoutButton.tsx`: `router.push("/landing.html")` + refresh.
- `components/PengaturanClient.tsx` (hapus akun): sama.
- Middleware tidak diubah — `/landing.html` sudah publik.

### B. Migrasi `supabase/migrations/0007_bibit_jual_tracker.sql` — WAJIB dijalankan sekali
- `commodities`: `jual_bibit, harga_pcs, umur_siap_min, umur_siap_maks`.
- `plant_batches`: `tujuan ('kebun'/'jual'), stok_siap, harga_pcs`.
- `batch_moves` (tracker): `jenis (semai/siap_jual/terjual/mati/pindah/catat)`, `dari_status, ke_status, jumlah, sisa, stok_siap, catatan` + RLS milik-sendiri.
- `bibit_sales` (penjualan pcs): `tanggal, jumlah_pcs, harga_pcs, pembeli, catatan` + RLS milik-sendiri.
- Update data lama: 8 fokus (`Cabai, Tomat, Daun Bawang, Seledri, Bawang Merah, Terong, Strawberry, Mint`) → `jual_bibit=true, aktif=true` + umur siap default; sisipkan 5 komoditas baru yang belum ada (Daun Bawang, Seledri, Bawang Merah, Strawberry, Mint).
- Seed akun baru: 13 komoditas (8 bibit + Timun, Talas, Kangkung, Bayam, Selada).

### C. Komoditas: harga + umur siap bibit
- `KomoditasManager`: tipe + state + form tambah/edit (checkbox 🌱 + harga/pcs + siap min/maks), badge bibit di kartu, counter `🌱 N jual bibit`.
- `komoditas/page.tsx`: select kolom baru + fallback skema lama.

### D. Batch: tujuan kebun/jual
- `BatchForm`: pilihan Tujuan (🏡 Kebun / 🌱 Bibit jual), harga/pcs (default dari komoditas), stok awal (default = jumlah), prefill duplikat bawa tujuan+harga+stok, insert/edit fallback bila DB belum migrasi, tulis `batch_moves` (diabaikan bila tabel belum ada).
- `batch/page.tsx`: filter tujuan + badge `🌱 N siap` di kartu + fallback skema lama.
- `batch/[id]/page.tsx` + `edit/page.tsx`: select kolom baru + fallback skema lama.
- `batch/baru/page.tsx`: bawa `jual_bibit, harga_pcs` ke form.

### E. Tracker komprehensif (`BibitTracker.tsx` — baru)
- Kartu `🌱 Tracker bibit jual`: sisa hidup + stok siap + harga; input jumlah/pembeli/keterangan; tombol `✅ Siap jual`, `💰 Terjual` (catat `bibit_sales` + kurangi sisa & siap), `🕊️ Mati` (kurangi sisa, potong siap dulu).
- `TimelineMoves`: riwayat `semai → siap_jual → terjual/mati` per batch.
- Detail batch tujuan jual: tracker + seksi `🧾 Riwayat tracker`.

### F. Halaman `/bibit` (baru) + nav
- Total pcs siap + nilai stok, rekap per komoditas, daftar batch jual; fallback instruksi migrasi bila DB lama.
- `BottomNav` (+ grid desktop 9→10), `MenuGrid` beranda kartu Bibit, kartu `StatCard` bibit di beranda (baca `stok_siap`).

### G. Landing promosi bibit (`public/landing.html`)
- Seksi `#bibit` (etalase: nama + pcs siap + harga + tombol order), FAB sheet +1 tautan, fetch `/api/publik/bibit` (gagal → pesan rapi).
- API `/api/publik/bibit` (baru): agregat anonim per komoditas via service-role, `revalidate 300`; tanpa key → `{kosong:true}`.

---

## 3. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `supabase/migrations/0007_bibit_jual_tracker.sql`, `web/src/components/BibitTracker.tsx`, `web/src/app/bibit/page.tsx`, `web/src/app/api/publik/bibit/route.ts`, `report/M8-laporan-logout-bibit.md` |
| Ubah | `LogoutButton.tsx`, `PengaturanClient.tsx`, `KomoditasManager.tsx`, `komoditas/page.tsx`, `BatchForm.tsx`, `batch/page.tsx`, `batch/[id]/page.tsx`, `batch/[id]/edit/page.tsx`, `batch/baru/page.tsx`, `BibitTracker` integrasi, `BottomNav.tsx`, `app/page.tsx`, `SeedButton.tsx`, `public/landing.html` |

## 4. Cara pakai (urutan wajib)

1. **Jalankan migrasi** di Supabase Dashboard → SQL Editor: `supabase/migrations/0007_bibit_jual_tracker.sql` (sekali, aman diulang).
2. Buka `/komoditas` → isi **harga/pcs** tiap 8 bibit (migrasi tidak menebak harga).
3. Buat batch baru → Tujuan **🌱 Bibit jual** → isi pcs → simpan.
4. Di detail batch: `✅ Siap jual` saat bibit layak → `💰 Terjual` tiap ada pembeli → `🕊️ Mati` bila gagal hidup.
5. Cek `/bibit` (stok) dan `/landing.html#bibit` (etalase publik).

Tanpa langkah 1 pun aplikasi tetap jalan (semua query punya fallback skema lama); fitur bibit aktif setelah migrasi dijalankan.

## 5. Batasan / diketahui

- Harga awal `null` — wajib diisi manual per komoditas.
- Angka umur siap jual default dari acuan umum (Cabai 30–45, Tomat 25–35, Daun Bawang 30–40, Seledri 35–50, Bawang Merah 25–35, Terong 30–45, Strawberry 30–45, Mint 20–30 HST) — sesuaikan via Edit komoditas.
- `sisa` di tracker diinisialisasi dari `jumlah` batch (belum ada kolom sisa terpisah — sisa = jumlah − terjual − mati tercatat).
- Uji klik sesungguhnya butuh login + migrasi 0007 dijalankan + browser: logout → landing; buat batch jual; siap→jual→mati; stok `/bibit`; etalase landing (butuh `SUPABASE_SERVICE_ROLE_KEY` di Vercel).
