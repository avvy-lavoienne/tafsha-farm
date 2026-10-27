# Laporan M3 — Cuaca Realtime + Foto Berkala + Galeri Live ✅ SELESAI

**Tanggal:** 27 Okt 2026
**Branch:** `dev`
**Build:** `npm run build` sukses (Next.js 16.4.3)

---

## 1. Yang dibangun

### A. Cuaca realtime Pakuwon (baru)
| Area | Hasil |
|---|---|
| Sumber data | Open-Meteo, gratis tanpa API key |
| Titik | Desa Pakuwon, Cisurupan, Garut (`-7.284, 107.768`), tersimpan di `web/src/lib/cuaca.ts` |
| Beranda (`/`) | Kartu cuaca: suhu, kondisi, kelembapan, peluang hujan + saran siram |
| Tugas (`/tugas`) | Banner cuaca: "Hujan → siram bisa dilewati" / "Tidak hujan → lanjutkan siram" |
| Cache | `next: { revalidate: 1800 }` (30 menit), hemat limit API |
| Offline | Gagal fetch → pesan ramah, jadwal siram tetap jalan |

**File baru:** `web/src/lib/cuaca.ts`, `web/src/components/CuacaCard.tsx`
**File ubah:** `web/src/app/page.tsx`, `web/src/app/tugas/page.tsx`

### B. Upload foto berkala (baru)
| Level | Lokasi tombol |
|---|---|
| Lokasi utama | `/kebun` — thumbnail + tombol "Foto lokasi" per kartu |
| Sub-blok | `/kebun` — thumbnail kecil + tombol "Foto" per baris sub-blok |
| Batch | `/batch/[id]` — seksi "Foto progres" (foto utama + 5 riwayat) |

| Aturan | Nilai |
|---|---|
| Kamera HP | Tombol 📷 buka kamera belakang (`capture="environment"`), tombol 🖼️ pilih dari galeri |
| Kompres otomatis | Di HP sebelum upload: terima s/d 15MB → adaptif 1280px→800px sampai **≤500KB** (sesuai PRD) |
| Orientasi | EXIF `from-image` — foto portrait tidak miring |
| Feedback | Tahap "Mengompres..." → "Mengunggah...", pesan akhir `4,0MB → 320KB` |
| Riwayat | Tiap upload = 1 baris `kebun_foto`; foto terbaru jadi `foto_url` utama subjek |
| Galeri landing | Semua foto otomatis masuk galeri live |

**File baru:** `web/src/components/UnggahFoto.tsx`, `web/src/components/RiwayatFoto.tsx`
**File ubah:** `web/src/components/KebunManager.tsx`, `web/src/app/kebun/page.tsx`, `web/src/app/batch/[id]/page.tsx`

### C. Galeri live di landing (baru)
- `#galeri`: blok "Galeri live" di atas foto ilustrasi, narik 8 foto terbaru dari `/api/galeri`
- Label per foto: 📍 Lokasi / 🧱 Sub-blok / 🌱 Batch + tanggal
- Kosong → pesan ajakan upload; gagal fetch → ilustrasi lama tetap tampil
- Endpoint `GET /api/galeri`: publik tanpa login, `revalidate` 600 detik

**File baru:** `web/src/app/api/galeri/route.ts`
**File ubah:** `web/public/landing.html`

### D. Migrasi database (manual sekali)
- `supabase/migrations/0004_foto_galeri.sql`:
  - kolom `sub_blocks.foto_url`, `plant_batches.foto_url` (`locations.foto_url` sudah ada)
  - tabel `kebun_foto` + index + RLS (tulis milik sendiri, baca publik untuk galeri)
  - bucket `kebun-foto` publik + policy storage (baca publik, tulis login)

---

## 2. Langkah manual (sekali saja)

1. **Supabase SQL Editor** → jalankan `supabase/migrations/0004_foto_galeri.sql`
2. Verifikasi: tab Storage muncul bucket `kebun-foto` (Public ✅)
3. Uji di HP: `/kebun` → Foto lokasi → jepret → muncul `xMB → xxxKB` → cek landing `#galeri`

## 3. Diketahui / batasan

- Foto HEIC (iPhone mode hemat) tidak bisa didecode browser → pesan suruh pakai JPG; konversi HEIC masuk backlog.
- Endpoint galeri baca `kebun_foto` publik — sengaja agar landing tamu bisa tampil; tulis tetap terkunci per-user via RLS.
- `middleware.ts` deprecated di Next 16 (warning saja) — rapikan ke `proxy.ts` bareng upgrade berikutnya.
- Koordinat cuaca masih konstanta di `cuaca.ts`; kalau mau presisi per lokasi, pindahkan ke `locations.lat/lng`.

---

# What To Do Next — M4: Offline tulis + notifikasi push

- [ ] Antrean offline untuk logbook/panen (service worker + sync saat online)
- [ ] Notifikasi push pengingat pagi
- [ ] Rapikan `middleware` → `proxy.ts`
- [ ] Uji HP di kebun (catat siram + 1 foto < 30 detik)
