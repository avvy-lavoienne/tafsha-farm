# Laporan M11 — Audit Codebase Tafsha Farm

**Tanggal:** 30 Okt 2026
**Branch:** `dev`
**Mode:** READ-ONLY (tidak ada kode yang diubah, tidak ada migrasi dijalankan)
**Verifikasi yang dijalankan:** `npx tsc --noEmit` (bersih), `npx eslint .` (bersih), `npm run build` (sukses, 20 rute)
**Cakupan:** `web/` (60 file TS/TSX), `supabase/migrations/` (7 file SQL), `web/public/` (landing + PWA), konfigurasi deploy

---

## A. Ringkasan Eksekutif

Aplikasi sudah jauh melewati MVP PRD: 10 halaman fungsional, batch tanam, tugas harian, logbook+foto, panen, sarana, kalender, etalase bibit, PWA, push notification, dan outbox offline semuanya ada dan build bersih. Arsitekturnya rapi untuk skala satu keluarga: semua tulis-lewat-klien dengan RLS milik-sendiri, pembacaan server component, dan API publik anonim memakai service-role untuk landing.

Masalah terbesar bukan pada kelengkapan fitur, melainkan pada **aritmatika tanggal**: tugas siram otomatis yang dibuat `BatchForm` bergeser **satu hari lebih awal** untuk semua pengguna WIB (`toISOString()` setelah parse tanggal lokal), dan halaman "hari ini" memakai tanggal server UTC sehingga salah hari setiap pukul 00:00–06:59 WIB — persis jam pemakaian utama aplikasi. Selain itu `stok siap jual` diisi otomatis sama dengan jumlah bibit saat batch dibuat, sehingga landing bisa mengiklankan bibit yang baru disemai sebagai "siap".

Dari sisi keamanan, RLS tabel inti benar (kecuali `media_stocks` yang bergantung pada migrasi 0006 yang dijalankan manual), tetapi bucket foto `kebun-foto` publik + policy storage yang hanya mengecek `bucket_id` membuat setiap pengguna login bisa menimpa/menghapus foto pengguna lain, dan landing menyusun HTML lewat `innerHTML` dari nama komoditas (stored XSS pada halaman publik). Migrasi 0005–0007 hanya bisa dijalankan manual di SQL Editor tanpa pelacakan, sementara aplikasi punya banyak fallback skema yang menyamarkan drift.

Utang teknis paling terasa: tidak ada tipe hasil generate Supabase (banyak `as never`), helper tanggal/`satu()` diduplikasi 4–6 kali, dua model penjualan paralel (`harvests.peruntukan='jual'` vs `bibit_sales`), dan klaim offline-read tidak berjalan karena `next-pwa` tidak aktif di Turbopack. Efek sampingnya kecil untuk satu pengguna, tetapi akan menggigit saat fitur laporan/penjualan ditambah.

Kesimpulan: fondasi layak dilanjutkan, tetapi **P0 tanggal wajib diperbaiki sebelum menambah fitur apa pun**, karena setiap batch baru menulis 30–60 baris data yang salah tanggal ke database.

---

## B. Arsitektur & Stack

### B.1 Stack terpasang

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | Next.js 16.4.3 (App Router, Turbopack) | `src/proxy.ts` = konvensi baru pengganti `middleware.ts` (terverifikasi di `node_modules/next/dist/docs/.../proxy.md`) |
| UI | React 19.3.0, Tailwind 4 (`@tailwindcss/turbopack`) | Token visual di `src/app/globals.css` (`tf-card`, `tf-btn`, `tf-chip`) |
| Backend | Supabase (`@supabase/ssr` 0.12.7, `supabase-js` 2.118) | Auth + Postgres + RLS + Storage |
| Push | `web-push` 3.6.7 + VAPID | Cron Vercel `0 23 * * *` (06:00 WIB) |
| PWA | `@ducanh2912/next-pwa` 10.2.9 | **Inert**: build memakai Turbopack, plugin hanya jalan di webpack (diakui di komentar `public/sw.js`) |
| Cuaca | Open-Meteo (tanpa key) | `src/lib/cuaca.ts`, revalidate 1800s |
| Deploy | Vercel (`web/vercel.json`) | Cron push harian |

### B.2 Struktur direktori

```
tafsha-farm/
├─ PRD.md                     # spesifikasi produk (F-01..F-09, NFR)
├─ design.html                # 59 KB, UNTRACKED — belum jelas statusnya
├─ pasang-spin.cjs            # UNTRACKED — skrip codemod sekali pakai (sudah diterapkan)
├─ report/                    # M1..M10 + laporan ini
├─ supabase/migrations/       # 0001..0007 (dijalankan manual di SQL Editor)
└─ web/
   ├─ src/app/                # 10 rute halaman + 4 API route + 4 loading.tsx
   ├─ src/components/         # 20 komponen (mayoritas client component)
   ├─ src/lib/                # supabase/{client,server,middleware}, outbox, push, tanggal, kalender, media, cuaca
   ├─ src/proxy.ts            # auth gate + redirect
   └─ public/                 # landing.html, manifest.json, sw.js, brand/, icons/
```

### B.3 Peta rute

| Rute | Tipe | Auth | Render | Keterangan |
|---|---|---|---|---|
| `/` | page | wajib | ƒ dynamic | Dashboard; tamu → redirect `/landing.html` |
| `/masuk` | page | publik | ○ static | Client-side login/daftar |
| `/batch` | page | wajib | ƒ | Daftar + filter status/tujuan/lokasi/komoditas/siap |
| `/batch/baru` | page | wajib | ƒ | Form + duplikat via `?dari=` |
| `/batch/[id]` | page | wajib | ƒ | Detail + tracker + logbook + panen |
| `/batch/[id]/edit` | page | wajib | ƒ | Form edit |
| `/kebun` `/tugas` `/panen` `/sarana` `/komoditas` `/kalender` `/bibit` `/pengaturan` | page | wajib | ƒ | Masing-masing punya `loading.tsx` (kecuali beberapa) |
| `/landing.html` | static file | publik | static | Landing marketing (bukan Next page) |
| `/api/publik/bibit` | route | publik | **○ static, revalidate 120s** | Service-role, etalase bibit |
| `/api/publik/ringkasan` | route | publik | **○ static, revalidate 600s** | Service-role, agregat komunitas |
| `/api/galeri` | route | publik | ƒ | Anon client, 12 foto terbaru |
| `/api/push/subscribe` | route | wajib (cek user) | ƒ | POST/DELETE langganan |
| `/api/push/kirim` | route | `CRON_SECRET` / `x-vercel-cron` | ƒ | Pengirim harian |

Catatan hasil build: dua endpoint publik berstatus **○ (static)** dengan ISR — bukan "cache CDN 2 menit per request" seperti komentar di kode, melainkan halaman statis yang diregenerasi tiap 2/10 menit. Konsekuensinya stok di landing bisa tertinggal hingga 2 menit (dapat diterima), tetapi juga berarti respons dibekukan saat build bila env service-role tidak ada.

### B.4 Status Git

- `git log` terakhir: `1e89cdc UX: perjelas tanggal semai aktual vs perkiraan` (setelah rentetan M5→M10).
- `git status`: bersih untuk file terlacak; ada 3 entri **untracked**: `.commandcode/`, `design.html`, `pasang-spin.cjs`.
- `pasang-spin.cjs` adalah skrip Node sekali pakai untuk menyisipkan `MiniSpin` ke 5 form — pekerjaannya sudah selesai di kode, jadi artefak ini sebaiknya dihapus (bukan di-commit).
- `design.html` (59 KB) tidak direferensikan dari mana pun; perlu keputusan: arsipkan ke `report/`, hapus, atau jadikan acuan desain.
- Setelah build dijalankan untuk audit, tidak ada file terlacak yang berubah.

---

## C. Inventaris Fitur

Status: **Selesai** = ada, terhubung, dan sesuai PRD · **Sebagian** = ada tetapi ada bagian yang tidak berfungsi/berbeda dari klaim · **Belum** = tidak ditemukan di kode.

| Area | Fitur | Status | File utama | Catatan |
|---|---|---|---|---|
| Auth | Login + daftar email/password | Selesai | `app/masuk/page.tsx`, `lib/supabase/client.ts` | Pesan khusus bila konfirmasi email aktif; navigasi keras `window.location.assign("/")` |
| Auth | Proteksi rute + redirect tamu | Selesai | `src/proxy.ts`, `lib/supabase/middleware.ts` | `/api/*` sengaja tidak di-redirect; fallback `getSession()` saat `getUser()` gagal |
| Auth | Logout | Selesai | `components/LogoutButton.tsx` | Hard nav ke `/landing.html` untuk hindari cache |
| Auth | Hapus akun (cascade) | Sebagian | `app/pengaturan/page.tsx` (server action) | Butuh `SUPABASE_SERVICE_ROLE_KEY`; tanpa key hanya pesan ramah |
| Dashboard | Statistik + cuaca + menu + rangkuman per lokasi | Selesai | `app/page.tsx` | 5 stat card, CuacaCard mode beranda, MenuGrid 9 kartu |
| Dashboard | Empty state "belum seed" | Selesai | `app/page.tsx` + `SeedButton` | Memanggil `rpc("seed_tafsha_farm")` |
| Kebun | CRUD lokasi | Selesai | `app/kebun/page.tsx`, `KebunManager.tsx` | Nonaktifkan tanpa hapus riwayat |
| Kebun | CRUD sub-blok + guard hapus | Selesai | `KebunManager.tsx` | Diblokir bila sudah dipakai batch |
| Kebun | Foto lokasi/sub-blok + riwayat | Selesai | `UnggahFoto.tsx`, `RiwayatFoto.tsx` | Kompres adaptif ≤500 KB, EXIF-aware |
| Komoditas | CRUD 13 komoditas + field bibit | Selesai | `app/komoditas/page.tsx`, `KomoditasManager.tsx` | Harga/pcs, umur siap min/maks, toggle jual bibit |
| Komoditas | Guard hapus bila dipakai batch | Selesai | `KomoditasManager.tsx` | Hitung `plant_batches` dulu |
| Sarana | Media tanam + stok total/rusak | Selesai | `app/sarana/page.tsx`, `SaranaManager.tsx` | "Terpakai" dihitung dari batch aktif, bukan kolom `media_stocks.terpakai` |
| Sarana | Supplies + transaksi beli/pakai | Selesai | `SaranaManager.tsx` | Validasi stok negatif; riwayat 20 terakhir |
| Sarana | Peringatan stok menipis | Selesai | `app/page.tsx`, `SaranaManager.tsx` | `stok <= min_stok` |
| Batch | Buat/edit/duplikat batch | Selesai | `app/batch/**`, `BatchForm.tsx` | Lihat F-01: tanggal tugas bergeser |
| Batch | Lifecycle status + gagal + buka lagi | Selesai | `BatchStatusButtons.tsx` | Penyebab gagal 6 pilihan |
| Batch | Filter status/tujuan/lokasi/komoditas/siap | Selesai | `app/batch/page.tsx` | "Siap panen" untuk batch jual ikut umur panen (lihat F-16) |
| Batch | HST otomatis | Selesai | `lib/tanggal.ts` | `hitungHST` juga dipakai untuk umur semai (nama menyesatkan) |
| Tugas | Daftar tugas hari ini per lokasi | Selesai | `app/tugas/page.tsx`, `DaftarTugas`, `TugasCard` | Lihat F-02 (zona waktu) |
| Tugas | Centang → logbook otomatis | Selesai | `TugasCard.tsx` | Offline: hanya logbook yang masuk antrean (F-04) |
| Tugas | Lewati / tunda besok | Selesai | `TugasCard.tsx` | Status `lewat` tidak ada di skema/constraint |
| Tugas | Tambah pengingat manual | Selesai | `TambahTugasForm.tsx` | Jenis selain siram |
| Tugas | Tugas siram otomatis 30 hari | Sebagian | `BatchForm.tsx` | Off-by-one hari (F-01); `2x` dijadikan 2 baris tanpa penanda waktu |
| Logbook | Catat aktivitas + dosis + lampiran foto | Selesai | `LogForm.tsx` | Lampiran = reuse URL `kebun_foto` terakhir (bukan foto baru) |
| Logbook | Timeline per batch | Sebelum | `app/batch/[id]/page.tsx` | 20 entri terakhir |
| Foto | Unggah kamera/galeri + kompres | Selesai | `UnggahFoto.tsx` | Fallback offline ke IndexedDB |
| Foto | Galeri riwayat per subjek | Selesai | `RiwayatFoto.tsx` | 6 terakhir; sampul = foto terbaru |
| Panen | Catat panen per batch | Selesai | `HarvestForm.tsx` | Satuan/kualitas/peruntukan |
| Panen | Rekap bulanan per komoditas+satuan | Sebagian | `app/panen/page.tsx`, `PanenManager.tsx` | F-03: tanggal terakhir bulan tidak ikut terhitung |
| Kalender | Grid bulanan + legenda + filter | Selesai | `app/kalender/page.tsx`, `lib/kalender.ts`, `KalenderManager.tsx` | Event semai/tanam/pindah/estimasi/panen; batas rentang 62 hari |
| Kalender | Badge "siap 7 hari" + peringatan umur kosong | Selesai | `lib/kalender.ts` (`siapDalamHari`) | — |
| Bibit | Stok siap jual per komoditas + nilai | Sebagian | `app/bibit/page.tsx` | Angka berasal dari `stok_siap` yang tidak pernah "belum siap" (F-05) |
| Bibit | Tracker siap/terjual/mati | Sebagian | `BibitTracker.tsx`, migrasi 0007 | `sisa` hidup tidak tersimpan (F-06) |
| Bibit | Catat penjualan (`bibit_sales`) | Sebagian | `BibitTracker.tsx` | Tidak ada halaman/laporan penjualan; omzet tidak pernah ditampilkan |
| Landing | Halaman marketing statis | Selesai | `public/landing.html` | Tailwind + Lucide CDN, data live via API |
| Landing | Etalase + tabel batch + estimasi | Selesai | `landing.html` + `/api/publik/bibit` | Lihat F-07 (XSS) |
| Landing | Ringkasan komunitas (agregat) | Belum terpakai | `/api/publik/ringkasan` | Tidak dipanggil landing maupun aplikasi |
| Landing | Galeri foto landing | Belum terpakai | `/api/galeri` | Tidak dipanggil landing |
| Notifikasi | Push VAPID + cron harian | Sebagian | `api/push/*`, `lib/push.ts`, `public/sw.js`, `vercel.json` | SW didaftarkan hanya saat push diaktifkan; lihat F-08 |
| Notifikasi | Pengingat lokal saat tab dibuka | Selesai | `NotifButton.tsx` | 1×/hari via `localStorage`, hanya sebelum jam 12 |
| Offline | Antrean tulis (4 jenis data) | Selesai | `lib/outbox.ts`, `SinkronButton`, `BadgeAntrean` | IndexedDB, lock anti-paralel, batas 20 foto/50 MB |
| Offline | Baca halaman offline | **Belum ada** | `next.config.ts`, `public/sw.js` | `next-pwa` inert; `sw.js` tanpa `fetch` handler (F-08) |
| Data | Ekspor CSV panen + logbook | Selesai | `PengaturanClient.tsx` | 1000 baris, separator `;`, BOM UTF-8 |
| Data | Hapus antrean offline | Selesai | `PengaturanClient.tsx` | Dengan konfirmasi |
| PWA | Manifest + ikon + install | Selesai | `public/manifest.json`, `src/app/favicon.ico` | `display: standalone`, maskable 512 |
| Cuaca | Realtime + saran siram | Selesai | `lib/cuaca.ts`, `CuacaCard.tsx` | Graceful fallback saat offline |
| Multi-user | Anggota keluarga berbagi data | **Belum ada** | — | PRD 4.2 no.6; saat ini 1 data set = 1 akun |
| Lainnya | QR label batch | **Belum ada** | — | PRD 4.2 no.1 |
| Lainnya | Analisis biaya vs hasil | **Belum ada** | — | PRD 4.2 no.4 |
| Lainnya | SOP per komoditas | **Belum ada** | — | Hanya kolom `catatan` bebas |

---

## D. Alur Data & Integrasi

### D.1 Autentikasi & sesi

1. `/masuk` (client) → `supabase.auth.signInWithPassword` → cookie `sb-*` ditulis `@supabase/ssr` → **hard navigation** `window.location.assign("/")` (sengaja, untuk menghindari cache prefetch bottom nav).
2. Setiap request (kecuali aset statis) masuk `src/proxy.ts` → `updateSession()`:
   - `getUser()` (verifikasi ke server Supabase). Jika throws → `getSession()` (baca JWT dari cookie dengan verifikasi lokal).
   - Tamu + path non-publik → redirect `/masuk`. Login + `/masuk` → redirect `/`.
   - `/api/*` selalu diloloskan; route yang bersangkutan yang memutuskan (JSON, bukan redirect HTML).
3. Server component memakai `createClient()` dari `lib/supabase/server.ts` (cookie read-only di RSC, `setAll` di-`try/catch`).

**Implikasi:** otorisasi data bergantung 100% pada RLS, bukan pada gate proxy. Gate proxy bisa dilonggarkan oleh fallback `getSession()` (JWT tidak diverifikasi ke server), tetapi PostgREST tetap memverifikasi tanda tangan token, sehingga kebocoran data tidak terjadi — selama tidak ada route yang memakai service-role berdasarkan identitas pengguna.

### D.2 RLS per tabel

| Tabel | Policy | Penilaian |
|---|---|---|
| `locations`, `sub_blocks`, `media_types`, `commodities`, `plant_batches`, `care_tasks`, `activity_logs`, `harvests`, `supplies`, `supply_moves`, `kebun_foto`, `batch_moves`, `bibit_sales`, `push_subscriptions` | `for all using (auth.uid() = user_id) with check (...)` | Benar (pola konsisten) |
| `media_stocks` | 0001: 4 policy terbuka `using(true)` → **ditutup** 0006 dengan subquery `media_types.user_id` | Benar **hanya jika 0006 dijalankan**; tanpa itu siapa pun bisa baca/tulis/hapus stok media semua akun |
| `kebun_foto` | tambahan `for select using (true)` | Mengizinkan `anon` membaca **semua kolom** semua user (termasuk `user_id`, `subjek_id`, `keterangan`) — lihat F-09 |
| `storage.objects` (`kebun-foto`) | select publik; insert/update/delete hanya `bucket_id` + `auth.role() = 'authenticated'` | Tidak memeriksa kepemilikan folder `user_id/` — lihat F-10 |
| `seed_tafsha_farm()` | `security definer`, `set search_path = public`, guard `auth.uid()` | Cukup aman; belum `revoke execute from anon` |

### D.3 Query Supabase

- Pola dominan: server component `Promise.all([...])` lalu agregasi di JS (bukan view/RPC).
- Banyak query memakai kolom hasil migrasi 0007 (`tujuan`, `stok_siap`, `harga_pcs`, `umur_siap_*`, `jual_bibit`) dengan **fallback berbasis regex pesan error** (`/tujuan|stok_siap|harga_pcs|column|schema cache/i`). Ini menutupi drift skema, tetapi juga menutupi bug nyata dan membuat perilaku berbeda antar halaman:
  - `/batch` → fallback aman.
  - `/komoditas` → fallback aman.
  - `/batch/[id]` → **tanpa fallback**, sehingga `.select("tujuan,stok_siap,harga_pcs,...")` gagal → `notFound()` → **detail batch 404**.
  - `/` (dashboard) → query bibit di dalam `Promise.all` gagal → `stok_siap` dianggap 0 (tidak error, tetapi senyap).
- Tidak ada tipe hasil generate (`database.types.ts`). Klien Supabase untyped → `as never`, `as never[]`, `as {tujuan?: string}` tersebar di 12+ file.

### D.4 API publik & service-role

| Endpoint | Kredensial | Data yang keluar | Cache | Pemakai |
|---|---|---|---|---|
| `/api/publik/bibit` | **service_role** | per batch: `nama` komoditas, `jumlah`, `stok_siap`, `harga`, `hst`, `tgl_tanam`, `estimasi`, `sisaHari`; katalog agregat | static + `revalidate=120` | `landing.html` |
| `/api/publik/ringkasan` | **service_role** | `totalFoto` (hitung semua user), `siapMingguIni`, `panenBulanIni` (total semua user), `komoditasTop` | static + `revalidate=600` | **tidak dipakai** |
| `/api/galeri` | anon + RLS publik | 12 foto terbaru semua user + `keterangan` + `subjek_tipe` | `revalidate=600` (tidak efektif: route dynamic) | **tidak dipakai** |
| `/api/push/subscribe` | sesi user | — | — | `lib/push.ts` |
| `/api/push/kirim` | `CRON_SECRET` / header Vercel | — | — | Vercel Cron 06:00 WIB |

Kunci service-role hanya dibaca di server (`process.env.SUPABASE_SERVICE_ROLE_KEY`, tanpa prefix `NEXT_PUBLIC_`) — benar. Tidak ada secret yang tercetak di laporan ini.

### D.5 Cache & revalidate

- Halaman aplikasi: semuanya `ƒ dynamic` (memakai `cookies()`), invalidasi lewat `router.refresh()` setelah mutasi. Tidak ada `revalidatePath`/`revalidateTag`.
- Landing: menarik data dari endpoint statis ber-ISR; tidak ada invalidasi manual saat penjualan dicatat → staleness maksimum 2 menit.
- Cuaca: `fetch(..., { next: { revalidate: 1800 } })` — 30 menit, wajar.
- Service worker: tidak ada precache halaman; hanya `install/activate/push/notificationclick`.

### D.6 Offline / outbox

1. 4 form (`HarvestForm`, `LogForm`, `TambahTugasForm`, `TugasCard`) + `UnggahFoto` memanggil `tambahAntrean()` bila `navigator.onLine === false` **atau** error jaringan terdeteksi (`apakahJaringanGagal`).
2. Entri disimpan di IndexedDB `tafsha-farm/outbox` (`id`, `tipe`, `payload`, `blob`, `created_at`, `percobaan`).
3. `SinkronButton` menjalankan `sinkronkanAntrean()` saat mount (bila online), saat event `online`, dan manual. Ada lock `janjiBerjalan` untuk mencegah sinkron paralel.
4. `kirimSatu()` mengganti `user_id` dengan uid sesi saat ini (mendukung entri yang dibuat tanpa sesi).
5. Foto: path `{uid}/{subjek}/{id}/{outboxId}.jpg` + `upsert:true` → retry aman.

**Celah:** menyelesaikan tugas saat offline hanya mengantrekan `activity_log`; baris `care_tasks` tidak pernah di-`update` menjadi `selesai`. Setelah sinkron, tugas tetap berstatus `belum` (F-04).

### D.7 Push notification

- Klien: `daftarPush()` → minta izin → `pushManager.subscribe(VAPID)` → POST `/api/push/subscribe` (upsert `endpoint`).
- Server: cron harian menghitung `care_tasks` per `user_id` untuk tanggal **WIB** (`wibHariIniISO()`), lalu kirim satu notifikasi per langganan; endpoint 404/410 dihapus otomatis.
- SW: `public/sw.js` (statis) menangani `push` + `notificationclick`.
- Ketidakcocokan: tanggal push memakai WIB eksplisit, sedangkan UI memakai jam server (UTC) → lihat F-02.

---

## E. Temuan

Severity: **P0** = merusak data/alur inti atau celah keamanan terbuka · **P1** = salah perilaku/data yang terlihat pengguna, atau risiko keamanan bersyarat · **P2** = utang teknis, konsistensi, performa, aksesibilitas.

| ID | Severity | Temuan | Dampak | File |
|---|---|---|---|---|
| F-01 | **P0** | Tugas siram otomatis dibuat dengan `new Date(tglTanam + "T00:00:00")` lalu `d.toISOString().slice(0,10)`. Di perangkat WIB (UTC+7) hasilnya **mundur satu hari** untuk seluruh 30/60 baris. | Setiap batch baru menulis 30–60 `care_tasks` bertanggal salah. Pengingat muncul sehari lebih awal, "hari ini" kosong di hari H, dan logbook/panen jadi tidak sinkron dengan jadwal. Kerusakan permanen di DB, bukan sekadar tampilan. | `web/src/components/BatchForm.tsx` |
| F-02 | P1 | Tanggal "hari ini" dihitung dari zona waktu server (`hariIniISO()` memakai getter lokal). Di Vercel (UTC), pukul 00:00–06:59 WIB tanggalnya masih kemarin. Push memakai `wibHariIniISO()` (benar) sehingga tidak sinkron dengan UI. | Selama ±7 jam setiap hari, halaman Tugas/Dashboard/Panen menampilkan tanggal & daftar yang salah, sementara notifikasi 06:00 menyebut jumlah tugas untuk tanggal yang berbeda. Bertabrakan dengan ritual pagi (US-02). | `web/src/lib/tanggal.ts`, `app/tugas/page.tsx`, `app/page.tsx`, `components/NotifButton.tsx`, `app/api/push/kirim/route.ts` |
| F-03 | P1 | Batas akhir bulan panen: `new Date(awalBulan+"T00:00:00")` → `setMonth(+1)` → `toISOString().slice(0,10)`. Di WIB hasilnya tanggal **30/31 bulan berjalan**, bukan tanggal 1 bulan depan. | Filter `.lt("tanggal", awalDepan)` mengecualikan panen di hari terakhir setiap bulan; rekap & riwayat bulanan selalu kurang sehari. | `web/src/app/panen/page.tsx` |
| F-04 | P1 | Centang "Selesai" saat offline hanya mengantrekan `activity_log`; `care_tasks.status` tidak pernah diubah saat sinkron. | Setelah online, tugas yang sudah dikerjakan muncul lagi sebagai "belum", dan pengguna mencentang ulang → duplikasi logbook. | `components/TugasCard.tsx`, `lib/outbox.ts` |
| F-05 | P1 | Saat membuat batch `tujuan='jual'`, `stok_siap` diisi otomatis `= jumlah` (bila field kosong). | Landing & halaman Bibit langsung mengiklankan "X polybag siap" untuk bibit yang baru disemai (0 hari), dan `nilai stok` menggelembung. Ini klaim komersial yang salah. | `components/BatchForm.tsx`, `api/publik/bibit/route.ts`, `app/bibit/page.tsx` |
| F-06 | P1 | Sisa hidup bibit tidak pernah dipersistensikan. `BibitTracker` memakai `awalSisa = plant_batches.jumlah`; aksi "mati"/"terjual" hanya mengubah state React dan menulis `batch_moves.sisa`, tetapi `plant_batches` tidak punya kolom `jumlah_hidup`. | Setelah reload, sisa hidup kembali ke jumlah awal → stok terlihat lebih besar dari kenyataan; akumulasi mati/terjual hilang dari perhitungan. | `components/BibitTracker.tsx`, `app/batch/[id]/page.tsx`, `migrations/0007` |
| F-07 | P1 | Stored XSS di landing: `innerHTML` disusun dari `k.nama` / `b.nama` yang berasal dari tabel `commodities` (bisa diisi bebas lewat UI Komoditas). | Nama komoditas berisi `<img src=x onerror=...>` akan dieksekusi di browser **pengunjung publik** landing, bukan hanya pemilik akun. | `web/public/landing.html` (baris 260–290) |
| F-08 | P1 | Klaim offline-read tidak berjalan: `next-pwa` hanya aktif pada build webpack, sedangkan build Next 16 di sini memakai Turbopack; `runtimeCaching` (Supabase REST + storage) tidak pernah terpasang. `public/sw.js` sengaja tanpa `fetch` handler. | Di kebun tanpa sinyal, halaman tidak bisa dibuka/dibaca — bertentangan dengan NFR "Lihat tugas off-line" (PRD §7) dan US-07. Yang berfungsi hanya antrean tulis. | `web/next.config.ts`, `web/public/sw.js` |
| F-09 | P1 | Policy `kebun_foto for select using (true)` membuka **semua kolom** semua pengguna ke role `anon` (kunci anon bersifat publik). | Siapa pun dengan kunci anon bisa membaca `user_id`, `subjek_id`, `keterangan`, dan URL foto seluruh akun; memungkinkan enumerasi tenant. Aman hanya bila aplikasi benar-benar dipakai satu akun. | `migrations/0004_foto_galeri.sql`, `api/galeri/route.ts` |
| F-10 | P1 | Policy storage `kebun-foto` untuk insert/update/delete hanya mengecek `bucket_id` + `auth.role()='authenticated'`, tidak kepemilikan folder. | Pengguna login mana pun dapat menimpa (`upsert`) atau menghapus foto milik akun lain bila tahu path-nya (path memuat `user_id` yang bisa dibaca lewat F-09). | `migrations/0004_foto_galeri.sql`, `components/UnggahFoto.tsx`, `lib/outbox.ts` |
| F-11 | P1 | Tidak ada pelacakan migrasi. 0005–0007 bertipe "jalankan manual di SQL Editor"; 0005 tidak idempoten (tanpa `drop policy if exists`), dan tidak ada `supabase/config.toml`/CLI. | Skema produksi tidak dapat direproduksi; 0006 adalah **penutup lubang RLS** yang bisa terlewat tanpa terdeteksi. Fallback regex di aplikasi menyembunyikan drift sehingga bug muncul sebagai 404/angka 0. | `supabase/migrations/*`, `app/batch/[id]/page.tsx`, `app/page.tsx` |
| F-12 | P1 | Detail batch memilih kolom 0007 tanpa fallback; bila migrasi belum jalan, query error → `notFound()`. | Seluruh halaman detail batch 404, termasuk untuk data lama yang seharusnya tetap aman. Inkonsisten dengan `/batch` yang punya fallback. | `app/batch/[id]/page.tsx` |
| F-13 | P1 | Dua model penjualan paralel: `harvests.peruntukan='jual'` (lama) dan `bibit_sales` (0007). Tidak ada halaman/laporan omzet bibit. | Sumber kebenaran penjualan ambigu; "penjualan bibit per pcs" — inti pivot bisnis M8 — tidak punya rekap sama sekali. | `migrations/0001`, `0007`, `components/BibitTracker.tsx`, `app/panen/page.tsx` |
| F-14 | P2 | Tidak ada tipe Supabase hasil generate; `as never`, `as never[]`, cast objek manual di belasan tempat. `let data: never[]` di halaman komoditas. | Type-check lolos tetapi tidak menjaga bentuk data; refactor skema tidak akan memunculkan error kompilasi. | `app/komoditas/page.tsx`, `app/batch/page.tsx`, `app/bibit/page.tsx`, dll. |
| F-15 | P2 | Duplikasi helper: `tambahHari/tambahHariISO` (4 implementasi), `satu()`/`satuKom()` (6 file), peta ikon komoditas (2 tempat), pola `getUser()` + offline (5 komponen). | Perbaikan bug tanggal F-01/F-03 harus disentuh di banyak tempat; risiko perbaikan tidak merata. | `lib/kalender.ts`, `lib/tanggal.ts`, `api/publik/*`, `components/*` |
| F-16 | P2 | `stok_siap` diperbarui dengan pola read-modify-write dari klien (`setSiap(siap - jml)`). | Dua perangkat mencatat penjualan bersamaan → salah satu update hilang; stok tidak konsisten. | `components/BibitTracker.tsx` |
| F-17 | P2 | "Siap panen" untuk batch `tujuan='jual'` memakai `umur_panen_min` (umur panen sayur), bukan `umur_siap_*`. | Batch bibit menampilkan label "Siap panen!" padahal konteksnya jual bibit. | `app/batch/page.tsx`, `app/page.tsx`, `app/kebun/page.tsx` |
| F-18 | P2 | Semantik umur bercampur: `hitungHST()` dipakai untuk umur semai; `tgl_semai` opsional tetapi `umur_siap_*` tetap dihitung walau `tgl_semai` null (memakai HST tanam). | Angka "siap jual" bisa berbeda antara `/bibit` (pakai `umurSemai ?? hst`) dan landing (pakai `dasarUmur`), dan tidak dapat dipertanggungjawabkan bila semai tidak dicatat. | `lib/tanggal.ts`, `app/bibit/page.tsx`, `api/publik/bibit/route.ts` |
| F-19 | P2 | Skema kurang constraint: tidak ada `CHECK` untuk `plant_batches.status`, `care_tasks.status/jenis`, `supplies.arah`; `commodities`/`media_types` tanpa `UNIQUE(user_id, nama)`; `care_tasks` tanpa `UNIQUE(user_id, batch_id, jenis, due_date)`; `kebun_foto.subjek_id` tanpa FK. | Status `lewat` dipakai UI tanpa definisi skema; duplikasi tugas mungkin; baris foto yatim saat batch/lokasi dihapus. | `migrations/0001`, `0004`, `components/TugasCard.tsx` |
| F-20 | P2 | Index kurang untuk pola query RLS: `care_tasks(user_id,due_date)`, `harvests(user_id,tanggal)`, `activity_logs(batch_id)`, `plant_batches(user_id,status)`. | Setiap query terfilter `user_id` melakukan scan; makin terasa saat data tahunan menumpuk. | `migrations/0001` |
| F-21 | P2 | Kolom `media_stocks.terpakai` tidak pernah ditulis/dipakai (aplikasi menghitung dari batch). | Dua sumber kebenaran; laporan stok media berpotensi menyimpang. | `migrations/0001`, `app/sarana/page.tsx` |
| F-22 | P2 | `/api/galeri` dan `/api/publik/ringkasan` menganggur tetapi tetap mengekspos data lintas akun (foto + total panen seluruh pengguna) lewat service-role/anon. `revalidate` di `/api/galeri` tidak berlaku karena route dynamic (memakai cookie). | Permukaan serangan & biaya query tanpa manfaat; klaim "cache CDN 10 menit" di komentar tidak benar. | `api/galeri/route.ts`, `api/publik/ringkasan/route.ts` |
| F-23 | P2 | `/api/push/subscribe` melakukan `upsert` dengan `onConflict: "endpoint"`. Bila endpoint sudah dimiliki akun lain (HP dipakai bergantian), update ditolak RLS → 500 generik. | Pesan error menyesatkan; push tidak bisa diaktifkan pada perangkat bekas akun lain tanpa membersihkan dulu. | `api/push/subscribe/route.ts` |
| F-24 | P2 | Tidak ada validasi skema input (zod/valibot). Semua insert langsung dari state klien: `jumlah`/`harga`/`stok` bisa negatif atau non-bulat, teks tanpa batas panjang. | Data kotor masuk DB; RLS hanya menjaga kepemilikan, bukan bentuk data. | `components/*` (form), `migrations/0001` |
| F-25 | P2 | SEO landing: tidak ada `robots.txt`/`sitemap.xml`, landing berada di `/landing.html` (bukan `/`), tanpa Open Graph/Twitter card/canonical/JSON-LD, dan memuat Tailwind CDN + Lucide UMD + Google Fonts eksternal tanpa SRI. | Pratinjau tautan di WhatsApp/IG tanpa gambar & judul yang konsisten (padahal landing = kanal jualan); render-blocking CDN menurunkan skor performa; rantai dependensi CDN luar tanpa integritas. | `web/public/landing.html`, `web/public/` |
| F-26 | P2 | Aksesibilitas: sheet menu (aplikasi & landing) tidak menjebak fokus (`aria-modal` tetapi Tab bisa keluar); layout aplikasi tanpa skip-link; `role="grid"` di kalender tanpa `row`/`gridcell`. | Navigasi keyboard/screen reader pada dialog modal tidak sesuai ARIA; auditan M6 sudah bagus untuk target sentuh, sisa celah ini belum. | `components/BottomNav.tsx`, `app/layout.tsx`, `components/KalenderManager.tsx`, `public/landing.html` |
| F-27 | P2 | Artefak tak terawat: `design.html` (59 KB) & `pasang-spin.cjs` untracked; aset default Next (`window.svg`, `vercel.svg`, `next.svg`, `globe.svg`, `file.svg`, `logo1.jpg`, `logo2.jpg`) tidak dipakai; `README.md` masih boilerplate create-next-app. | Kebingungan saat onboarding/kontribusi; risiko file eksperimen ikut ter-commit. | root, `web/public/*`, `web/README.md` |
| F-28 | P2 | Gate auth memakai fallback `getSession()` (JWT tidak diverifikasi server) saat `getUser()` gagal. | Halaman bisa terbuka dengan sesi tidak sah; data tetap aman karena RLS, tetapi pola ini berbahaya bila kelak ada route service-role yang bergantung pada gate proxy. | `lib/supabase/middleware.ts` |
| F-29 | P2 | `seed_tafsha_farm()` adalah `security definer` tanpa `revoke execute from public/anon`. | Meski guard `auth.uid()` mencegah eksekusi anonim, prinsip least-privilege belum diterapkan. | `migrations/0001`..`0007` |
| F-30 | P2 | Tidak ada test sama sekali (tidak ada runner, tidak ada file uji), padahal logika tanggal/kalender murni dan mudah diuji. | Regresi seperti F-01/F-03/F-05 hanya tertangkap manual; setiap perubahan `lib/tanggal.ts`/`lib/kalender.ts` berisiko. | `web/package.json`, `web/src/lib/*` |

---

## F. Rekomendasi Prioritas

Effort kasar: **S** = perubahan kecil terisolasi · **M** = menyentuh beberapa file + verifikasi manual · **L** = perubahan skema/data + migrasi + verifikasi lintas halaman.

| Prioritas | Rekomendasi | Alasan | Effort | File terkait |
|---|---|---|---|---|
| 1 (P0) | Satukan semua aritmatika tanggal ke satu util berbasis **tanggal kalender string** (tanpa `toISOString()`); tambahkan `hariIniISO()` yang sadar `Asia/Jakarta`. Perbaiki `BatchForm` (pembuatan 30/60 tugas) dan `panen/page.tsx` (batas bulan). | Menyetop sumber data salah yang sudah/akan tertulis permanen. Ini prasyarat semua pekerjaan lain; tanpa ini laporan penjualan/panen tidak akan pernah cocok. | M | `lib/tanggal.ts`, `components/BatchForm.tsx`, `app/panen/page.tsx`, `lib/kalender.ts` |
| 2 (P1) | Backfill & audit data `care_tasks` yang sudah bergeser; sediakan skrip SQL read-only untuk menghitung selisih per batch (tanpa mengubah data sampai disetujui). | Perbaikan kode tidak menyembuhkan 30–60 baris salah per batch yang sudah ada. Perlu keputusan: geser `+1 hari` atau regenerasi. | M | `supabase/migrations/` (baru), `report/` |
| 3 (P1) | Hentikan inisialisasi `stok_siap = jumlah`; mulai `stok_siap = 0` dan alirkan lewat aksi "Siap jual". Tambahkan kolom `jumlah_hidup` (atau view turunan dari `batch_moves`) supaya mati/terjual persisten. | Menyelamatkan kredibilitas etalase (klaim "siap" di landing) dan membuat math stok bibit benar setelah reload. | L | `components/BatchForm.tsx`, `components/BibitTracker.tsx`, `app/batch/[id]/page.tsx`, migrasi baru |
| 4 (P1) | Tutup celah data publik: ganti policy `kebun_foto` publik menjadi view/kolom terbatas (tanpa `user_id`/`subjek_id`), perketat policy storage berdasarkan folder `auth.uid()`, dan hapus/hentikan endpoint menganggur. | Menutup enumerasi tenant + kemungkinan hapus foto lintas akun; sekaligus memangkas permukaan serangan service-role. | M | `migrations/0004` (baru: 0008), `api/galeri`, `api/publik/ringkasan`, `lib/outbox.ts` |
| 5 (P1) | Hilangkan `innerHTML` dari landing: bangun node via `textContent`/`createElement` (atau sanitasi). | XSS pada halaman publik adalah temuan keamanan paling langsung terpicu oleh data pengguna. | S | `web/public/landing.html` |
| 6 (P1) | Selesaikan alur offline: (a) saat centang offline, antrekan juga perubahan status tugas; (b) putuskan strategi PWA — pasang service worker dengan precache shell + `fetch` NetworkFirst, atau turunkan klaim offline-read di PRD/landing. | Offline adalah NFR eksplisit; sekarang hanya separuh (tulis) yang bekerja, dan pengguna bisa merasa tugasnya "hilang". | M | `lib/outbox.ts`, `components/TugasCard.tsx`, `public/sw.js`, `next.config.ts` |
| 7 (P1) | Kelola skema via Supabase CLI: `supabase/config.toml` + `supabase db push`, jadikan 0005–0007 idempoten, dan tambahkan fallback yang sama di `/batch/[id]` (atau hapus semua fallback setelah migrasi dipastikan). | Menghilangkan kelas bug "404 karena skema belum update" dan memastikan 0006 (penutup RLS) tidak terlewat. | M | `supabase/`, `app/batch/[id]/page.tsx`, `app/*/page.tsx` |
| 8 (P2) | Generate tipe database (`supabase gen types typescript`) + tambah validasi input (zod) di form inti. | Memberi jaring pengaman kompilasi untuk pekerjaan skema berikutnya dan mencegah data kotor (jumlah/harga negatif). | M | `web/src/lib/supabase/*`, `web/src/types/`, `components/*` |
| 9 (P2) | Konsolidasi util: satu `lib/tanggal.ts` (tanggal, HST, geser bulan), satu helper `satu()`, satu peta ikon. | Menghilangkan sumber duplikasi F-01/F-03/F-15 sekaligus mempermudah unit test. | S–M | `lib/tanggal.ts`, `lib/kalender.ts`, `lib/media.ts`, `components/*` |
| 10 (P2) | Lengkapi laporan penjualan bibit (halaman + rekap omzet per bulan) dan satukan model penjualan ke `bibit_sales`. | Inti pivot bisnis M8 belum punya rekap; tanpa ini data `bibit_sales` hanya jadi catatan pasif. | M | `app/bibit/` (baru), `components/BibitTracker.tsx`, `app/panen/page.tsx` |
| 11 (P2) | SEO & performa landing: pindahkan ke `/` (atau rewrite), tambah `robots.txt`+`sitemap.xml`, OG/Twitter/JSON-LD Produk & LocalBusiness, buang CDN Tailwind/Lucide (Tailwind sudah terpasang di app), self-host font. | Landing = etalase jualan; pratinjau tautan tanpa gambar dan render-blocking CDN langsung menurunkan konversi. | M | `web/public/landing.html`, `web/src/app/page.tsx`, `web/next.config.ts` |
| 12 (P2) | Rapikan repo: putuskan `design.html`, hapus `pasang-spin.cjs` & aset default Next, tulis ulang `README.md`, tambah index DB (F-20) + constraint (F-19). | Mengurangi kebisingan dan menyiapkan skala data; murah dilakukan sekarang. | S | root, `web/public/*`, `web/README.md`, `migrations/0001` |

---

## G. Rencana 3 Langkah Berikutnya

1. **Perbaiki aritmatika tanggal (P0) + tambah unit test kecil.** Refactor `lib/tanggal.ts` menjadi sumber tunggal (fungsi `hariIniISO` sadar `Asia/Jakarta`, `tambahHariISO` berbasis string), ganti `toISOString().slice(0,10)` di `BatchForm` dan `app/panen/page.tsx`, lalu tulis test untuk 4 skenario: batch dibuat siang WIB, batch dibuat 23:30 WIB, bulan Februari, dan pergantian tahun. Verifikasi: `tsc`, `eslint`, `next build`, plus cek manual 1 batch baru bahwa `care_tasks` mulai di tanggal tanam.
2. **Audit & putuskan remediasi data lama.** Jalankan query read-only untuk menghitung berapa batch yang `care_tasks`-nya bergeser, lalu susun migrasi 0008 (opsi: geser `care_tasks` +1 hari untuk batch bersangkutan, atau tandai `lewat`/regenerasi). Tidak dieksekusi sebelum disetujui.
3. **Tutup celah publik (F-05, F-07, F-09, F-10).** Urutan aman: sanitasi landing → batasi policy `kebun_foto`/storage → set `stok_siap` awal 0 + kolom `jumlah_hidup`. Setelah itu baru lanjut ke pengelolaan migrasi via CLI dan laporan penjualan.

---

## H. Pertanyaan / Konfirmasi Scope

1. **Data lama F-01/F-03:** apakah `care_tasks` yang sudah bergeser cukup digeser `+1 hari` untuk batch yang bersangkutan, atau regenerasi penuh 30 hari dari `tgl_tanam`? (Perlu keputusan sebelum saya menulis migrasi 0008.)
2. **Multi-tenant:** aplikasi ini akan dipakai lebih dari satu akun/keluarga? Jika ya, F-09/F-10/F-22 naik ke P0 karena foto dan URL bisa dibaca lintas akun. Jika hanya satu keluarga, cukup didokumentasikan sebagai batasan.
3. **Klaim offline-read (F-08):** ingin benar-benar dibuatkan (service worker + precache shell), atau klaim di PRD/landing yang diturunkan menjadi "offline untuk mencatat" saja?
4. **`design.html` & `pasang-spin.cjs`:** dihapus, diarsipkan ke `report/`, atau memang masih dipakai?
5. **Skema 0007 di produksi:** sudah dijalankan di Supabase? (M10 menyebut `.env.local` lokal belum punya `SUPABASE_SERVICE_ROLE_KEY`, jadi landing lokal tidak teruji.) Ini menentukan apakah fallback skema masih perlu dipertahankan.
6. **Ruang lingkup audit lanjutan:** apakah perlu saya lanjut mengaudit isi `PRD.md` terhadap implementasi secara baris-per-baris (gap PRD vs kode), atau cukup temuan teknis di laporan ini?

---

> Catatan: audit ini tidak mengubah kode, tidak menjalankan migrasi, dan tidak membaca/menampilkan isi `.env.local` — hanya nama variabel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`).
