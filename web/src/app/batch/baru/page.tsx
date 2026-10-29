import { createClient } from "@/lib/supabase/server";
import BatchForm from "@/components/BatchForm";

export default async function BatchBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const dariId = params.dari ?? "";

  const [komoditas, lokasi, subBlok, media] = await Promise.all([
    supabase.from("commodities").select("id,nama,aktif,siram_default,jual_bibit,harga_pcs").order("nama"),
    supabase.from("locations").select("id,nama").eq("aktif", true).order("nama"),
    supabase.from("sub_blocks").select("id,nama,location_id"),
    supabase.from("media_types").select("id,nama"),
  ]);

  let duplikat = null;
  if (dariId) {
    const { data: asal } = await supabase
      .from("plant_batches")
      .select(
        "commodity_id,location_id,sub_block_id,media_type_id,jumlah,tgl_semai,tgl_tanam,catatan,tujuan,stok_siap,harga_pcs,commodities(nama)",
      )
      .eq("id", dariId)
      .single();
    if (asal) {
      const nama = Array.isArray(asal.commodities)
        ? (asal.commodities[0]?.nama ?? null)
        : ((asal.commodities as { nama: string | null } | null)?.nama ?? null);
      duplikat = {
        commodity_id: asal.commodity_id as string,
        location_id: asal.location_id as string,
        sub_block_id: (asal.sub_block_id as string | null) ?? null,
        media_type_id: asal.media_type_id as string,
        jumlah: Number(asal.jumlah ?? 1),
        tgl_semai: (asal.tgl_semai as string | null) ?? null,
        catatan: (asal.catatan as string | null) ?? null,
        nama,
        tgl_tanam_asal: (asal.tgl_tanam as string | null) ?? null, tujuan: (asal as {tujuan?: string}).tujuan ?? "kebun", harga_pcs: (asal as {harga_pcs?: number}).harga_pcs ?? null, stok_siap: (asal as {stok_siap?: number}).stok_siap ?? null,
      };
    }
  }

  return (
    <div className="tf-card">
      <h1 className="text-xl font-bold text-green-900">Batch Tanam Baru</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Tugas siram otomatis dibuat 30 hari ke depan setelah disimpan.
        {duplikat ? ` Duplikat dari ${duplikat.nama ?? "batch"} — cek lalu simpan.` : ""}
      </p>
      <div className="mt-4">
        <BatchForm
          komoditas={komoditas.data ?? []}
          lokasi={lokasi.data ?? []}
          subBlok={subBlok.data ?? []}
          media={media.data ?? []}
          duplikat={duplikat}
        />
      </div>
    </div>
  );
}
