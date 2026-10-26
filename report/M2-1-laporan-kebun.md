# Laporan M2-1 — Halaman Kebun ✅ SELESAI

**Tanggal:** 26 Okt 2026
**Branch:** `dev` → push ke `origin/dev`
**Commit:** M2-1 Halaman Kebun: CRUD lokasi + sub-blok dari Supabase (`9f80354`)
**Build:** `npm run build` sukses (Next.js 16.4.3, warning `middleware` deprecated — bawaan M1, belum dirapikan)

---

## 1. Yang dibangun

| Area | Hasil |
|---|---|
| `/kebun` | Tidak lagi placeholder — tampilkan lokasi + sub-blok asli dari Supabase |
| Lokasi | Tambah (kode + nama + deskripsi), edit nama/deskripsi, nonaktifkan/aktifkan lagi |
| Sub-blok | Tambah, edit nama, hapus (dengan pengaman, lihat bawah) |
| Statistik per lokasi | Batch aktif & siap panen (HST ≥ umur_panen_min), dihitung server-side |
| `/batch` | Tambah filter per lokasi + tombol "Lihat batch →" dari tiap kartu lokasi |
| Form batch baru | Otomatis ikut lokasi/blok baru (sudah query lokasi aktif — tanpa perubahan kode) |

**File diubah:**
- `web/src/app/kebun/page.tsx` — server component: ambil lokasi + sub-blok + batch aktif, hitung siap panen
- `web/src/components/KebunManager.tsx` — (baru) client component CRUD lokasi & sub-blok
- `web/src/app/batch/page.tsx` — filter `?lokasi=<id>` digabung dengan filter status

## 2. Keputusan desain / pengaman

- **Paradigma tetap pengingat murni** — tidak ada tombol centang/laporan di halaman ini.
- **Nonaktifkan ≠ hapus.** Lokasi nonaktif hilang dari form batch baru tapi riwayat batch tetap tersimpan. Kalau masih ada batch aktif, muncul konfirmasi dulu.
- **Sub-blok yang dipakai batch tidak bisa dihapus** — dicek via `plant_batches.sub_block_id`; ubah nama saja bila perlu. Mencegah riwayat batch jadi yatim.
- **Kode lokasi unik per user** — duplikat kode ditolak dengan pesan ramah (bukan error mentah).

## 3. Kriteria M2-1 (cek dari `M1-laporan-dan-next.md`)

- [x] Daftar 2 lokasi + sub-blok dari Supabase (Rak Galon, Deret Polybag, Blok A, Blok B ikut tampil otomatis)
- [x] Tambah / edit / nonaktifkan lokasi + sub-blok
- [x] Hitung per lokasi: batch aktif, siap panen
- [x] Kriteria: tambah "Blok C" di Mushola → langsung muncul di form batch baru (form baca `sub_blocks` live, tanpa cache)

## 4. Diketahui / batasan

- `middleware.ts` deprecated di Next 16 (warning saat build) — warisan M1, dirapikan nanti bareng upgrade.
- Foto lokasi (`foto_url`, kolom sudah ada di skema) belum dipakai — masuk M3/M4 bareng foto batch.
- Belum ada hapus lokasi permanen (sengaja — nonaktifkan sudah cukup + aman).

---

# What To Do Next — M2-2: Halaman Komoditas (`/komoditas`)

- [ ] Daftar 9 komoditas + umur panen + siram default (data asli dari Supabase)
- [ ] Tambah / edit komoditas (untuk lavender & selada saat mulai ditanam)
- [ ] Tandai aktif / rencana
- Kriteria: ubah siram tomat → batch tomat baru ikut aturan baru

**Urutan:** M2-2 → M2-3 (Sarana) → M2-4 (Panen). Setelah M2 beres → M3 (polish batch) → M4 (offline tulis + notifikasi push) → deploy Vercel `main`.
