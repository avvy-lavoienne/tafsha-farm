# Deploy ke Vercel — Panduan Tafsha Farm

**Tanggal:** 26 Okt 2026
**Sumber deploy:** branch `dev` (preview) → `main` (produksi, saat M6)

---

## 1. Yang perlu disiapkan sebelum klik deploy

- [ ] Repo GitHub `avvy-lavoienne/tafsha-farm` bisa dibaca Vercel (akun pribadi cukup).
- [ ] Migrasi `0003_media_botol_tray.sql` sudah dijalankan di Supabase (lihat laporan M2) — supaya Botol 1,5L + Tray Semai ada di data akun.
- [ ] Catat 2 env dari `web/.env.local` (JANGAN commit file-nya):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 2. Import proyek (sekali saja)

1. Buka [vercel.com](https://vercel.com) → Add New → Project → pilih repo `tafsha-farm`.
2. **Wajib atur ini di form Configure Project:**
   - Framework Preset: `Next.js` (otomatis terdeteksi)
   - **Root Directory: `web`** ← penting! (kode Next.js ada di subfolder `web/`, bukan root repo)
   - Build Command: `npm run build` (default, jangan diubah)
   - Output Directory: bawaan Next.js (jangan diubah)
3. Buka Environment Variables, tambahkan 2 env di atas untuk **Production + Preview**.
4. Deploy. URL preview dev jadi `https://<nama>.vercel.app`.

## 3. Deploy preview per branch (otomatis)

- Setiap push ke `dev` → Vercel bikin URL preview otomatis. Cocok untuk uji HP sebelum naik ke `main`.
- Setiap PR `dev` → `main` → Vercel kasih link preview di PR.

## 4. Verifikasi pasca-deploy (di HP, 5 menit)

1. Buka URL preview → halaman masuk tampil dengan tema krem/hijau.
2. Daftar + masuk akun → seed data awal → beranda statistik tampil.
3. `/kebun` → 2 lokasi + sub-blok + daftar batch tampil (bukan dummy).
4. Tambah batch Terong di Halaman Depan → kembali ke `/kebun`, batch muncul di kartu Halaman Depan.
5. Buka `/landing.html` di URL yang sama → landing Canva tampil.
6. DevTools → Application → Manifest + Service Worker terdaftar (PWA).
7. Matikan internet → buka `/tugas` → halaman pengingat tetap terbuka (cache PWA M1).

## 5. Yang diketahui / batasan

- Warning `middleware` deprecated (Next 16) tidak menggagalkan build/deploy.
- File `design.html` di root repo ikut ter-deploy sebagai file repo tapi tidak diserve (hanya isi `web/public` yang jadi aset). Hapus bila tidak perlu.
- PWA install penuh (Add to Home Screen) butuh HTTPS — otomatis tersedia di URL Vercel.
- Notifikasi push ke HP (M4) belum ada — tombol notifikasi hanya minta izin browser.
