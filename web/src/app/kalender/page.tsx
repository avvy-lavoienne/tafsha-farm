import { createClient } from "@/lib/supabase/server";
import KalenderManager from "@/components/KalenderManager";
import {
  bangunEventKalender,
  bulanValid,
  kelompokPerTanggal,
  siapDalamHari,
  type BatchKalender,
} from "@/lib/kalender";
import { hariIniISO } from "@/lib/tanggal";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; lokasi?: string; komoditas?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const ini = hariIniISO();
  const bulan = bulanValid(params.bulan, ini);
  const filterLokasi = params.lokasi ?? "";
  const filterKomoditas = params.komoditas ?? "";

  const [lokasiRes, komoditasRes, batchRes, pindahRes, panenRes] =
    await Promise.all([
      supabase.from("locations").select("id,nama").order("nama"),
      supabase.from("commodities").select("id,nama").order("nama"),
      supabase
        .from("plant_batches")
        .select(
          "id,jumlah,tgl_semai,tgl_tanam,status,location_id,commodity_id,commodities(nama,umur_panen_min,umur_panen_maks),locations(nama)",
        )
        .order("tgl_tanam", { ascending: false })
        .limit(500),
      supabase
        .from("care_tasks")
        .select("batch_id,due_date,status")
        .eq("jenis", "pindah_tanam")
        .order("due_date", { ascending: true })
        .limit(1000),
      supabase
        .from("harvests")
        .select("batch_id,tanggal")
        .order("tanggal", { ascending: false })
        .limit(1000),
    ]);

  const daftarLokasi = lokasiRes.data ?? [];
  const daftarKomoditas = komoditasRes.data ?? [];

  const pindahPerBatch = new Map<string, { due_date: string; status: string }[]>();
  for (const p of pindahRes.data ?? []) {
    const l = pindahPerBatch.get(p.batch_id) ?? [];
    l.push({ due_date: p.due_date, status: p.status });
    pindahPerBatch.set(p.batch_id, l);
  }
  const panenPerBatch = new Map<string, { tanggal: string }[]>();
  for (const h of panenRes.data ?? []) {
    const l = panenPerBatch.get(h.batch_id) ?? [];
    l.push({ tanggal: h.tanggal });
    panenPerBatch.set(h.batch_id, l);
  }

  function satu<T>(v: T | T[] | null): T | null {
    if (Array.isArray(v)) return v[0] ?? null;
    return v;
  }

  const batches: BatchKalender[] = [];
  for (const b of batchRes.data ?? []) {
    if (filterLokasi && b.location_id !== filterLokasi) continue;
    if (filterKomoditas && b.commodity_id !== filterKomoditas) continue;
    const kom = satu(b.commodities) as {
      nama: string | null;
      umur_panen_min: number | null;
      umur_panen_maks: number | null;
    } | null;
    const lok = satu(b.locations) as { nama: string | null } | null;
    batches.push({
      id: b.id,
      komoditas: kom?.nama ?? "?",
      lokasi: lok?.nama ?? "-",
      jumlah: b.jumlah,
      tgl_semai: b.tgl_semai ?? null,
      tgl_tanam: b.tgl_tanam,
      status: b.status,
      umur_min: kom?.umur_panen_min ?? null,
      umur_maks: kom?.umur_panen_maks ?? null,
      pindah: pindahPerBatch.get(b.id) ?? [],
      panen: panenPerBatch.get(b.id) ?? [],
    });
  }

  const events = bangunEventKalender(batches);
  const perTanggal = kelompokPerTanggal(events);
  const siapMingguIni = siapDalamHari(events, ini, 7);
  const tanpaUmur = batches.filter((b) => b.umur_min == null).length;

  return (
    <KalenderManager
      bulan={bulan}
      hariIni={ini}
      daftarLokasi={daftarLokasi}
      daftarKomoditas={daftarKomoditas}
      filterLokasi={filterLokasi}
      filterKomoditas={filterKomoditas}
      perTanggal={perTanggal}
      siapMingguIni={siapMingguIni}
      tanpaUmur={tanpaUmur}
    />
  );
}
