import { createClient } from "@/lib/supabase/server";
import KebunManager from "@/components/KebunManager";
import { hitungHST } from "@/lib/tanggal";
import { statusJual } from "@/lib/jual";

export default async function KebunPage() {
  const supabase = await createClient();

  const [lokasiRes, blokRes, batchRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id,kode,nama,deskripsi,foto_url,aktif")
      .order("nama"),
    supabase.from("sub_blocks").select("id,location_id,nama,foto_url").order("nama"),
    supabase
      .from("plant_batches")
      .select("*,commodities(*),sub_blocks(nama),media_types(nama)")
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
            umur_panen_maks: number | null;
            umur_jual_min: number | null;
            umur_jual_maks: number | null;
          } | null);
      const blok = Array.isArray(b.sub_blocks)
        ? b.sub_blocks[0]
        : (b.sub_blocks as { nama: string | null } | null);
      const media = Array.isArray(b.media_types)
        ? b.media_types[0]
        : (b.media_types as { nama: string | null } | null);
      const hst = hitungHST(b.tgl_tanam);
      const jual = (b.tujuan as string | null) === "jual";
      const status = statusJual({
        hst,
        umurJualMin: jual ? kom?.umur_jual_min : kom?.umur_panen_min,
        umurJualMaks: jual ? kom?.umur_jual_maks : kom?.umur_panen_maks,
        umurPanenMin: kom?.umur_panen_min,
        umurPanenMaks: kom?.umur_panen_maks,
      });
      const siap = jual
        ? status.fase === "siap" || status.fase === "lewat"
        : kom?.umur_panen_min != null && hst >= kom.umur_panen_min;
      return {
        id: b.id,
        komoditas: kom?.nama ?? "?",
        media: media?.nama ?? "-",
        subBlok: blok?.nama ?? null,
        jumlah: b.jumlah,
        hst,
        siap,
        badge: siap ? (jual ? "Siap jual" : "Siap panen") : null,
      };
    });
    let siap = 0;
    for (const b of batch) if (b.siap) siap++;
    return {
      id: l.id,
      kode: l.kode,
      nama: l.nama,
      deskripsi: l.deskripsi,
      fotoUrl: l.foto_url ?? null,
      aktif: l.aktif,
      subBlok: semuaBlok
        .filter((s) => s.location_id === l.id)
        .map((s) => ({
          id: s.id,
          location_id: s.location_id,
          nama: s.nama,
          fotoUrl: s.foto_url ?? null,
        })),
      batch,
      batchAktif: batch.length,
      siapPanen: siap,
    };
  });

  return <KebunManager awal={awal} />;
}
