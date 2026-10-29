# Laporan M9 — Landing Rombak Total Jadi Marketing Bibit ✅ SELESAI

**Tanggal:** 29 Okt 2026
**Branch:** `dev`
**Build:** `npm run build` sukses (21 route, `ƒ Proxy (Middleware)` tetap ada)
**Lint:** bersih 0/0. **Typecheck:** bersih.
**Dep baru:** tidak ada. **Migrasi SQL:** tidak ada (pakai 0007).

## 1. Yang diubah

### `web/src/app/api/publik/bibit/route.ts` — diperkaya
- Response lama: `{ totalSiap, katalog[] }`.
- Response baru: `{ hariIni, totalSiap, totalBatch, katalog[], siap[], estimasi[] }`.
- `siap[]`: batch `sudahSiap` + `stok_siap > 0`, bawa `nama, jumlah, siap, harga, hst, tgl_tanam, siapMin, siapMaks, sudahSiap, estimasi, sisaHari`, max 12, urut stok terbesar.
- `estimasi[]`: batch belum siap tapi punya `siapMin`, bawa tanggal estimasi `tambahHari(tgl_tanam, siapMin)`, max 6, urut sisa hari terkecil.
- `revalidate` 300 → 120 detik (stok jualan berubah cepat).

### `web/public/landing.html` — tulis ulang total (bukan tempel seksi)
Struktur baru, fokus 100% jualan bibit + misi:
1. **Header ramping:** logo + `🌱 Lihat Stok` + `Masuk pengelola` (tanpa CTA install aplikasi).
2. **Hero marketing:** kicker `KETAHANAN PANGAN MANDIRI • URBAN FARMING`, judul jualan, badge live `🌱 N pcs siap hari ini`, CTA ke `#stok` + `#cara-order`.
3. **Kartu misi** (ganti mockup HP): umur transparan, stok live, siap urban farming, pangan mandiri + link cek umur batch.
4. **Strip 3 statistik live:** pcs siap / jenis tersedia / batch aktif (dari API).
5. **`#stok` etalase live:** kartu per komoditas (nama, badge pcs, harga/pcs, total dirawat + tombol Pesan → `#cara-order`).
6. **`#batch` tabel transparansi:** Bibit | Umur HST | Total | Siap | Harga | Status (Siap / ~N hari + tanggal estimasi). `tgl_tanam` ikut dari API agar estimasi terverifikasi.
7. **`#estimasi`:** kartu batch segera siap (umur HST, target, tanggal ±, jumlah, harga).
8. **`#kenapa`:** 4 kartu misi (per pcs, umur terbuka, urban farming, pangan mandiri).
9. **`#cara-order`:** 3 langkah (pilih stok → cek umur → chat order) + panel CTA ambil di Pakuwon.
10. **`#faq` jualan:** pcs polybag, HST, slot estimasi, pemula/lahan sempit, lokasi ambil.
11. **Footer misi** + FAB 7 tautan jualan (tanpa galeri/kalender/panen/install).
12. Dihapus total: seksi masalah, fitur aplikasi, cara kerja tanam, komoditas-klik, statistik ilustrasi, galeri, kalender komunitas, panen, testimoni, install PWA, modal crop/install.

## 2. Verifikasi
- `tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses.
- Tanpa `SUPABASE_SERVICE_ROLE_KEY` / DB lama: badge + semua seksi tampil pesan rapi (tidak blank).
- Tombol order mengarah ke `#cara-order` (belum ada nomor WA di repo — tinggal ganti `href` bila nomor sudah ada).

## 3. Batasan
- Nomor kontak/WA belum dipasang (tidak ada di repo) — CTA order masih anchor internal.
- Foto per bibit belum ada — kartu etalase teks + ikon dulu.
- Estimasi = `tgl_tanam + umur_siap_min` (hari kalender, bukan kondisi tanaman aktual).
