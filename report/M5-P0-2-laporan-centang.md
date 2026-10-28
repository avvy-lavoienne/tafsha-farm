# Laporan M5 P0-2 — Centang Tugas → Logbook ✅ SELESAI

**Tanggal:** 28 Okt 2026
**Branch:** `dev` (di atas P0-1 `2edf561`)
**Build:** `npm run build` sukses (Next.js 16.4.3, 15 route tetap, baris `ƒ Proxy (Middleware)` tetap ada)
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `node node_modules/typescript/bin/tsc --noEmit` bersih
**Dep baru:** tidak ada. **Migrasi SQL:** tidak ada (skema `care_tasks` + `activity_logs` sudah cukup).

---

## 1. Yang dibangun

### A. `web/src/components/TugasCard.tsx` — ubah jadi `"use client"` + 3 tombol kecil
Struktur baca lama dipertahankan (ikon, `kapan`, badge terlewat), ditambah state `aksi/pesan` + `MiniSpin` + kelas `tf-btn-kecil`:
- ✅ **Selesai:** `update care_tasks set status='selesai', selesai_at=now()` → `insert activity_logs {user_id, batch_id, jenis sama, deskripsi: "Selesai via pengingat (LabelJenis)"}`. Gagal jaringan (reuse `apakahJaringanGagal` dari `@/lib/outbox`, pola sama seperti `TambahTugasForm` M4-2) → fallback `tambahAntrean("activity_log", ...)` + pesan `📴 tersimpan offline, menunggu sinkron: N`, lalu `saatBerubah?.()`. Catatan sinkron: `kirimSatu` outbox M4-2 sudah menangani tipe `activity_log`, jadi antrean tersinkron otomatis tanpa ubah outbox.
- ⏭ **Lewati:** `update status='lewat'`. Nilai `lewat` aman: tidak ada query yang memfilter status tugas (`/tugas` + beranda hanya `eq due_date`; `.not("status"...)` hanya untuk `plant_batches` di file lain).
- ⏰ **Besok:** `update due_date = due_date + 1 hari` (dihitung di JS dari `due_date` saat ini, format `YYYY-MM-DD`).
- Tugas `selesai` tampil dicoret (`line-through` + `opacity-60` + badge `✅`); `lewat` tampil redup; tombol disembunyikan untuk keduanya; tombol disabled saat sibuk; pesan error ramah Indonesia. Offline untuk Lewati/Besok → pesan `📴 sedang offline, coba lagi saat online ya 📶` (status/duedate task tidak masuk antrean karena `kirimSatu` hanya insert `care_task` baru, bukan update).
- `getUser()` dibungkus toleran-offline seperti `TambahTugasForm` (gagal jaringan → `user_id null`, diganti user asli saat sinkron).

### B. `web/src/components/DaftarTugas.tsx` — baru, wrapper client kecil
`TugasCard` butuh `router.refresh()` (client) sedangkan `/tugas` dan `batch/[id]` adalah server component. Agar tidak mengubah halaman jadi client, daftar tugas dibungkus komponen ini (`useRouter` → `saatBerubah={() => router.refresh()}`).

### C. `web/src/components/BatchForm.tsx` + `web/src/app/batch/baru/page.tsx` — generate 2x/hari
- `Opsi` tambah `siram_default?: string | null`; query komoditas di `batch/baru` tambah `siram_default`. (Halaman edit tidak perlu — mode edit tidak generate tugas.)
- Aturan: `siram_default` mengandung `2x` (case-insensitive) → 2 baris `siram` per hari × 30 hari; selain itu 1 baris/hari seperti sebelumnya. Komentar di kode menjelaskan teks bebas (`1x pagi`, `suka lembap`) tidak bisa diparse presisi — hanya `2x` yang dispesialkan; skema `care_tasks` tanpa kolom waktu/deskripsi jadi pembeda pagi/sore hanya jumlah baris. Seed bawaan yang kena: Kangkung, Bayam, Selada (`2x ...`).

### D. `web/src/app/tugas/page.tsx` + `batch/[id]/page.tsx` — tampil + refresh
- `/tugas`: teks "Dibaca saja..." → "Centang kalau sudah selesai ✅"; daftar lokasi pakai `DaftarTugas` (centang → `router.refresh()`).
- `batch/[id]`: import `TugasCard` → `DaftarTugas`; teks pengingat → "Centang kalau sudah dikerjakan — tercatat ke logbook ✅". Query `status` sudah ada, jadi tugas selesai hari ini tampil dicoret.

### E. `web/src/app/page.tsx` — kartu "Pengingat hari ini" pecah belum/selesai
Query tugas tambah `status` (reuse query yang sama, tanpa query baru): `tugasSelesai`/`tugasBelum` dihitung dari hasil yang ada; teks kartu → `x belum • y selesai — centang di halaman tugas ✅`. (StatCard angka total tidak diubah.)

---

## 2. File yang diubah/dibuat

| Aksi | Path |
|---|---|
| Ubah | `web/src/components/TugasCard.tsx`, `web/src/components/BatchForm.tsx`, `web/src/app/batch/baru/page.tsx`, `web/src/app/tugas/page.tsx`, `web/src/app/page.tsx`, halaman `web/src/app/batch/[id]/page.tsx` (via skrip patch sementara, sudah dihapus) |
| Baru | `web/src/components/DaftarTugas.tsx`, `report/M5-P0-2-laporan-centang.md` |
| Tidak disentuh | `NotifButton.tsx`/push P0-1, `outbox.ts`, `MiniSpin`, logika M4-1/M4-2 lain, `globals.css`, migrasi, `package.json` |

---

## 3. Kriteria cek P0-2

- [x] **Klik ✅ di `/tugas` → tugas dicoret + muncul di timeline/logbook batch; refresh → tetap selesai.** (statis: update `selesai`+`selesai_at` lalu insert `activity_logs` dengan `jenis` sama; `batch/[id]` menampilkan `activity_logs` — uji klik butuh login + DB, lihat Batasan)
- [x] **⏭ Lewati → hilang dari pola "belum" beranda; ⏰ Besok → pindah ke besok.** (statis: `status='lewat'` / `due_date+1`; uji klik butuh login, lihat Batasan)
- [x] **Airplane + ✅ → pesan offline + antrean outbox; online → badge naik lalu 0, logbook muncul.** (statis: pola `navigator.onLine`/`apakahJaringanGagal` → `tambahAntrean("activity_log")` sama seperti M4-2, `kirimSatu` sudah sinkron tipe itu; uji E2E butuh perangkat + mode pesawat, lihat Batasan)
- [x] **Batch baru komoditas `2x` → 2 tugas siram/hari; selain itu 1/hari.** (statis: logika `includes("2x")` + 30 hari; seed Kangkung/Bayam/Selada mengandung `2x`; uji simpan butuh login, lihat Batasan)
- [x] **Beranda tampil `x belum / y selesai`.** (statis: hitung dari query yang sama + `status`)
- [x] **Build + lint + tsc bersih:** 15 route, `ƒ Proxy (Middleware)`, 0/0 lint, tsc bersih

---

## 4. Batasan / diketahui

- Verifikasi kriteria di atas dilakukan statis (kode + build + lint + tsc). **Uji sesungguhnya butuh login Supabase + browser dan TIDAK bisa dari sesi ini:** (a) klik ✅/⏭/⏰ dari `/tugas`; (b) cek logbook di `batch/[id]`; (c) airplane-mode → badge antrean → online → sinkron; (d) buat batch Kangkung → hitung 60 baris siram.
- Offline hanya fallback untuk aksi **Selesai** (insert log bisa antre). **Lewati/Besok butuh online** — disengaja karena worker sinkron M4-2 hanya insert baris baru, tidak update status/duedate tugas yang sudah ada.
- Update status tugas tidak mengubah `plant_batches.status` — sengaja, status batch (tumbuh/panen/selesai/gagal) tetap lewat `BatchStatusButtons`.
- Insiden lingkungan: tidak ada. `NODE_ENV=production` ter-set di mesin ini tapi tidak ada install dep (tanpa dep baru), jadi tidak memangkas apa pun; `tsc` dijalankan langsung via `node node_modules/typescript/bin/tsc --noEmit` sesuai aturan P0-2.
