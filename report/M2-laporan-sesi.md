# Laporan M2 — Data Inti + Tema Landing ✅ SELESAI

**Tanggal:** 26 Okt 2026
**Branch:** `dev` → push ke `origin/dev`
**Status validasi:** build `npm run build` sukses, siap deploy preview Vercel

---

## 1. Ringkasan sesi

Sesi ini mengerjakan M2-1 (Halaman Kebun) plus penyesuaian lanjutan:
tema visual landing diterapkan ke dashboard, sinkron batch↔lokasi,
ikon media & tanaman. Komitmen M2 asli (M2-2 komoditas, M2-3 sarana,
M2-4 panen sebagai halaman CRUD penuh) **belum dikerjakan** — halaman
tersebut masih placeholder karena prioritas dialihkan ke tema +
sinkronisasi + persiapan deploy.

## 2. Yang dibangun (per commit)

| Commit | Isi |
|---|---|
| `9f80354` | M2-1: CRUD lokasi + sub-blok dari Supabase, hitung batch aktif & siap panen, filter lokasi di `/batch` |
| `16a53ad` | Laporan M2-1 (`report/M2-1-laporan-kebun.md`) |
| `49c8522` | Klon desain landing Canva → `web/public/landing.html` (URL `/landing.html`, script internal Canva dibuang, tambah meta description, perbaiki hero) |
| `a0d6d22` | Bahasa visual landing ke dashboard: token `tf-*` di `globals.css`, font Plus Jakarta Sans + Inter, header krem sticky, BottomNav 6 menu, hero beranda, tombol pill 48px |
| `5cfe53c` | Sinkron batch↔lokasi: daftar batch aktif per kartu lokasi di `/kebun`, halaman `/batch/[id]/edit`, tombol Edit di detail (edit tidak menyentuh tugas/catatan/panen) |
| `f29cbe4` | Ikon media (🫙🧴🌱🪴) + 2 media baru: Botol 1,5L & Tray Semai + migrasi `0003_media_botol_tray.sql` |
| `1923b58` | Ikon tanaman per komoditas (🌶️🥒🍆🥔🍅🥬🥗💜) di form, daftar, kebun, detail, pengingat |

## 3. Keputusan desain penting

- **Paradigma tetap pengingat murni** — tanpa centang/laporan di semua halaman.
- **Nonaktifkan ≠ hapus** lokasi; sub-blok terpakai batch tidak bisa dihapus.
- Ikon = emoji terpusat di `web/src/lib/media.ts` (`ikonMedia`, `ikonKomoditas`) — bukan gambar, jadi tetap ringan & offline.
- Landing = file statis `public/landing.html` (tidak bentrok layout aplikasi).

## 4. Langkah manual yang masih perlu dilakukan (sekali saja)

1. **Supabase SQL Editor** → jalankan `supabase/migrations/0003_media_botol_tray.sql` (menambah Botol 1,5L + Tray Semai ke akun yang sudah seed; akun baru otomatis dapat via seed).
2. (Opsional) Hapus file `design.html` di root repo kalau tidak dipakai lagi — sumber Canva sudah diklon ke `web/public/landing.html`.

## 5. Persiapan deploy Vercel

Lihat `report/DEPLOY-vercel.md` — berisi checklist env, root directory,
langkah import, dan verifikasi pasca-deploy.

## 6. Sisa M2 (ditunda, masuk backlog)

- M2-2 halaman Komoditas (CRUD + aktif/rencana)
- M2-3 halaman Sarana (stok media + benih/pupuk + beli/pakai)
- M2-4 halaman Panen (riwayat + rekap bulanan + grafik)
- Rapikan warning `middleware` deprecated Next 16 → `proxy.ts`
