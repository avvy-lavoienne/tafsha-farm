import { createClient } from "@/lib/supabase/server";
import { geserBulan, hariIniISO } from "@/lib/tanggal";
import PanenManager from "@/components/PanenManager";

function satu<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default async function PanenPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const bulan =
    params.bulan && /^\d{4}-\d{2}$/.test(params.bulan)
      ? params.bulan
      : hariIniISO().slice(0, 7);

  // Batas bulan dihitung dari string bulan, bukan Date → toISOString:
  // konversi ke UTC memundurkan tanggal 1 menjadi tanggal terakhir bulan
  // sebelumnya, sehingga panen di hari terakhir bulan hilang dari rekap.
  const awalBulan = `${bulan}-01`;
  const awalDepan = `${geserBulan(bulan, 1)}-01`;

  const { data } = await supabase
    .from("harvests")
    .select("id,tanggal,jumlah,satuan,kualitas,peruntukan,batch_id,commodities(nama)")
    .gte("tanggal", awalBulan)
    .lt("tanggal", awalDepan)
    .order("tanggal", { ascending: false })
    .limit(100);

  const awal = (data ?? []).map((p) => ({
    id: p.id,
    tanggal: p.tanggal,
    jumlah: Number(p.jumlah ?? 0),
    satuan: p.satuan,
    kualitas: p.kualitas,
    peruntukan: p.peruntukan,
    batch_id: p.batch_id,
    komoditas: satu(p.commodities)?.nama ?? "?",
  }));

  return <PanenManager awal={awal} bulan={bulan} />;
}
