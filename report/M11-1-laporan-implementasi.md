# Laporan M11.1 — Implementasi Perbaikan Audit

**Tanggal:** 30 Okt 2026
**Branch:** `dev`
**Acuan:** `report/M11-audit-codebase.md`
**Verifikasi:** `npm test` (7/7 lulus) · `npx tsc --noEmit` bersih · `npx eslint .` bersih · `npm run build` sukses (20 rute) · smoke test dev server (`/landing.html` 200, `/api/publik/bibit` 200, `/api/galeri` 200, `/tugas` 307 → `/masuk`)

---

## 1. Ringkasan

Dikerjakan blok prioritas 1–6 dari rekomendasi audit: akar bug tanggal (P0), rekap panen, alur offline, celah data publik, XSS landing, dan konsistensi stok bibit. Semua perubahan lolos typecheck, lint, build, dan unit test baru.

Dua hal **belum** disentuh karena butuh keputusan/izin: remediasi data `care_tasks` lama (hanya disiapkan query audit read-only) dan penerapan migrasi SQL ke database (dijalankan manual oleh pemilik).

---

## 2. Yang Diubah

### 2.1 P0 — Aritmatika tanggal (F-01, F-02, F-03, F-15)

| File | Perubahan |
|---|---|
| `web/src/lib/tanggal.ts` | Ditulis ulang sebagai sumber tunggal tanggal. `hariIniISO()` memakai `Intl.DateTimeFormat` zona **Asia/Jakarta** (bukan getter lokal server UTC). `tambahHariISO()`/`selisihHari()` memakai aritmatika UTC murni. `formatTanggal` memformat dengan `timeZone: "UTC"`. `geserBulan`/`namaBulan`/`bulanValid` dipindah ke sini (dari `lib/kalender.ts`). `hitungHST(tgl, kini?)` kini berbasis selisih hari. |
| `web/src/lib/kalender.ts` | Hapus duplikasi `tambahHariISO`, `selisihHari`, `bulanValid`, `geserBulan`, `namaBulan`; impor dari `lib/tanggal`. |
| `web/src/components/BatchForm.tsx` | `due_date` tugas siram memakai `tambahHariISO(tglTanam, i)` — bukan `d.toISOString().slice(0,10)`. Bug lama: di perangkat WIB seluruh 30/60 tugas mundur 1 hari. |
| `web/src/app/panen/page.tsx` | Batas bawah bulan depan dihitung dari string bulan (`geserBulan(bulan, 1)`), bukan `Date` + `toISOString`. Panen di hari terakhir bulan kini masuk rekap. |
| `web/src/components/PanenManager.tsx` | Navigasi bulan memakai `geserBulan` (bebas zona waktu). |
| `web/src/components/TugasCard.tsx` | Helper `tambahHari` lokal dihapus, pakai `tambahHariISO`. |
| `web/src/app/api/publik/bibit/route.ts` | Helper `hst`/`tambahHari` lokal diganti util bersama (estimasi landing ikut WIB). |
| `web/src/app/api/publik/ringkasan/route.ts` | Idem untuk jendela 7 hari. |
| `web/src/app/api/push/kirim/route.ts` | `wibHariIniISO()` lokal diganti `hariIniISO()` — cron dan UI kini memakai definisi "hari ini" yang sama. |

Konsekuensi: pukul 00:00–06:59 WIB halaman Tugas/Dashboard/Panen menampilkan tanggal yang benar, dan notifikasi 06:00 WIB merujuk tanggal yang sama dengan yang dilihat pengguna.

### 2.2 P1 — Stok & sisa hidup bibit (F-05, F-06)

- `BatchForm`: `stok_siap` batch jual **tidak lagi** diisi otomatis sama dengan jumlah; default 0 kecuali field diisi. Placeholder diubah menjadi "0 bila kosong". Batch baru juga menulis `jumlah_hidup = jumlah`.
- `BibitTracker`: setiap aksi siap/terjual/mati menyimpan `jumlah_hidup` ke `plant_batches` (dengan fallback bila kolom belum ada), sehingga sisa hidup tidak kembali ke jumlah awal setelah reload.
- `app/batch/[id]/page.tsx`: memakai `jumlah_hidup ?? jumlah` sebagai `awalSisa`.

### 2.3 P1 — Alur offline (F-04)

- `lib/outbox.ts`: tipe antrean baru `tugas_selesai` → saat sinkron menjalankan `update care_tasks set status='selesai', selesai_at=...`.
- `TugasCard`: saat centang dilakukan offline (atau gagal jaringan), entri `activity_log` **dan** `tugas_selesai` sama-sama diantrekan. Sebelumnya tugas kembali "belum" setelah sinkron dan dicentang ulang → logbook ganda.

### 2.4 P1 — Keamanan data publik (F-07, F-09, F-10)

- `web/public/landing.html`: ditambah `esc()`; nama komoditas dari API di-escape sebelum masuk `innerHTML` (katalog, tabel batch, kartu estimasi). Menutup stored XSS di halaman publik.
- `supabase/migrations/0008_aman_foto_hidup_bibit.sql` (baru):
  - cabut policy `publik baca galeri` pada `kebun_foto` — role `anon` tidak lagi bisa membaca `user_id`/`subjek_id` semua akun;
  - policy storage `kebun-foto` untuk insert/update/delete dibatasi folder pertama = `auth.uid()`;
  - tambah kolom `jumlah_hidup` + backfill dari `batch_moves.sisa` terakhir;
  - tambah index `care_tasks(user_id,due_date)`, `care_tasks(batch_id,due_date)`, `harvests(user_id,tanggal desc)`, `activity_logs(batch_id,created_at desc)`, `plant_batches(user_id,status)`.
- `app/api/galeri/route.ts`: memakai service-role dengan 4 kolom aman (galeri landing tetap jalan tanpa membuka tabel). Route kini benar-benar statis + revalidate 10 menit.

### 2.5 P1 — Ketahanan skema (F-12)

- `app/batch/[id]/page.tsx`: `select("*,commodities(*),… ")` menggantikan daftar kolom 0007. Detail batch tidak lagi 404 bila migrasi belum jalan; kolom yang belum ada dibaca dengan `?? default`. Kondisi mati `(… || true)` dibersihkan.

### 2.6 Pengujian (F-30)

- `web/src/lib/tanggal.test.mjs` (baru, tanpa dependensi): 7 test — batas hari WIB, regresi pergeseran 1 hari, bulan/tahun/kabisat, `selisihHari`/`hitungHST`, `geserBulan` lintas tahun, `bulanValid`, `formatTanggal`.
- `web/package.json`: skrip `npm test` → `node --test "src/**/*.test.mjs"`.

---

## 3. Langkah Manual yang Masih Diperlukan

1. **Jalankan migrasi** `supabase/migrations/0008_aman_foto_hidup_bibit.sql` di Supabase SQL Editor (setelah 0007). Tanpa ini:
   - `jumlah_hidup` belum ada → tracker tetap memakai `jumlah` (fallback otomatis, tidak error);
   - foto masih bisa dibaca langsung lewat anon key dan ditimpa lintas akun.
2. **Audit data lama** (read-only, tidak mengubah apa pun):
   `supabase/audit/tugas-tanggal.sql` → bagian 1 & 2 menunjukkan batch yang tugas siramnya mulai di H-1.
3. **Jalankan remediasi data** `supabase/migrations/0009_geser_tugas_siram.sql` (setelah 0008).
   Audit data 30 Okt 2026 menemukan **2 batch** terdampak: Timun (tanam 26 Okt, tugas 25 Okt–23 Nov) dan Terong (tanam 24 Okt, tugas 23 Okt–21 Nov) — keduanya 30 tugas siram dan **belum ada yang selesai**, sehingga pergeseran `+1 hari` aman.
   Migrasi hanya menyentuh `jenis = 'siram'`, idempoten (syarat `min(due_date) = tgl_tanam - 1`), dan menyertakan query pratinjau + verifikasi + rollback.

---

## 4. Catatan Perilaku Baru

- "Hari ini" kini **selalu** tanggal Asia/Jakarta, termasuk bila perangkat pengguna berada di zona lain. Ini disengaja agar satu kebun punya satu tanggal operasional.
- Batch bibit jual baru mulai dengan **stok siap 0**. Alur yang benar: buat batch → tunggu bibit cukup umur → tekan "Siap jual" di tracker atau isi stok saat membuat batch.
- Tugas yang dicentang saat offline baru berubah status setelah sinkron (badge "menunggu sinkron" tetap muncul sampai berhasil).

---

## 5. Sisa Temuan Audit (belum dikerjakan)

| ID | Temuan | Alasan belum |
|---|---|---|
| F-11 | Migrasi manual tanpa pelacakan (belum ada Supabase CLI/config) | Butuh keputusan alur deploy & project ref |
| F-08 | Offline-read belum berjalan (`next-pwa` inert di Turbopack) | Perlu keputusan: bikin service worker precache, atau turunkan klaim di PRD |
| F-13 | Dua model penjualan (`harvests.peruntukan` vs `bibit_sales`), belum ada laporan omzet | Fitur baru, di luar scope perbaikan |
| F-14, F-24 | Tipe Supabase belum di-generate; belum ada validasi input (zod) | Peningkatan bertahap |
| F-19 | Constraint skema (status/jenis, unique nama komoditas) | Berisiko gagal bila data lama sudah menyimpang |
| F-21, F-22 | Kolom `media_stocks.terpakai` mati; endpoint ringkasan belum dipakai | Kosmetik/permukaan |
| F-23 | `upsert` push subscription bentrok bila endpoint milik akun lain | Kasus tepi perangkat bergantian |
| F-25, F-26, F-27 | SEO landing, focus trap modal, artefak repo (`design.html`, `pasang-spin.cjs`) | P2, menunggu keputusan produk |
| F-28, F-29 | Fallback `getSession()` di proxy; `seed_tafsha_farm` belum di-`revoke` | Perlu keputusan model multi-tenant |

---

## 6. File Tersentuh

**Diubah (16):** `web/package.json`, `web/public/landing.html`, `web/src/app/api/galeri/route.ts`, `web/src/app/api/publik/bibit/route.ts`, `web/src/app/api/publik/ringkasan/route.ts`, `web/src/app/api/push/kirim/route.ts`, `web/src/app/batch/[id]/page.tsx`, `web/src/app/kalender/page.tsx`, `web/src/app/panen/page.tsx`, `web/src/components/BatchForm.tsx`, `web/src/components/BibitTracker.tsx`, `web/src/components/KalenderManager.tsx`, `web/src/components/PanenManager.tsx`, `web/src/components/TugasCard.tsx`, `web/src/lib/kalender.ts`, `web/src/lib/outbox.ts`, `web/src/lib/tanggal.ts`

**Baru (3):** `web/src/lib/tanggal.test.mjs`, `supabase/migrations/0008_aman_foto_hidup_bibit.sql`, `supabase/audit/tugas-tanggal.sql`

Belum ada commit — perubahan menunggu peninjauan.
