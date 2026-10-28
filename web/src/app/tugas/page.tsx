import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTanggal, hariIniISO } from "@/lib/tanggal";
import TugasCard from "@/components/TugasCard";
import CuacaCard from "@/components/CuacaCard";
import TambahTugasForm from "@/components/TambahTugasForm";
import NotifButton from "@/components/NotifButton";
import BadgeAntrean from "@/components/BadgeAntrean";
import SinkronButton from "@/components/SinkronButton";

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
      <BadgeAntrean />
      <SinkronButton />
      <section className="tf-card">
        <h1 className="text-xl font-bold text-green-900">
          🔔 Pengingat hari ini
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {formatTanggal(tanggal)} — {tugas?.length ?? 0} hal perlu dikerjakan.
          Dibaca saja, tidak perlu dicentang.
        </p>
      </section>

      <CuacaCard mode="tugas" />

      {(tugas ?? []).length === 0 ? (
        <section className="tf-card">
          <p className="text-sm text-zinc-600">
            🎉 Tidak ada pengingat hari ini. Pengingat siram otomatis dibuat
            saat menambah batch tanam baru.
          </p>
          <Link
            href="/batch/baru"
            className="mt-3 inline-block tf-btn"
          >
            + Batch tanam baru
          </Link>
        </section>
      ) : (
        [...perLokasi.entries()].map(([lokasi, daftar]) => (
          <section key={lokasi} className="tf-card">
            <h2 className="font-bold text-green-900">📍 {lokasi}</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {daftar.map((t) => (
                <TugasCard key={t.id} tugas={t} />
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="tf-card">
        <NotifButton />
      </section>

      <section className="tf-card">
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
