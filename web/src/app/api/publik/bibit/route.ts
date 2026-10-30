import { createClient as buatAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hariIniISO } from "@/lib/tanggal";

// Etalase bibit publik anonim untuk landing marketing:
// stok siap per pcs + harga + umur batch (HST) + estimasi siap dipasarkan.
// Semua batch aktif ikut dihitung estimasinya (termasuk batch kebun),
// karena tujuan landing adalah transparansi kapan bibit tersedia.
// Tanpa id/nama user/lokasi/batch. Cache 2 menit (stok jualan berubah cepat).
export const revalidate = 120;

function hst(tglTanam: string, hariIni: string): number {
  const a = new Date(tglTanam + "T00:00:00").getTime();
  const b = new Date(hariIni + "T00:00:00").getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

function tambahHari(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${t}`;
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !kunci) return NextResponse.json({ kosong: true });
    const admin = buatAdmin(url, kunci, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const hariIni = hariIniISO();
    const { data, error } = await admin
      .from("plant_batches")
      .select(
        "jumlah,stok_siap,harga_pcs,tgl_semai,tgl_tanam,status,tujuan,commodities(nama,harga_pcs,umur_siap_min,umur_siap_maks,umur_panen_min,umur_panen_maks)",
      )
      .not("status", "in", "(selesai,gagal)")
      .limit(500);
    if (error) return NextResponse.json({ kosong: true });

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
    type Kom = {
      nama?: string | null;
      harga_pcs?: number | null;
      umur_siap_min?: number | null;
      umur_siap_maks?: number | null;
      umur_panen_min?: number | null;
      umur_panen_maks?: number | null;
    };
    const satu = (v: unknown): Kom | null =>
      Array.isArray(v) ? ((v[0] as Kom) ?? null) : ((v as Kom) ?? null);

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
      siapMin: number | null;
      siapMaks: number | null;
      umurAcuan: number | null;
      dasarUmur: "semai" | "tanam";
      sudahSiap: boolean;
      lewatUmur: boolean;
      estimasi: string | null;
      sisaHari: number | null;
    }[] = [];

    for (const b of (data ?? []) as Baris[]) {
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
      const umurTanam = hst(b.tgl_tanam, hariIni);
      const umurSemai = b.tgl_semai
        ? hst(b.tgl_semai, hariIni)
        : umurTanam;
      // Kesiapan bibit dihitung dari tanggal semai (umur_siap_min = hari
      // sejak semai). Batch tanpa umur siap memakai umur panen dari tanam.
      const pakaiSemai = kom?.umur_siap_min != null;
      const siapMin = pakaiSemai
        ? (kom?.umur_siap_min ?? null)
        : (kom?.umur_panen_min ?? null);
      const siapMaks = pakaiSemai
        ? (kom?.umur_siap_maks ?? null)
        : (kom?.umur_panen_maks ?? null);
      const umurAcuan = pakaiSemai ? umurSemai : umurTanam;
      const tanggalAcuan =
        pakaiSemai && b.tgl_semai ? b.tgl_semai : b.tgl_tanam;
      const sudahSiap = siap > 0;
      const lewatUmur =
        siapMin != null && umurAcuan >= siapMin && !sudahSiap;
      const estimasi =
        siapMin != null && umurAcuan < siapMin
          ? tambahHari(tanggalAcuan, siapMin)
          : lewatUmur
            ? hariIni
            : null;
      batch.push({
        nama,
        jumlah,
        siap,
        harga,
        hst: umurTanam,
        tgl_tanam: b.tgl_tanam,
        siapMin,
        siapMaks,
        umurAcuan,
        dasarUmur: pakaiSemai ? "semai" : "tanam",
        sudahSiap,
        lewatUmur,
        estimasi,
        sisaHari:
          estimasi == null || siapMin == null
            ? null
            : Math.max(0, siapMin - umurAcuan),
      });
      // Katalog etalase hanya dari batch yang memang dijual.
      if (b.tujuan !== "jual") continue;
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
    // Estimasi terdekat: batch belum punya stok siap, urut sisa hari terkecil, max 6.
    const estimasi = batch
      .filter((b) => !b.sudahSiap && b.estimasi)
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
    });
  } catch {
    return NextResponse.json({ kosong: true });
  }
}
