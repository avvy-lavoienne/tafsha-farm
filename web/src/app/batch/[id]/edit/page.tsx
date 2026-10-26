import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BatchForm from "@/components/BatchForm";

export default async function BatchEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [batchRes, komoditas, lokasi, subBlok, media] = await Promise.all([
    supabase
      .from("plant_batches")
      .select(
        "id,commodity_id,location_id,sub_block_id,media_type_id,jumlah,tgl_tanam,tgl_semai,catatan,status,commodities(nama)",
      )
      .eq("id", id)
      .single(),
    supabase.from("commodities").select("id,nama,aktif").order("nama"),
    supabase.from("locations").select("id,nama").eq("aktif", true).order("nama"),
    supabase.from("sub_blocks").select("id,nama,location_id"),
    supabase.from("media_types").select("id,nama"),
  ]);

  const b = batchRes.data;
  if (!b) notFound();

  const namaKomoditas = Array.isArray(b.commodities)
    ? b.commodities[0]?.nama
    : (b.commodities as { nama: string | null } | null)?.nama;

  return (
    <div className="tf-card">
      <a href={`/batch/${id}`} className="text-xs font-semibold text-green-700">
        ← Kembali ke detail
      </a>
      <h1 className="mt-1 text-xl font-bold text-green-900">
        Edit batch {namaKomoditas ?? ""} × {b.jumlah}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Ubah lokasi, media, jumlah, atau tanggal — tugas, catatan, dan panen
        tidak ikut berubah.
      </p>
      <div className="mt-4">
        <BatchForm
          komoditas={komoditas.data ?? []}
          lokasi={lokasi.data ?? []}
          subBlok={subBlok.data ?? []}
          media={media.data ?? []}
          edit={{
            id: b.id,
            commodity_id: b.commodity_id,
            location_id: b.location_id,
            sub_block_id: b.sub_block_id,
            media_type_id: b.media_type_id,
            jumlah: b.jumlah,
            tgl_tanam: b.tgl_tanam,
            tgl_semai: b.tgl_semai,
            catatan: b.catatan,
          }}
        />
      </div>
    </div>
  );
}
