# Laporan Audit M6 — UI/UX, Responsivitas & Foto Full ✅ SELESAI

**Tanggal:** 29 Okt 2026
**Branch:** `dev`
**Build:** `npm run build` sukses (Next.js 16.4.3, 16 route, baris `ƒ Proxy (Middleware)` tetap ada)
**Lint:** `npm run lint` bersih — 0 error, 0 warning
**Typecheck:** `tsc --noEmit` bersih
**Dep baru:** tidak ada. **Migrasi SQL:** tidak ada.

---

## 1. Ringkasan audit (semua resolusi: phone 360px / pad 768px / desktop)

| Area | Temuan | Perbaikan |
|---|---|---|
| Bottom nav 7 item | Label "Komoditas" meluber di HP 360px | FAB bulat ☰ + bottom sheet 8 menu di HP/pad (`<lg`), bar penuh 8 kolom di desktop; Escape menutup, fokus kembali ke FAB, scroll badan dikunci, `aria-modal` + `aria-expanded` |
| Foto utama lokasi & batch | `object-cover` crop foto portrait | Wadah `.tf-foto-full` (`aspect 4/3` + `contain`, backdrop gelap) + klik ke full; thumbnail kotak tetap `cover` |
| Form 2–3 kolom | Terjepit di HP kecil | 1 kolom → 2/3 kolom mulai 420px (`min-[420px]:`) |
| Baris tombol horizontal | Berdesakan di HP | `flex-wrap` + label `break-words` + chip `shrink-0` |
| Grid pad | 2 kolom mulai desktop saja | Mulai `md` (Sarana, Komoditas, beranda `md:grid-cols-2`) |
| Input di baris flex | Tombol kepotong (input tak menyusut) | `min-w-0 flex-1` di semua input sebaris |
| Target sentuh | Chip & tombol kecil < 44px | `min-height: 44px` di `.tf-chip` + `.tf-btn-kecil` |
| Reduced-motion | Animasi sheet abaikan preferensi | `animation: none` untuk sheet + spinner |
| Galeri landing | alt generik | alt berisi jenis + tanggal |

---

## 2. File yang diubah

| Aksi | Path |
|---|---|
| Ubah | `web/src/components/BottomNav.tsx` (FAB + sheet, 8 menu termasuk Pengaturan) |
| Ubah | `web/src/app/globals.css` (target sentuh, `.tf-fab-sheet`, `.tf-foto-full`) |
| Ubah | `web/src/app/layout.tsx` (konten pad `md:max-w-5xl`) |
| Ubah | `web/src/app/page.tsx` (grid pad, anti-overlap) |
| Ubah | `web/src/app/batch/page.tsx` (anti-overlap judul/status) |
| Ubah | `web/src/app/batch/[id]/page.tsx` (baris tombol wrap, thumbnail kotak `w-20`) |
| Ubah | `web/src/components/KebunManager.tsx`, `RiwayatFoto.tsx` (foto full + wrap) |
| Ubah | `web/src/components/BatchForm.tsx`, `LogForm.tsx`, `HarvestForm.tsx`, `TambahTugasForm.tsx`, `SaranaManager.tsx`, `KomoditasManager.tsx` (form HP + grid pad) |
| Ubah | `web/src/components/BatchStatusButtons.tsx`, `TugasCard.tsx`, `UnggahFoto.tsx`, `NotifButton.tsx`, `PengaturanClient.tsx` (wrap + target sentuh) |
| Ubah | `web/public/landing.html` (alt galeri live berinfo) |

---

## 3. Cara uji di HP/pad

- [ ] 360px: buka tiap halaman → tidak ada teks/tombol tumpang tindih; FAB ☰ kanan-bawah → sheet 8 menu terbuka, Escape/masker menutup
- [ ] Foto portrait lokasi/batch → tampil utuh (letterbox gelap wajar), ketuk → tab full
- [ ] Pad portrait: beranda 2 kolom; Sarana/Komoditas 2 kolom
- [ ] Keyboard: Tab dari FAB → fokus masuk sheet; Escape → fokus kembali ke FAB

---

## 4. Batasan / diketahui

- Uji di atas statis (tsc + lint + build) + inspeksi kode; uji sentuh sungguhan butuh HP/pad + login Supabase.
- `.tf-foto-full` letterbox gelap untuk foto portrait — disengaja agar tidak ada piksel terpotong.
- FAB hanya `<lg`; tablet landscape ≥1024px (iPad) pakai bar desktop penuh — disengaja karena ruang cukup.
