import { createClient as buatAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hariIniISO, selisihHari, tambahHariISO } from "@/lib/tanggal";
import { statusJual } from "@/lib/jual";

// Etalase publik anonim untuk landing marketing.
//
// Produk yang dijual: TANAMAN yang mendekati masa berbunga/berbuah (HST sejak
// tanam), bukan bibit semai. Karena itu usia siap jual dihitung dari
// commodities.umur_jual_min/maks (HST); bila kosong dipakai 15 HST sebelum
// umur panen. Batch kebun tetap tampil di tabel sebagai "target panen".
//
// Tanpa id/nama user/lokasi/batch. Cache 2 menit (stok jualan berubah cepat).
export const revalidate = 120;

type Kom = {
  nama?: string | null;
  harga_pcs?: number | null;
  umur_panen_min?: number | null;
  umur_panen_maks?: number | null;
  umur_jual_min?: number | null;
  umur_jual_maks?: number | null;
};

type Baris = {
  jumlah: number | null;
  stok_siap: number | null;
  harga_pcs: number | null;
  tgl_semai: string | null;
  tgl_tanam: string;
  status: string | null;
  tujuan: string | null;
  commodities: unknown;
};

const KOLOM =
  "jumlah,stok_siap,harga_pcs,tgl_semai,tgl_tanam,status,tujuan,commodities(nama,harga_pcs,umur_panen_min,umur_panen_maks,umur_jual_min,umur_jual_maks)";

// Fallback bila migrasi 0010 belum jalan: tanpa kolom usia jual.
const KOLOM_LAMA =
  "jumlah,stok_siap,harga_pcs,tgl_semai,tgl_tanam,status,tujuan,commodities(nama,harga_pcs,umur_panen_min,umur_panen_maks)";

const satu = (v: unknown): Kom | null =>
  Array.isArray(v) ? ((v[0] as Kom) ?? null) : ((v as Kom) ?? null);

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !kunci) return NextResponse.json({ kosong: true });
    const admin = buatAdmin(url, kunci, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const hariIni = hariIniISO();

    async function ambilBatch(): Promise<Baris[]> {
      const penuh = await admin
        .from("plant_batches")
        .select(KOLOM)
        .not("status", "in", "(selesai,gagal)")
        .limit(500);
      if (!penuh.error) return (penuh.data ?? []) as Baris[];
      const lama = await admin
        .from("plant_batches")
        .select(KOLOM_LAMA)
        .not("status", "in", "(selesai,gagal)")
        .limit(500);
      if (lama.error) throw lama.error;
      return (lama.data ?? []) as Baris[];
    }

    const data = await ambilBatch();

    const perKom = new Map<
      string,
      { siap: number; total: number; harga: number | null; batch: number }
    >();
    const batch: {
      nama: string;
      jumlah: number;
      siap: number;
      harga: number | null;
      hst: number;
      tgl_tanam: string;
      jenisTarget: "jual" | "panen";
      targetMin: number | null;
      targetMaks: number | null;
      fase: string;
      sudahSiap: boolean;
      lewatUmur: boolean;
      estimasi: string | null;
      sisaHari: number | null;
    }[] = [];

    for (const b of data) {
      const kom = satu(b.commodities);
      const nama = kom?.nama ?? "?";
      const siap = Number(b.stok_siap ?? 0);
      const jumlah = Number(b.jumlah ?? 0);
      const harga =
        b.harga_pcs != null
          ? Number(b.harga_pcs)
          : kom?.harga_pcs != null
            ? Number(kom.harga_pcs)
            : null;
      const hst = Math.max(0, selisihHari(b.tgl_tanam, hariIni));
      const jual = b.tujuan === "jual";

      // Batch jual → target usia jual (mendekati berbunga/berbuah).
      // Batch kebun → target masa panen, ditampilkan sebagai estimasi panen.
      const status = jual
        ? statusJual({
            hst,
            umurJualMin: kom?.umur_jual_min,
            umurJualMaks: kom?.umur_jual_maks,
            umurPanenMin: kom?.umur_panen_min,
            umurPanenMaks: kom?.umur_panen_maks,
          })
        : statusJual({
            hst,
            umurJualMin: kom?.umur_panen_min,
            umurJualMaks: kom?.umur_panen_maks,
          });

      batch.push({
        nama,
        jumlah,
        siap,
        harga,
        hst,
        tgl_tanam: b.tgl_tanam,
        jenisTarget: jual ? "jual" : "panen",
        targetMin: status.targetMin,
        targetMaks: status.targetMaks,
        fase: status.fase,
        sudahSiap: siap > 0,
        lewatUmur: status.fase === "lewat",
        estimasi:
          status.targetMin == null
            ? null
            : tambahHariISO(b.tgl_tanam, status.targetMin),
        sisaHari: status.sisaHari,
      });

      // Katalog etalase hanya dari batch yang memang dijual.
      if (!jual) continue;
      const s = perKom.get(nama) ?? { siap: 0, total: 0, harga: null, batch: 0 };
      s.siap += siap;
      s.total += jumlah;
      s.batch += 1;
      if (harga != null && s.harga == null) s.harga = harga;
      perKom.set(nama, s);
    }

    const katalog = [...perKom.entries()].map(([nama, s]) => ({
      nama,
      siap: s.siap,
      total: s.total,
      harga: s.harga,
      batch: s.batch,
    }));
    const totalSiap = katalog.reduce((a, k) => a + k.siap, 0);
    // Estimasi terdekat: batch jual yang belum punya stok siap, urut sisa hari.
    const estimasi = batch
      .filter((b) => b.jenisTarget === "jual" && !b.sudahSiap && b.estimasi)
      .sort((a, b) => (a.sisaHari ?? 99) - (b.sisaHari ?? 99))
      .slice(0, 6);
    const siapList = batch
      .filter((b) => b.sudahSiap)
      .sort((a, b) => b.siap - a.siap)
      .slice(0, 12);

    return NextResponse.json({
      hariIni,
      totalSiap,
      totalBatch: batch.length,
      katalog,
      siap: siapList,
      estimasi,
      // Semua batch aktif untuk tabel landing (termasuk batch kebun yang
      // hanya menampilkan estimasi panen, bukan barang dijual).
      semua: batch,
    });
  } catch {
    return NextResponse.json({ kosong: true });
  }
}
