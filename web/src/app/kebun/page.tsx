import { createClient } from "@/lib/supabase/server";
import KebunManager from "@/components/KebunManager";
import { hitungHST } from "@/lib/tanggal";

export default async function KebunPage() {
  const supabase = await createClient();

  const [lokasiRes, blokRes, batchRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id,kode,nama,deskripsi,aktif")
      .order("nama"),
    supabase.from("sub_blocks").select("id,location_id,nama").order("nama"),
    supabase
      .from("plant_batches")
      .select("id,location_id,tgl_tanam,status,commodities(umur_panen_min)")
      .not("status", "in", "(selesai,gagal)"),
  ]);

  const lokasi = lokasiRes.data ?? [];
  const semuaBlok = blokRes.data ?? [];
  const batchAktif = batchRes.data ?? [];

  const awal = lokasi.map((l) => {
    const milik = batchAktif.filter((b) => b.location_id === l.id);
    let siap = 0;
    for (const b of milik) {
      const min = Array.isArray(b.commodities)
        ? b.commodities[0]?.umur_panen_min
        : (b.commodities as { umur_panen_min: number | null } | null)
            ?.umur_panen_min;
      if (min != null && hitungHST(b.tgl_tanam) >= min) siap++;
    }
    return {
      id: l.id,
      kode: l.kode,
      nama: l.nama,
      deskripsi: l.deskripsi,
      aktif: l.aktif,
      subBlok: semuaBlok.filter((s) => s.location_id === l.id),
      batchAktif: milik.length,
      siapPanen: siap,
    };
  });

  return <KebunManager awal={awal} />;
}
