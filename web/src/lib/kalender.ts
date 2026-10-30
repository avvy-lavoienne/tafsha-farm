// Kalender tanam M7 — fungsi murni, tanpa Supabase.
// Semua tanggal string ISO YYYY-MM-DD agar perbandingan leksikal valid.
import { tambahHariISO } from "@/lib/tanggal";

export type JenisEvent = "semai" | "tanam" | "pindah" | "estimasi" | "panen";

export type EventKalender = {
  tanggal: string;
  jenis: JenisEvent;
  batchId: string;
  komoditas: string;
  lokasi: string;
  label: string;
  selesai?: boolean;
  rentang?: boolean;
};

export type BatchKalender = {
  id: string;
  komoditas: string;
  lokasi: string;
  jumlah: number;
  tgl_semai: string | null;
  tgl_tanam: string;
  status: string;
  umur_min: number | null;
  umur_maks: number | null;
  pindah: { due_date: string; status: string }[];
  panen: { tanggal: string }[];
};

export const META_JENIS: Record<JenisEvent, { ikon: string; nama: string }> = {
  semai: { ikon: "🌱", nama: "Semai" },
  tanam: { ikon: "➕", nama: "Tanam" },
  pindah: { ikon: "🪴", nama: "Pindah tanam" },
  estimasi: { ikon: "🧺", nama: "Estimasi panen" },
  panen: { ikon: "✅", nama: "Panen" },
};

// Bangun semua event untuk daftar batch. Batas rentang estimasi 62 hari
// per batch agar Talas (180-240) tidak meledakkan payload.
export function bangunEventKalender(batches: BatchKalender[]): EventKalender[] {
  const keluar: EventKalender[] = [];
  for (const b of batches) {
    const tutup = b.status === "selesai" || b.status === "gagal";
    if (b.tgl_semai) {
      keluar.push({
        tanggal: b.tgl_semai,
        jenis: "semai",
        batchId: b.id,
        komoditas: b.komoditas,
        lokasi: b.lokasi,
        label: `Semai ${b.komoditas} ×${b.jumlah}`,
      });
    }
    keluar.push({
      tanggal: b.tgl_tanam,
      jenis: "tanam",
      batchId: b.id,
      komoditas: b.komoditas,
      lokasi: b.lokasi,
      label: `Tanam ${b.komoditas} ×${b.jumlah}`,
    });
    for (const p of b.pindah) {
      keluar.push({
        tanggal: p.due_date,
        jenis: "pindah",
        batchId: b.id,
        komoditas: b.komoditas,
        lokasi: b.lokasi,
        label: `Pindah tanam ${b.komoditas}`,
        selesai: p.status === "selesai",
      });
    }
    for (const h of b.panen) {
      keluar.push({
        tanggal: h.tanggal,
        jenis: "panen",
        batchId: b.id,
        komoditas: b.komoditas,
        lokasi: b.lokasi,
        label: `Panen ${b.komoditas}`,
      });
    }
    // Estimasi hanya untuk batch aktif + umur_min ada.
    if (!tutup && b.umur_min != null) {
      const maks = b.umur_maks ?? b.umur_min + 6;
      const panjang = Math.min(Math.max(0, maks - b.umur_min), 61);
      const panenSet = new Set(b.panen.map((h) => h.tanggal));
      for (let i = 0; i <= panjang; i++) {
        const tgl = tambahHariISO(b.tgl_tanam, b.umur_min + i);
        // Hari yang sudah ada panen aktual tidak perlu estimasi.
        if (panenSet.has(tgl)) continue;
        keluar.push({
          tanggal: tgl,
          jenis: "estimasi",
          batchId: b.id,
          komoditas: b.komoditas,
          lokasi: b.lokasi,
          label:
            i === 0
              ? `Siap panen ${b.komoditas}`
              : `Masa panen ${b.komoditas}`,
          rentang: i > 0,
        });
      }
    }
  }
  keluar.sort((a, b) =>
    a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0,
  );
  return keluar;
}

// Kelompokkan event per tanggal. Dipakai server sebelum kirim ke client.
export function kelompokPerTanggal(
  events: EventKalender[],
): Record<string, EventKalender[]> {
  const peta: Record<string, EventKalender[]> = {};
  for (const e of events) {
    (peta[e.tanggal] ??= []).push(e);
  }
  return peta;
}

// Hitung tanggal panen aktual terdekat — untuk badge "minggu ini".
export function siapDalamHari(
  events: EventKalender[],
  dariISO: string,
  hari: number,
): number {
  const sampai = tambahHariISO(dariISO, hari);
  const batch = new Set<string>();
  for (const e of events) {
    if (
      e.jenis === "estimasi" &&
      !e.rentang &&
      e.tanggal >= dariISO &&
      e.tanggal <= sampai
    ) {
      batch.add(e.batchId);
    }
  }
  return batch.size;
}

