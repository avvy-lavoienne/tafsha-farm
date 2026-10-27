import { createClient } from "@/lib/supabase/server";
import SaranaManager from "@/components/SaranaManager";

export default async function SaranaPage() {
  const supabase = await createClient();

  const [mediaRes, stokRes, batchRes, saranaRes, gerakRes] = await Promise.all([
    supabase.from("media_types").select("id,nama,ukuran").order("nama"),
    supabase.from("media_stocks").select("media_type_id,total,rusak"),
    supabase
      .from("plant_batches")
      .select("media_type_id")
      .not("status", "in", "(selesai,gagal)"),
    supabase
      .from("supplies")
      .select("id,nama,kategori,stok,satuan,min_stok")
      .order("nama"),
    supabase
      .from("supply_moves")
      .select("id,tanggal,arah,jumlah,supply_id,supplies(nama)")
      .order("tanggal", { ascending: false })
      .limit(20),
  ]);

  const stokMap = new Map(
    (stokRes.data ?? []).map((s) => [s.media_type_id, s]),
  );
  const pakaiMap = new Map<string, number>();
  for (const b of batchRes.data ?? []) {
    const k = b.media_type_id as string | null;
    if (!k) continue;
    pakaiMap.set(k, (pakaiMap.get(k) ?? 0) + 1);
  }

  const media = (mediaRes.data ?? []).map((m) => {
    const stok = stokMap.get(m.id);
    const total = Number(stok?.total ?? 0);
    const rusak = Number(stok?.rusak ?? 0);
    const terpakaiHitung = pakaiMap.get(m.id) ?? 0;
    return {
      id: m.id,
      nama: m.nama,
      ukuran: m.ukuran,
      total,
      rusak,
      terpakaiHitung,
      batchAktif: terpakaiHitung,
    };
  });

  return (
    <SaranaManager
      media={media}
      awalSarana={(saranaRes.data ?? []).map((s) => ({
        ...s,
        stok: Number(s.stok ?? 0),
        min_stok: Number(s.min_stok ?? 0),
      }))}
      awalGerak={(gerakRes.data ?? []).map((g) => ({
        ...g,
        jumlah: Number(g.jumlah ?? 0),
      }))}
    />
  );
}
