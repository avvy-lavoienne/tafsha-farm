import { createClient } from "@/lib/supabase/server";
import KomoditasManager from "@/components/KomoditasManager";

export default async function KomoditasPage() {
  const supabase = await createClient();

  // Coba kolom bibit (migrasi 0007); fallback ke kolom lama bila DB belum update.
  const baru = await supabase
    .from("commodities")
    .select(
      "id,nama,tipe_panen,umur_panen_min,umur_panen_maks,siram_default,catatan,aktif,jual_bibit,harga_pcs,umur_siap_min,umur_siap_maks",
    )
    .order("nama");
  let data: never[] = (baru.data ?? []) as never[];
  if (baru.error) {
    const lama = await supabase
      .from("commodities")
      .select(
        "id,nama,tipe_panen,umur_panen_min,umur_panen_maks,siram_default,catatan,aktif",
      )
      .order("nama");
    data = ((lama.data ?? []) as never[]);
  }

  return <KomoditasManager awal={(data ?? []) as never} />;
}
