# Laporan M7 — Kalender Tanam (Dashboard + Landing, Tanpa Muse) ✅ SELESAI

**Tanggal:** 29 Okt 2026
**Branch:** `dev`
**Build:** `npm run build` sukses (Next.js 16.4.3, 18 route: 16 lama + `/kalender` + `/api/publik/ringkasan`, baris `ƒ Proxy (Middleware)` tetap ada)
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `tsc --noEmit` bersih
**Dep baru:** tidak ada. **Migrasi SQL:** tidak ada. **AI/Muse:** tidak dipakai.

---

## 1. Yang dibangun

### A. `web/src/lib/kalender.ts` — baru, fungsi murni hitung tanggal
- Tipe `EventKalender` (`semai|tanam|pindah|estimasi|panen`) + `BatchKalender`.
- `bangunEventKalender()`: semai dari `tgl_semai`, tanam dari `tgl_tanam`, pindah dari `care_tasks(pindah_tanam)`, panen aktual dari `harvests`, estimasi rentang `[tanam+min, tanam+maks]` (maks 62 hari/batch, hari berpanen dilewati estimasinya).
- `kelompokPerTanggal()`, `siapDalamHari()`, `bulanValid()`, `geserBulan()`, `namaBulan()`, `tambahHariISO()`.

### B. Dashboard `/kalender` — baru (login)
- `web/src/app/kalender/page.tsx` (server): `?bulan=&lokasi=&komoditas=`, `Promise.all` 5 query, filter + Map tanggal oper ke client.
- `web/src/components/KalenderManager.tsx` (client): grid bulan Senin-dulu, titik warna per jenis, sel = tombol (`aria-pressed`, hari ini `aria-current`), legenda, navigasi bulan + `input month`, chip filter lokasi/komoditas, badge siap-7-hari + peringatan umur-kosong, panel detail hari dengan link batch.
- Nav: `BottomNav` tambah 📅 Kalender (desktop 9 kolom, sheet mobile otomatis), `MenuGrid` beranda tambah kartu Kalender.

### C. Landing `#kalender` + ringkasan komunitas — publik anonim
- `web/src/app/api/publik/ringkasan/route.ts` (baru): service-role di server saja, hanya angka agregat (tanpa nama/id user/lokasi); `revalidate 600`; tanpa key → `{kosong:true}`.
- `web/public/landing.html`: seksi `#kalender` (7 kolom mini siap-panen + 3 kartu komunitas), FAB sheet tambah `#kalender`, gagal fetch → seksi dibiarkan kosong rapi.

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `web/src/lib/kalender.ts`, `web/src/app/kalender/page.tsx`, `web/src/components/KalenderManager.tsx`, `web/src/app/api/publik/ringkasan/route.ts`, `report/M7-laporan-kalender.md` |
| Ubah | `web/src/components/BottomNav.tsx`, `web/src/app/page.tsx`, `web/public/landing.html` |
| Tidak disentuh | migrasi SQL, `globals.css`, `outbox.ts`, `push.ts`, auth/RLS, foto/galeri |

---

## 3. Kriteria cek

- [x] **Hitung lokal:** estimasi = `tgl_tanam + umur_min/maks`, tanpa AI. (statis: fungsi murni + build)
- [x] **Dashboard:** `/kalender` tampil grid + filter + detail hari + badge. (statis: kode + build; klik butuh login)
- [x] **Landing:** `#kalender` + statistik komunitas anonim, tanpa bocor data user. (statis: endpoint agregat + build)
- [x] **Nav:** kalender ada di bar desktop, sheet mobile, MenuGrid. (statis: kode)
- [x] **Verifikasi:** tsc bersih, lint 0/0, build 18 route + `ƒ Proxy (Middleware)`.

---

## 4. Batasan / diketahui

- Uji klik sesungguhnya butuh login Supabase + browser (buat batch semai/tanam, pindah tanam, panen → cek titik; filter + pindah bulan; HP 360px; landing tamu; offline read-only).
- Produksi butuh `SUPABASE_SERVICE_ROLE_KEY` di Vercel agar ringkasan landing hidup; tanpa itu landing sembunyi rapi.
- Daftar komoditas/lokasi ilustrasi Pexels di landing masih statis (live-kan = M8: kurasi foto + izin tampil publik).
