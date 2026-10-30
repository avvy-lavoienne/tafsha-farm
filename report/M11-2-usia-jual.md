# Laporan M11.2 — Usia Jual Berbasis HST (Tanaman Mendekati Berbuah)

**Tanggal:** 30 Okt 2026
**Branch:** `dev`
**Acuan:** `report/M11-audit-codebase.md`, `report/M11-1-laporan-implementasi.md`
**Verifikasi:** `npm test` (14/14) · `npx tsc --noEmit` bersih · `npx eslint .` bersih · `npm run build` sukses (20 rute) · smoke test `/api/publik/bibit` 200 dengan data nyata

---

## 1. Latar

Model lama menandai "siap jual" dari **umur sejak semai** (`commodities.umur_siap_min`, 20–50 hari). Itu menjawab pertanyaan "kapan bibit siap dipindah tanam", bukan pertanyaan pembeli.

Target pasar yang sebenarnya: **urban farmer yang ingin tanaman sudah mendekati masa berbunga/berbuah**, tinggal dirawat sebentar lalu panen. Untuk itu kesiapan jual harus diukur dari **HST (hari sejak tanam) menuju masa panen**, bukan dari semai.

## 2. Model Baru

```
usia jual (HST) = umur_jual_min komoditas
                  └─ bila kosong: umur_panen_min − 15
fase:
  belum-diatur  → tidak ada umur panen/jual
  tumbuh        → HST < usia jual − 7
  hampir        → 7 HST terakhir sebelum usia jual
  siap          → usia jual ≤ HST ≤ usia jual maks
  lewat         → HST > usia jual maks
```

- `umur_jual_min/maks` = usia tanaman saat layak dijual (HST), dapat diatur per komoditas.
- `stok_siap` tetap berarti **jumlah yang sudah dipisahkan** untuk dijual. Jadi ada dua hal berbeda dan keduanya tampil: "sudah masuk usia jual" (otomatis dari umur) dan "stok siap" (aksi pemilik lewat tombol *Siap jual*).
- Batch `tujuan='kebun'` tidak masuk etalase; di landing hanya tampil sebagai estimasi panen di tabel.

## 3. Perubahan

### 3.1 Skema — `supabase/migrations/0010_usia_jual_hst.sql` (baru)

| Bagian | Isi |
|---|---|
| Kolom | `commodities.umur_jual_min`, `umur_jual_maks` (integer, HST) |
| Backfill fokus jual | Cabai 60–75, Tomat 45–60, Daun Bawang 45–70, Seledri 45–70, Bawang Merah 45–60, Terong 45–58, Strawberry 75–100, Mint 20–45 |
| Backfill lain | `jual_bibit = true` tanpa angka → 15 HST sebelum panen |
| Konsistensi | `umur_jual_maks` dinaikkan bila lebih kecil dari `min` |
| Seed | `seed_tafsha_farm()` di-`create or replace`: akun baru langsung dapat usia jual HST |
| Verifikasi | Query akhir: semua komoditas jual punya usia jual + `maks_valid` |

Kolom lama `umur_siap_min/maks` dibiarkan (tidak dipakai lagi) agar data historis tidak hilang.

### 3.2 Logika — `web/src/lib/jual.ts` (baru, murni tanpa impor)

`targetJual()`, `statusJual()`, `badgeJual()` + konstanta `JENDELA_HAMPIR_HARI = 7` dan `SELISIH_JUAL_DARI_PANEN = 15`.
Diuji di `web/src/lib/jual.test.mjs` (7 kasus: fallback, tumbuh, hampir, siap, lewat, maks < min, belum diatur).

### 3.3 Permukaan yang diubah

| File | Perubahan |
|---|---|
| `app/api/publik/bibit/route.ts` | Target jual = `umur_jual_*` (fallback 15 HST sebelum panen). Batch kebun → target panen. Respons baru: `jenisTarget`, `targetMin/Maks`, `fase`, `estimasi`, `sisaHari`, plus `semua` (tabel landing). Fallback query bila 0010 belum jalan. |
| `app/bibit/page.tsx` | Judul & copy jadi "Tanaman siap jual". Kartu: pcs stok siap, nilai stok, **pcs sudah masuk usia jual**. Badge per batch mengikuti fase. |
| `app/batch/page.tsx` | Badge & filter "Siap panen" memakai usia jual untuk batch jual, umur panen untuk batch kebun. |
| `app/page.tsx` | Kartu "Isi kebun": badge "Siap jual"/"±N hari lagi" vs "Siap panen". Stat "Siap panen" tidak lagi menghitung batch jual. |
| `app/kebun/page.tsx` + `KebunManager.tsx` | Badge per batch: "Siap jual" atau "Siap panen". |
| `app/komoditas/page.tsx`, `KomoditasManager.tsx` | Input "Siap min/maks (hari semai)" → **"Usia jual min/maks (HST)"** dengan bantuan konteks; simpan ke `umur_jual_*`. |
| `components/BatchForm.tsx` | Opsi tujuan: "🌱 Jual tanaman (mendekati berbuah)"; teks "1 polybag = 1 pcs tanaman". |
| `components/BottomNav.tsx`, `SeedButton.tsx` | Label menu "Jual" dan copy seed "8 tanaman jual". |
| `public/landing.html` | Tabel memakai `fase`/`targetMin`/`jenisTarget`; kartu estimasi pakai fase hampir; FAQ "Kapan tanaman dianggap siap jual?"; copy HST diperbarui. XSS-escape tetap berlaku. |

## 4. Kompatibilitas

- **0010 belum dijalankan:** API & halaman jatuh ke fallback (usia jual = 15 HST sebelum panen). Tidak ada error. Terverifikasi di lokal: respons `200` dengan `targetMin` 60 (Terong) dan 40 (Timun) dari `umur_panen_min`.
- **0007 belum dijalankan:** `/bibit` tetap menampilkan instruksi migrasi (perilaku lama).
- Landing tetap menerima bentuk lama karena memakai `d.semua` dengan fallback `siap.concat(estimasi)`.

## 5. Langkah Manual

1. Jalankan `supabase/migrations/0010_usia_jual_hst.sql` di SQL Editor (setelah 0009).
2. Sesuaikan angka usia jual per komoditas di `/komoditas` bila default kurang pas.
3. Batch lama yang ingin dijual harus diubah `tujuan` → "Jual tanaman" lewat **Edit batch**. Saat ini 2 batch aktif (Terong, Timun) masih `tujuan = kebun`, jadi belum muncul di etalase.

## 6. Catatan & Sisa

- Copy besar landing (H1 "Bibit sayur punya umur", `<title>`) belum diubah — itu keputusan branding. Bisa digeser ke narasi "tanaman siap berbuah" bila diinginkan.
- `stok_siap` masih harus dipisahkan manual lewat tracker; usia jual hanya menandai kelayakan. Bisa diotomatiskan (mis. saat batch mencapai usia jual, isi `stok_siap` default = `jumlah_hidup`) bila diinginkan.
- Rekomendasi audit lain yang belum dikerjakan tetap seperti di M11.1 §5 (offline-read, laporan penjualan, dsb).
