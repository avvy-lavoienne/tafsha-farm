import { createClient } from "@/lib/supabase/server";
import { formatTanggal, hariIniISO } from "@/lib/tanggal";
import TugasCard from "@/components/TugasCard";
import TambahTugasForm from "@/components/TambahTugasForm";
import NotifButton from "@/components/NotifButton";

export default async function TugasPage() {
  const supabase = await createClient();
  const tanggal = hariIniISO();

  const { data: tugas } = await supabase
    .from("care_tasks")
    .select(
      "id,jenis,due_date,status,plant_batches(id,commodity_id,jumlah,location_id,locations(nama),commodities(nama))",
    )
    .eq("due_date", tanggal)
    .order("created_at");

  // Kelompokkan per lokasi
  const perLokasi = new Map<string, NonNullable<typeof tugas>>();
  for (const t of tugas ?? []) {
    const batch = Array.isArray(t.plant_batches)
      ? t.plant_batches[0]
      : t.plant_batches;
    const lokasi = Array.isArray(batch?.locations)
      ? batch?.locations[0]?.nama
      : (batch?.locations as { nama: string } | null)?.nama;
    const kunci = lokasi ?? "Tanpa lokasi";
    if (!perLokasi.has(kunci)) perLokasi.set(kunci, []);
    perLokasi.get(kunci)!.push(t);
  }

  // Daftar batch aktif untuk form tambah pengingat
  const { data: batchAktif } = await supabase
    .from("plant_batches")
    .select("id,jumlah,commodities(nama),locations(nama)")
    .not("status", "in", "(selesai,gagal)")
    .order("tgl_tanam", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-green-900">
          🔔 Pengingat hari ini
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {formatTanggal(tanggal)} — {tugas?.length ?? 0} hal perlu dikerjakan.
          Dibaca saja, tidak perlu dicentang.
        </p>
      </section>

      {(tugas ?? []).length === 0 ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-600">
            🎉 Tidak ada pengingat hari ini. Pengingat siram otomatis dibuat
            saat menambah batch tanam baru.
          </p>
          <a
            href="/batch/baru"
            className="mt-3 inline-block rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white"
          >
            + Batch tanam baru
          </a>
        </section>
      ) : (
        [...perLokasi.entries()].map(([lokasi, daftar]) => (
          <section key={lokasi} className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-bold text-green-900">📍 {lokasi}</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {daftar.map((t) => (
                <TugasCard key={t.id} tugas={t} />
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <NotifButton />
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-green-900">+ Pengingat lain</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Misal pupuk susulan tanggal sekian, semprot hama — tanpa jadwal
          rutin, hanya notifikasi.
        </p>
        <div className="mt-2">
          <TambahTugasForm batchAktif={batchAktif ?? []} />
        </div>
      </section>
    </div>
  );
}
