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
      .select(
        "id,location_id,sub_block_id,jumlah,tgl_tanam,status,commodities(nama,umur_panen_min),sub_blocks(nama),media_types(nama)",
      )
      .not("status", "in", "(selesai,gagal)")
      .order("tgl_tanam", { ascending: false }),
  ]);

  const lokasi = lokasiRes.data ?? [];
  const semuaBlok = blokRes.data ?? [];
  const batchAktif = batchRes.data ?? [];

  const awal = lokasi.map((l) => {
    const milik = batchAktif.filter((b) => b.location_id === l.id);
    const batch = milik.map((b) => {
      const kom = Array.isArray(b.commodities)
        ? b.commodities[0]
        : (b.commodities as {
            nama: string | null;
            umur_panen_min: number | null;
          } | null);
      const blok = Array.isArray(b.sub_blocks)
        ? b.sub_blocks[0]
        : (b.sub_blocks as { nama: string | null } | null);
      const media = Array.isArray(b.media_types)
        ? b.media_types[0]
        : (b.media_types as { nama: string | null } | null);
      const hst = hitungHST(b.tgl_tanam);
      return {
        id: b.id,
        komoditas: kom?.nama ?? "?",
        media: media?.nama ?? "-",
        subBlok: blok?.nama ?? null,
        jumlah: b.jumlah,
        hst,
        siap: kom?.umur_panen_min != null && hst >= kom.umur_panen_min,
      };
    });
    let siap = 0;
    for (const b of batch) if (b.siap) siap++;
    return {
      id: l.id,
      kode: l.kode,
      nama: l.nama,
      deskripsi: l.deskripsi,
      aktif: l.aktif,
      subBlok: semuaBlok.filter((s) => s.location_id === l.id),
      batch,
      batchAktif: batch.length,
      siapPanen: siap,
    };
  });

  return <KebunManager awal={awal} />;
}
