import { createClient as buatAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Katalog bibit publik anonim: stok siap jual per pcs + harga.
// Tanpa id/nama user/lokasi/batch. Cache 5 menit.
export const revalidate = 300;

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !kunci) return NextResponse.json({ kosong: true });
    const admin = buatAdmin(url, kunci, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("plant_batches")
      .select(
        "jumlah,stok_siap,harga_pcs,tgl_tanam,commodities(nama,harga_pcs,umur_siap_min,umur_siap_maks)",
      )
      .eq("tujuan", "jual")
      .not("status", "in", "(selesai,gagal)")
      .limit(500);
    if (error) return NextResponse.json({ kosong: true });

    type Baris = {
      jumlah: number | null;
      stok_siap: number | null;
      harga_pcs: number | null;
      tgl_tanam: string;
      commodities: unknown;
    };
    const perKom = new Map<string, { siap: number; harga: number | null }>();
    for (const b of (data ?? []) as Baris[]) {
      const kom = Array.isArray(b.commodities)
        ? (b.commodities[0] as {
            nama?: string | null;
            harga_pcs?: number | null;
          } | null)
        : (b.commodities as {
            nama?: string | null;
            harga_pcs?: number | null;
          } | null);
      const nama = kom?.nama ?? "?";
      const siap = Number(b.stok_siap ?? 0);
      const harga =
        b.harga_pcs != null ? Number(b.harga_pcs) : (kom?.harga_pcs != null ? Number(kom.harga_pcs) : null);
      const s = perKom.get(nama) ?? { siap: 0, harga: null };
      s.siap += siap;
      if (harga != null && s.harga == null) s.harga = harga;
      perKom.set(nama, s);
    }
    const katalog = [...perKom.entries()].map(([nama, s]) => ({
      nama,
      siap: s.siap,
      harga: s.harga,
    }));
    const totalSiap = katalog.reduce((a, k) => a + k.siap, 0);
    return NextResponse.json({ totalSiap, katalog });
  } catch {
    return NextResponse.json({ kosong: true });
  }
}
