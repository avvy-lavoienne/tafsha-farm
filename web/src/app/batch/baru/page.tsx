import { createClient } from "@/lib/supabase/server";
import BatchForm from "@/components/BatchForm";

export default async function BatchBaruPage() {
  const supabase = await createClient();

  const [komoditas, lokasi, subBlok, media] = await Promise.all([
    supabase.from("commodities").select("id,nama,aktif").order("nama"),
    supabase.from("locations").select("id,nama").eq("aktif", true).order("nama"),
    supabase.from("sub_blocks").select("id,nama,location_id"),
    supabase.from("media_types").select("id,nama"),
  ]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h1 className="text-xl font-bold text-green-900">Batch Tanam Baru</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Tugas siram otomatis dibuat 30 hari ke depan setelah disimpan.
      </p>
      <div className="mt-4">
        <BatchForm
          komoditas={komoditas.data ?? []}
          lokasi={lokasi.data ?? []}
          subBlok={subBlok.data ?? []}
          media={media.data ?? []}
        />
      </div>
    </div>
  );
}
