import { createClient } from "@/lib/supabase/server";
import KomoditasManager from "@/components/KomoditasManager";

export default async function KomoditasPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("commodities")
    .select(
      "id,nama,tipe_panen,umur_panen_min,umur_panen_maks,siram_default,catatan,aktif",
    )
    .order("nama");

  return <KomoditasManager awal={data ?? []} />;
}
