# Laporan M5 P1-2 — 8 Bugfix (satu paket) ✅ SELESAI

**Tanggal:** 28 Okt 2026
**Branch:** `dev` (di atas P1-1 `95404ec`)
**Build:** `npm run build` sukses (Next.js 16.4.3, 16 route, baris `ƒ Proxy (Middleware)` tetap ada)
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `node node_modules/typescript/bin/tsc --noEmit` bersih
**Dep baru:** tidak ada. **Migrasi SQL:** hanya `0006_kunci_media_stocks.sql` (baru).

---

## 1. Yang dibangun (semua 8, satu paket)

### 1. `supabase/migrations/0006_kunci_media_stocks.sql` — baru, tutup lubang RLS
Drop 4 policy terbuka (`baca/tulis/ubah/hapus semua`) → satu policy `milik sendiri` untuk semua operasi: `auth.uid() = (select user_id from media_types where id=media_type_id)`. Aman diulang (`DROP POLICY IF EXISTS`). **Wajib dijalankan sekali di Supabase SQL Editor** (Dashboard > SQL) agar berlaku di produksi. Uji manual (butuh 2 akun): user B tidak bisa select/insert milik A; sebagai A baca/tulis sendiri tetap jalan (dipakai halaman `/sarana`).

### 2. `web/src/app/page.tsx` — panen bulan ini tidak campur satuan
Query panen tambah kolom `satuan`; jumlah dikelompokkan per satuan (`Map<satuan, jumlah>`). Satu satuan → angka `"<jumlah> <satuan>"` (mis. `3 kg`); beda satuan → angka `"N entri"` + label berisi rincian (`"Panen bulan ini (3 kg • 5 ikat)"`); kosong → `0`. JANGAN jumlahkan kg+ikat. Bonus kecil: teks seed "4 media" → "6 tipe media" (di file ini) agar konsisten dengan seed 0003.

### 3. `web/src/components/BatchForm.tsx` — status `semai` diaktifkan
Insert mode create: `status: tglTanam > hariIni ? "semai" : "tumbuh"` (perbandingan string ISO `YYYY-MM-DD` valid). Mode edit tidak menyentuh status (aturan P1-1/P0-2: edit tidak mengubah tugas/status). LABEL_STATUS `semai` sudah ada di `lib/tanggal.ts`, jadi chip tampil otomatis.

### 4. `batch/[id]/page.tsx` + `batch/baru/page.tsx` + `BatchForm` — tombol Duplikat batch
- Detail: tombol `Duplikat batch` → `/batch/baru?dari=<id>` (di samping `Edit batch`, dalam `flex gap-2`).
- `baru/page.tsx`: baca `searchParams.dari`, ambil batch asal (komoditas, lokasi, sub-blok, media, jumlah, tgl_semai, catatan + nama/tgl tanam asal untuk catatan). Bila id tidak ada/tidak milik user → form kosong biasa (mode create). Catatan halaman: `"Duplikat dari <nama> — cek lalu simpan."`
- `BatchForm`: prop baru `duplikat` (opsional) → prefill semua field kecuali tgl tanam (selalu hari ini agar tugas 30 hari ke depan benar), catatan terisi `"Duplikat dari <nama> (tanam <tgl>) — <catatan asal>"`. Tugas siram tetap dibuat normal (aturan 2x P0-2 tidak diubah).

### 5. `web/src/app/batch/page.tsx` — filter `?komoditas=<id>` + chip Siap panen
Query tambah `commodity_id`; daftar komoditas untuk deretan chip (dengan ikon). `qs()` membangun ulang query string sambil mempertahankan filter lain. Chip `🌱 Siap panen` (`siap=1`) filter di server-component: HST ≥ umur_min (reuse `hitungHST` dari `@/lib/tanggal`). Pesan kosong menyesuaikan filter siap-panen. Link dari beranda (`/batch?lokasi=...`) tetap jalan karena `qs()` mempertahankan param tak dikenal? — tidak: param `lokasi` tetap diteruskan via `qs()` (status/lokasi/komoditas/siap dipertahankan), hanya param asing yang hilang (tidak ada yang dipakai saat ini).

### 6. `web/src/components/SaranaManager.tsx` — edit total/rusak media
State `daftarMedia` (agar UI update tanpa refresh) + `mediaEditId/mediaEdit`. Kartu media: tombol `Edit total/rusak` → 2 input angka + tombol Simpan/Batal + `MiniSpin`. Validasi: bilangan bulat ≥ 0; **total ≥ terpakaiHitung + rusak** (pesan ramah bila kurang). Simpan via `upsert media_stocks { media_type_id, total, rusak }` (RLS 0006 mengizinkan karena milik sendiri). Judul seksi `(read-only)` dihapus. Pesan error umum tetap di blok `pesan` yang sama.

### 7. `web/src/components/LogForm.tsx` (+ `outbox.ts`, `batch/[id]/page.tsx`) — oleh + lampiran foto
- `oleh`: diisi nama pendek dari email login (`email.split("@")[0]`, maks 24 char); offline/tamu → `null`.
- Checkbox `Lampirkan foto progres terakhir ke catatan ini` → query `kebun_foto` terbaru batch ini (`maybeSingle`) → `foto_urls: [url]` (tanpa ubah skema). Offline: foto TIDAK diambil (butuh jaringan) → `foto_urls: []`, dicatat offline biasa.
- Titik integrasi `outbox.ts` (`kirimSatu activity_log`): teruskan `oleh` + `foto_urls` saat sinkron (sebelumnya hilang). Detail batch: query log tambah `foto_urls`, tampilkan thumbnail 160px yang link ke full (target `_blank`).
- Riwayat lama tanpa `oleh` tetap tampil seperti dulu (`{l.oleh ? ... : ""}` tidak diubah).

### 8. `web/src/components/SeedButton.tsx` — teks 6 media
`"Mengisi 2 lokasi, 6 tipe media, 9 komoditas..."` (seed 0003 sudah 6: Galon 15L, Botol 1,5L, Tray Semai, 3 Polybag). Teks yang sama di `page.tsx` ikut diperbaiki.

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `supabase/migrations/0006_kunci_media_stocks.sql`, `report/M5-P1-2-laporan-bugfix.md` |
| Ubah | `web/src/app/page.tsx`, `web/src/components/BatchForm.tsx`, `web/src/app/batch/baru/page.tsx`, `web/src/app/batch/[id]/page.tsx`, `web/src/app/batch/page.tsx`, `web/src/components/SaranaManager.tsx`, `web/src/components/LogForm.tsx`, `web/src/lib/outbox.ts` (titik integrasi sinkron), `web/src/components/SeedButton.tsx` |
| Tidak disentuh | Logika M4-1/M4-2/P0-1/P0-2/P1-1 lain, `globals.css`, `package.json`, `.env*`, migrasi 0001–0005 |

---

## 3. Kriteria cek 8 item

- [x] **1. RLS media_stocks:** migrasi 0006 drop 4 policy terbuka → policy milik-sendiri via join `media_types`. (statis: SQL benar; uji select/insert user B butuh 2 akun + jalankan migrasi di dashboard, lihat Batasan)
- [x] **2. Panen bulan ini:** 1 satuan → `"3 kg"`; campur → `"N entri"` + rincian per-satuan di label; kosong → `0`. (statis: logika Map + build; uji visual butuh data 2 satuan, lihat Batasan)
- [x] **3. Status semai:** tgl tanam > hari ini → `"semai"`, selain itu `"tumbuh"`; edit tidak menyentuh status. (statis: kode + tsc; uji butuh buat batch masa depan, lihat Batasan)
- [x] **4. Duplikat:** tombol di detail → `/batch/baru?dari=<id>` prefill semua kecuali tgl tanam + catatan `"Duplikat dari ..."`; id asing → form kosong. (statis: kode + build; uji klik butuh login, lihat Batasan)
- [x] **5. Filter batch:** `?komoditas=<id>` + chip `🌱 Siap panen` (HST ≥ umur_min, reuse `hitungHST`); `qs()` pertahankan filter lain. (statis: kode + build; uji klik butuh login, lihat Batasan)
- [x] **6. Edit media:** tombol → form total/rusak + validasi total ≥ terpakai+rusak + upsert RLS-milik-sendiri + `MiniSpin`. (statis: kode + tsc; uji simpan butuh login, lihat Batasan)
- [x] **7. LogForm:** `oleh` = user pendek (bukan null saat login) + opsi lampirkan 1 foto terakhir ke `foto_urls[]` (reuse URL `kebun_foto`, tanpa ubah skema) + sinkron offline teruskan keduanya + thumbnail di riwayat. (statis: kode + tsc; uji butuh login + foto, lihat Batasan)
- [x] **8. SeedButton:** teks `"6 tipe media"` (2 tempat: tombol + beranda). (statis: grep + build)
- [x] **Verifikasi:** tsc bersih, `npm run lint` 0/0, `npm run build` 16 route + `ƒ Proxy (Middleware)`.

---

## 4. Batasan / diketahui

- Verifikasi kriteria di atas dilakukan statis (kode + tsc + lint + build). **Uji klik sesungguhnya butuh login Supabase + browser dan TIDAK bisa dari sesi ini:** (a) jalankan 0006 di dashboard → 2 akun uji RLS; (b) buat panen 2 satuan → cek kartu beranda; (c) buat batch tgl besok → chip `Semai`; (d) duplikat → cek prefill; (e) klik chip komoditas/siap-panen; (f) edit total/rusak → cek validasi; (g) catat log + centang lampirkan foto → cek `oleh` + thumbnail; (h) teks seed.
- **Migrasi 0006 belum dijalankan di cloud** — dijalankan manual sekali via Supabase Dashboard > SQL Editor (file aman diulang). Sampai dijalankan, policy lama masih berlaku; kode aplikasi tidak bergantung pada hasil migrasi (upsert/select sama).
- `qs()` di `batch/page.tsx` hanya mempertahankan `status/lokasi/komoditas/siap`. Link masuk yang dipakai repo (`/batch` polos dari nav/beranda, `/batch?lokasi=` dari beranda, `/batch?status=` antar-chip) semuanya tercakup. Tidak ada param lain yang dipakai saat ini.
- Insiden lingkungan: tidak ada. Tanpa install dep; tsc langsung via `node node_modules/typescript/bin/tsc --noEmit`, build/lint dengan env standar. Skrip bantu `fix_*.py` sudah dihapus (tidak masuk diff).
