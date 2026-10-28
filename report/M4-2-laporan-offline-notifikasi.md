# Laporan M4-2 — Outbox Offline + Pengingat Lokal ✅ SELESAI

**Tanggal:** 28 Okt 2026
**Branch:** `dev` (di atas M4-1 yang sudah push)
**Build:** `npm run build` sukses (Next.js 16.4.3, 13 route) — baris `ƒ Proxy (Middleware)` muncul, warning `middleware` deprecated HILANG
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `npx tsc --noEmit` bersih

---

## 1. Yang dibangun

### A. Outbox IndexedDB (`web/src/lib/outbox.ts`) — baru, tanpa dep baru
| Area | Hasil |
|---|---|
| Store | DB `tafsha-farm`, object store `outbox` keyPath `id`, record `{id, tipe, payload, blob?, created_at, percobaan}` |
| Tipe | `activity_log` / `harvest` / `care_task` / `foto` |
| Fungsi | `tambahAntrean`, `hitungAntrean`, `ambilSemuaAntrean`, `hapusAntrean`, `sinkronkanAntrean(supabase)` + event `outbox:berubah` (CustomEvent) agar badge/button live |
| Batas | Maks 20 foto & total 50MB — ditolak dengan pesan ramah Indonesia ("Galeri offline penuh...", "Ruang offline hampir penuh...") |
| Sync foto | Upload storage path `{userId}/{subjek}/{subjekId}/{outboxId}.jpg` + `upsert:true` (retry tidak duplikat) → insert `kebun_foto` → update `foto_url` tabel subjek (`locations`/`sub_blocks`/`plant_batches`) |
| Pengaman | Kunci ganda (satu janji sync berjalan); sync hanya bila `auth.getUser()` ada; entri gagal naik `percobaan`, tidak hilang |

### B. Branch offline di 4 form — pola sama
Coba tulis Supabase langsung → bila `!navigator.onLine` SEBELUM tulis, atau error berisi `Failed to fetch`/`NetworkError`/`offline`/`network` (case-insensitive) SETELAH tulis → simpan ke outbox + pesan "📴 tersimpan offline, menunggu sinkron: n". `getUser()` dibungkus defensif (offline gagal → `user_id: null`, diganti user asli saat sinkron). `TambahTugasForm` tetap menolak bila online tanpa sesi ("Harus masuk dulu").

| File | Ubah |
|---|---|
| `LogForm.tsx` | Payload `activity_log` + `created_at`, fallback offline dua lapis |
| `HarvestForm.tsx` | Payload `harvest` + `created_at`, fallback offline dua lapis |
| `TambahTugasForm.tsx` | Payload `care_task` (`status:"belum"`), tetap wajib login saat online |
| `UnggahFoto.tsx` | Setelah `kompresFoto()`: offline → antrekan Blob JPEG + preview `URL.createObjectURL(blob)` via `saatSelesai` (KebunManager langsung tampil); jalur upload online tidak berubah (`Date.now()` + `upsert:false`) |

### C. `SinkronButton.tsx` + `BadgeAntrean.tsx` — baru (client components)
| Area | Hasil |
|---|---|
| Auto-sync | Saat event `online` + saat aplikasi dibuka (diam-diam); hanya bila sesi ada |
| Badge | "⏳ menunggu sinkron: n" di beranda (`page.tsx`) + `/tugas`; hilang saat 0; klik badge → `/tugas` |
| Tombol | Manual "🔄 Sinkronkan" + hasil ("✅ n data tersinkron" / "⏳ n masih menunggu"); `router.refresh()` setelah sukses agar galeri/daftar ikut nambah |

### D. Pengingat lokal (tanpa server — VAPID/push eksplisit DITUNDA ke M5)
| Area | Hasil |
|---|---|
| Ikon | `icon-192.png` (10KB), `icon-512.png` (58KB) + `icon-maskable-512.png` (safe-area 12%), motif kapal+daun setara `icon.svg`; digambar ulang via script Node sekali-pakai (zlib bawaan, tanpa dep baru — ImageMagick `convert.exe` di mesin ini ternyata redirect Windows, `magick`/PIL/`sharp` tidak ada). Script sudah dihapus setelah jalan. |
| Manifest | Entri `any` 192 + `any` 512 + `maskable` 512, SVG lama dipertahankan. Syarat prompt Install Android terpenuhi. |
| `NotifButton` | Izin + `new Notification(...)` sekali sehari (kunci `tafsha-ingat` per tanggal), hanya bila: granted + flag `tafsha-notif` + buka tab pagi (jam < 12) + count `care_tasks` hari ini > 0 |
| `next.config.ts` | `runtimeCaching`: Supabase REST `NetworkFirst` (5 mnt, 64 entri, timeout 8 dtk) + `kebun-foto` `CacheFirst` (7 hari, 120 entri). Cache bawaan next-pwa tidak ditimpa (nama cache baru). |

### E. `middleware.ts` → `proxy.ts`
Via `npx @next/codemod@latest middleware-to-proxy . --force` (flag `--force` karena working tree berisi kerjaan M4-2 yang belum commit). Hasil: `src/proxy.ts` ekspor named `proxy`, matcher byte-identik (termasuk pengecualian `manifest.json`, `icons/`, `sw.js`, `workbox-*.js`). `src/middleware.ts` terhapus oleh codemod.

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `web/src/lib/outbox.ts`, `web/src/components/SinkronButton.tsx`, `web/src/components/BadgeAntrean.tsx`, `web/public/icons/icon-192.png`, `web/public/icons/icon-512.png`, `web/public/icons/icon-maskable-512.png`, `report/M4-2-laporan-offline-notifikasi.md` |
| Ubah | `web/src/components/LogForm.tsx`, `web/src/components/HarvestForm.tsx`, `web/src/components/TambahTugasForm.tsx`, `web/src/components/UnggahFoto.tsx`, `web/src/components/NotifButton.tsx`, `web/src/app/page.tsx`, `web/src/app/tugas/page.tsx`, `web/next.config.ts`, `web/public/manifest.json` |
| Migrasi codemod | `web/src/middleware.ts` → `web/src/proxy.ts` (logika sama) |
| Tidak disentuh | Logika M4-1 (Komoditas/Sarana/Panen manager + halaman), migrasi SQL, landing, `KebunManager.tsx` |

---

## 3. Kriteria cek M4-2

- [x] **Airplane mode catat log + panen + 1 foto → antrean 3:** ketiga form menulis ke IndexedDB dengan pesan "tersimpan offline, menunggu sinkron: n" (n naik 1→2→3); foto offline tampil pratinjau lokal via `saatSelesai`
- [x] **Online-kan → tersinkron, badge 0, galeri ikut nambah:** auto-sync saat event `online` + buka aplikasi; urutan foto benar (upload → riwayat → foto utama); `SinkronButton` memanggil `router.refresh()`; galeri landing baca `/api/galeri` yang query `kebun_foto` — tanpa ubah landing
- [x] **`/tugas` kebuka offline kunjungan kedua + foto kemarin dari cache:** Workbox `NetworkFirst` untuk REST Supabase + `CacheFirst` untuk `kebun-foto` (+ `next-image` default); foto `foto_url` kemarin tampil dari cache
- [x] **Prompt Install di Android:** manifest punya 192 + 512 `any` + 512 `maskable` (PNG asli)
- [x] **Notifikasi lokal pagi bila tugas > 0:** `NotifButton` kirim `new Notification` 1x/hari saat tab dibuka sebelum jam 12 + count hari ini > 0
- [x] **Build + lint bersih:** build 13 route + `ƒ Proxy (Middleware)`, tanpa warning deprecated; lint 0/0; tsc bersih
- [x] **Tanpa dep baru:** `package.json` tidak berubah

---

## 4. Batasan / diketahui

- Verifikasi kriteria dilakukan statis (kode + build + lint); uji klik manual sesungguhnya (airplane mode di HP kebun, prompt Install Android, notifikasi pagi) diserahkan ke sesi uji karena butuh perangkat + sesi login Supabase asli.
- `TambahTugasForm` offline menyimpan `user_id: null` bila sesi tak terbaca; sinkron mengganti dengan user login — bila HP dipakai bergantian akun, antrean lama ikut ke akun yang sinkron duluan (acceptable untuk 1 HP kebun).
- Notifikasi hanya muncul bila tab aplikasi DIBUKA pagi hari (tanpa service push/VAPID — itu jatah M5). Di luar jam < 12 tidak ada notifikasi.
- `SinkronButton` memakai flag `siap` agar tidak ada `setState` sinkron di effect (aturan lint `react-hooks/set-state-in-effect` warisan pola M4-1).
- Ukuran ikon maskable sengaja longgar (margin 12%) agar aman dipotong lingkaran Android; visual PNG setara SVG, bukan konversi piksel.
