# Laporan M5 P1-1 — Halaman Pengaturan + Nav Komoditas ✅ SELESAI

**Tanggal:** 28 Okt 2026
**Branch:** `dev` (di atas P0-2 `330f3c2`)
**Build:** `npm run build` sukses (Next.js 16.4.3, 16 route termasuk `/pengaturan` baru, baris `ƒ Proxy (Middleware)` tetap ada)
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `node node_modules/typescript/bin/tsc --noEmit` bersih
**Dep baru:** tidak ada. **Migrasi SQL:** tidak ada. **API route baru:** tidak ada (hapus akun via Server Action di halaman yang sama).

---

## 1. Yang dibangun

### A. `web/src/app/pengaturan/page.tsx` — baru, server component
Pola sama seperti `tugas/page.tsx`: `auth.getUser()` via `createClient()` server → oper `email` ke client. Tidak query data lain di server — CSV diambil client-side agar tetap fungsi offline-first (RLS per-user berlaku otomatis).
Server Action `hapusAkunSaya()` di file yang sama (bukan API route baru, jumlah route build tidak bertambah): `admin.auth.admin.deleteUser(user.id)` via `SUPABASE_SERVICE_ROLE_KEY` → seluruh baris milik user ikut terhapus otomatis lewat `on delete cascade` (tanpa hapus data manual per tabel, tanpa migrasi). Bila service key belum terpasang (mis. `.env.local` lokal) → pesan ramah "hubungi pengelola kebun".

### B. `web/src/components/PengaturanClient.tsx` — baru, 3 blok `tf-card` + zona bahaya
- **(a) Akun** — email + `LogoutButton` (REUSE komponen apa adanya, tetap dipakai header; tidak dipindah).
- **(b) Notifikasi** — `NotifButton` (REUSE apa adanya; effect lokal M4-2 + blok push P0-1 tidak diubah).
- **(c) Data** — tombol "⬇️ Unduh panen (CSV)" + "⬇️ Unduh logbook (CSV)": fetch client-side dari Supabase (`harvests`: tanggal,jumlah,satuan,kualitas,peruntukan,batch_id — kolom sama seperti `panen/page.tsx`; `activity_logs`: batch_id,jenis,deskripsi,dosis,oleh,created_at — kolom sama seperti `batch/[id]/page.tsx`) → `Blob` + `a.download`, pemisah `;` + BOM `\uFEFF` agar rapi dibuka di Excel Indonesia, nama `panen-YYYY-MM-DD.csv` / `logbook-YYYY-MM-DD.csv`, limit 1000 baris. Tidak ada pola unduh/CSV di repo sebelumnya — ditulis manual tanpa dep. Tombol "Hapus antrean offline": `confirm()` dulu → loop `ambilSemuaAntrean` + `hapusAntrean` dari `@/lib/outbox` (tanpa helper baru) → `router.refresh()`.
- **Zona bahaya** — tombol merah `tf-btn-merah`: `confirm()` DUA KALI berurutan → panggil Server Action → `signOut()` → `/masuk`.
- State `aksi/pesan` + `MiniSpin`, kelas `tf-*`, pesan error ramah Indonesia. Pola anti-`set-state-in-effect`: baca `hitungAntrean()` di effect dengan flag `hidup`, `setSiap(true)` di `finally`.

### C. `web/src/components/BottomNav.tsx` — ubah kecil
Tambah `{href:"/komoditas", label:"Komoditas", ikon:"🌿"}` → grid `grid-cols-6`→`grid-cols-7`, `min-h-[65px]` tetap. Komoditas satu-satunya menu yang sebelumnya cuma via MenuGrid. `/pengaturan` TIDAK masuk bottom nav (sesuai rencana).

### D. `web/src/app/page.tsx` — MenuGrid tambah tautan Pengaturan
`CARDS` tambah `{ title: "Pengaturan", desc: "Akun, notifikasi & data", href: "/pengaturan" }` (opsional sesuai rencana, grid `lg:grid-cols-3` tidak berubah).

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Baru | `web/src/app/pengaturan/page.tsx`, `web/src/components/PengaturanClient.tsx`, `report/M5-P1-1-laporan-pengaturan.md` |
| Ubah | `web/src/components/BottomNav.tsx`, `web/src/app/page.tsx` (MenuGrid saja) |
| Tidak disentuh | `LogoutButton.tsx`, `NotifButton.tsx`, `outbox.ts`, `MiniSpin`, logika M4-1/M4-2/P0-1/P0-2 lain, `globals.css`, migrasi, `package.json`, `.env*` |

---

## 3. Kriteria cek P1-1

- [x] **Buka `/pengaturan` saat login → tampil email + 3 blok + zona bahaya; tamu → redirect `/masuk`.** (statis: server oper email; middleware sudah redirect tamu untuk semua path non-publik termasuk `/pengaturan`; uji klik butuh login, lihat Batasan)
- [x] **Tombol CSV → file `panen-YYYY-MM-DD.csv` / `logbook-YYYY-MM-DD.csv` terunduh.** (statis: query RLS milik-sendiri + Blob + a.download; uji klik butuh login + data, lihat Batasan)
- [x] **"Hapus antrean offline" → confirm → antrean 0 + badge hilang.** (statis: reuse `ambilSemuaAntrean`/`hapusAntrean`, event `outbox:berubah` me-refresh badge; uji butuh antrean offline sungguhan, lihat Batasan)
- [x] **Hapus akun → confirm 2x → akun + data hilang via cascade, tanpa hapus manual per tabel.** (statis: `admin.deleteUser` + `on delete cascade` di skema; PRODUKSI butuh `SUPABASE_SERVICE_ROLE_KEY` terpasang di Vercel — lihat Batasan)
- [x] **Bottom nav 7 menu termasuk Komoditas; Pengaturan hanya via MenuGrid.** (statis: NAV + grid-cols-7; `min-h-[65px]` tetap)
- [x] **`NotifButton`/`LogoutButton`/outbox tidak berubah.** (statis: tidak ada diff di file-file itu; reuse murni)
- [x] **Build + lint + tsc bersih:** 16 route (15 lama + `/pengaturan`), `ƒ Proxy (Middleware)`, 0/0 lint, tsc bersih

---

## 4. Batasan / diketahui

- Verifikasi kriteria di atas dilakukan statis (kode + build + lint + tsc). **Uji sesungguhnya butuh login Supabase + browser dan TIDAK bisa dari sesi ini:** (a) buka `/pengaturan` → cek email/blok; (b) unduh CSV → buka di Excel; (c) airplane → catat → `/pengaturan` → hapus antrean → badge 0; (d) hapus akun (pakai akun uji, JANGAN akun utama).
- **Hapus akun butuh `SUPABASE_SERVICE_ROLE_KEY` di environment.** Lokal (`.env.local` mesin ini) tidak ada key itu → Server Action mengembalikan pesan ramah, akun tidak terhapus. Di Vercel produksi key ini sudah dipakai route `/api/push/kirim`, jadi hapus akun jalan di produksi selama env yang sama terpasang. Tanpa key: hapus manual via dashboard Supabase (Authentication → user → Delete).
- Insiden lingkungan: tidak ada. Tanpa install dep (`NODE_ENV=production` tidak berpengaruh); `tsc` langsung via `node node_modules/typescript/bin/tsc --noEmit`, build/lint dengan env standar.
