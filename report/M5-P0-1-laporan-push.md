# Laporan M5 P0-1 — Push Server VAPID ✅ SELESAI

**Tanggal:** 28 Okt 2026
**Branch:** `dev` (di atas M4-2 `af535a1`)
**Build:** `npm run build` sukses (Next.js 16.4.3, 15 route: + `/api/push/subscribe`, `/api/push/kirim`) — baris `ƒ Proxy (Middleware)` tetap ada
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `npx tsc --noEmit` (via `node node_modules/typescript/bin/tsc`) bersih
**Dep baru:** `web-push@3.6.7` + `@types/web-push@3.6.4` (satu-satunya dep baru, sesuai rencana)

---

## 1. Yang dibangun

### A. Migrasi `supabase/migrations/0005_push_subs.sql` — baru
Tabel `push_subscriptions(id, user_id→auth.users cascade, endpoint unique, p256dh, auth, created_at)` + RLS enable + policy `milik sendiri` (pola sama seperti `0001_schema_awal.sql`) + index `idx_push_subs_user`.
⚠️ **WAJIB dijalankan MANUAL di Supabase Dashboard > SQL Editor** (sesi ini tidak punya akses DB). Urutan setelah `0004_foto_galeri.sql`.

### B. VAPID + secret — lokal saja, tidak di-commit
`npx web-push generate-vapid-keys --json` → kunci VAPID + `CRON_SECRET` (acak 32 hex) sudah diisi ke `web/.env.local`. `web/.env.example` ditambah contoh KOSONG (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`). `.env.local` terkonfirmasi di-gitignore (pola `.env*` di `web/.gitignore`).
⚠️ **Env Vercel yang harus dipasang MANUAL di dashboard (Production):** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (+ `SUPABASE_SERVICE_ROLE_KEY`, lihat D). Nilai aslinya TIDAK ada di laporan/commit ini — hanya nama var.

### C. `web/src/lib/push.ts` — baru (client-safe, tanpa `"use client"`)
`daftarPush()` — cek dukungan (`Notification`/`serviceWorker`/`PushManager`/env) → `requestPermission()` → registrasi `/sw.js` (reuse bila ada) → `pushManager.subscribe({userVisibleOnly, applicationServerKey})` → POST ke `/api/push/subscribe`. `berhentiPush()` — `unsubscribe()` + DELETE API. Helper konversi base64-url WAJIB ada (VAPID key env dalam format base64-url). Pesan error Indonesia.

### D. `web/src/app/api/push/subscribe/route.ts` — baru
POST: `auth.getUser()` (server) → 401 bila tamu; validasi body minimal (endpoint string, keys p256dh+auth) → upsert on conflict `endpoint`. DELETE: hapus by `endpoint` + `user_id` milik sendiri. Pesan error Indonesia.
Catatan desain: route kirim (E) memakai service-role key karena RLS `milik sendiri` memblokir baca lintas-user; klien anon cron tidak punya sesi login. **Env tambahan yang harus dipasang:** `SUPABASE_SERVICE_ROLE_KEY` (dari dashboard Supabase > Project Settings > API, kunci `service_role`). Tanpa ini route kirim balas 500 "belum dikonfigurasi" — tidak merusak route lain.

### E. `web/src/app/api/push/kirim/route.ts` — baru
GET: guard `Authorization: Bearer CRON_SECRET` (perbandingan timing-safe; `CRON_SECRET` kosong → 500) ATAU header `x-vercel-cosmic-ray`/`x-vercel-cron`. Vercel Cron mengirim `Authorization: Bearer $CRON_SECRET` otomatis bila env `CRON_SECRET` ada — guard Bearer TETAP yang utama, header vercel sebagai kompatibilitas.
Isi: tanggal = WIB hari ini (`Date.now()+7jam`); query `care_tasks` by `due_date` → group per `user_id` (hitung N); per user ambil endpoint → `webpush.setVapidDetails` sekali → `sendNotification({title:"🌱 ...", body:"N hal... 🏡", icon, url:"/tugas"})`. Endpoint mati (404/410) → DELETE dari tabel. Per user dibungkus try/catch (1 gagal tidak gugurkan lain). Balas `{terkirim, gagal, tanggal}`.

### F. `web/vercel.json` — baru
`{ "crons": [{ "path": "/api/push/kirim", "schedule": "0 23 * * *" }] }` (= 06:00 WIB). Batas paket Hobby: 1x sehari — cukup.

### G. `NotifButton.tsx` — tambah blok push di bawah status lokal
Effect lokal M4-2 (jam<12 + flag `tafsha-notif` + count hari ini) TIDAK DIUBAH — jadi fallback bila push gagal/ditolak. Tambahan: bila `status==="granted"`, tampil blok `tf-item` — tombol "Aktifkan push otomatis 📲" (bila `localStorage tafsha-push !== aktif`) → `daftarPush()` → sukses: flag + "✅ Push otomatis aktif..."; gagal: pesan ramah + penegas fallback lokal tetap jalan. Bila flag aktif: status push aktif + tombol kecil "Matikan" → `berhentiPush()`. State `sibuk/pesan` + `MiniSpin`, pola `siap` anti-`set-state-in-effect` (warisan M4-1/M4-2, lint `react-hooks/set-state-in-effect` lolos).

### H. Service worker push — `web/public/sw.js` (statis) PENYESUAIAN dari rencana
Rencana awal (`customWorkerSrc: "worker"` + `worker/index.js`) TIDAK dipakai — hasil verifikasi build membuktikan **plugin next-pwa v10 hanya aktif di build webpack; `next build` Next 16 = Turbopack sehingga plugin diabaikan total** (tidak ada `sw.js`/`worker-*.js`/`workbox-*.js` hasil generate di mana pun, juga di build M4-2). Memaksa `customWorkerSrc` tidak menghasilkan apa-apa.
Penyesuaian (sesuai izin PROMPT "sesuaikan — jangan force"): handler `push` → `showNotification({body, icon:"/icons/icon-192.png", data:{url:"/tugas"}})` + `notificationclick` → `clients.openWindow/navigate("/tugas")` ditulis sebagai `public/sw.js` statis (+ `install skipWaiting` / `activate clients.claim`, TANPA fetch handler agar tidak ganggu cache). `lib/push.ts` registrasi manual via `getRegistration() ?? register("/sw.js")` (bukan `serviceWorker.ready` yang bisa hang bila belum ada registrasi). Matcher `proxy.ts` M4-2 sudah mengecualikan `sw.js` — tidak diubah.
Implikasi jujur: runtimeCaching Workbox M4-2 (REST `NetworkFirst` + foto `CacheFirst`) juga tidak aktif selama build Turbopack — di luar lingkup P0-1, dicatat di Batasan.

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `supabase/migrations/0005_push_subs.sql`, `web/src/lib/push.ts`, `web/src/app/api/push/subscribe/route.ts`, `web/src/app/api/push/kirim/route.ts`, `web/vercel.json`, `web/public/sw.js`, `report/M5-P0-1-laporan-push.md` |
| Ubah | `web/package.json` (+web-push, @types/web-push), `web/package-lock.json`, `web/.env.example` (contoh kosong), `web/.gitignore` (`!.env.example` agar contoh env bisa di-commit; `.env.local` tetap ignore), `web/src/components/NotifButton.tsx` (blok push) |
| Lokal saja (tidak commit) | `web/.env.local` (nilai VAPID + CRON_SECRET asli) |
| Tidak disentuh | Logika M4-1/M4-2 lain, `next.config.ts` (akhirnya tanpa customWorkerSrc), landing, galeri |

---

## 3. Kriteria cek P0-1

- [x] **Subscribe dari HP → baris baru di `push_subscriptions`; DELETE/Matikan → baris hilang.** (statis: POST upsert on conflict endpoint, DELETE by endpoint+user_id; uji klik butuh HP + login — lihat Batasan)
- [x] **`GET /api/push/kirim` tanpa/Bearer salah → 401; Bearer benar → `{terkirim, gagal}`; endpoint mati terhapus otomatis.** (statis: guard timing-safe + 404/410→DELETE; uji HTTP butuh server jalan + secret — lihat Batasan)
- [x] **Cron 06:00 WIB tiba sebagai notifikasi sistem walau tab tutup; klik → buka `/tugas`. Bila push ditolak/gagal → fallback lokal M4-2 tetap jalan.** (statis: `sw.js` handler push/notificationclick + effect lokal utuh; uji E2E butuh HTTPS + perangkat — lihat Batasan)
- [x] **Build + lint + tsc bersih:** 15 route (13 lama + 2 push), `ƒ Proxy (Middleware)`, 0/0 lint, tsc bersih

---

## 4. Batasan / diketahui

- Verifikasi kriteria di atas dilakukan statis (kode + build + lint + tsc). **Uji sesungguhnya butuh HTTPS + HP + login Supabase dan TIDAK bisa dari sesi/localhost ini:** (a) subscribe/unsubscribe dari HP; (b) `curl /api/push/kirim` dengan Bearer; (c) notifikasi tiba saat tab tutup + klik → `/tugas`.
- **3 hal manual sebelum P0-1 hidup di produksi:** (a) jalankan `0005_push_subs.sql` di Supabase SQL Editor; (b) pasang 5 env di Vercel (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`); (c) uji dari HP via URL produksi (HTTPS).
- Insiden lingkungan (sudah pulih, tidak ada sisa): `npm i web-push` pertama merontokkan `node_modules` (pesan "removed 565 packages") karena `NODE_ENV=production` ter-set di mesin ini sehingga npm memangkas devDeps. Pulih via `npm ci` dengan `NODE_ENV=development` (616 paket). `package-lock.json` sehat (681→694 paket, +13 transitive web-push). Perintah `npx tsc` mengambil paket `tsc` yang salah — gunakan `node node_modules/typescript/bin/tsc --noEmit`.
- `npm audit` melaporkan 7 vuln (4 low, 2 moderate, 1 high) — warisan rantai Next/eslint, bukan dari `web-push`; tidak ditindaklanjuti di paket ini.
- Seperti M4-2: `SinkronButton`/`NotifButton` memakai flag `siap` agar lolos aturan `react-hooks/set-state-in-effect`.
