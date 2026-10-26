import { LABEL_TUGAS, formatTanggal, hariIniISO } from "@/lib/tanggal";

type BatchMini = {
  id: string;
  commodity_id: string;
  jumlah: number;
  location_id: string;
  locations: { nama: string } | { nama: string }[] | null;
  commodities: { nama: string } | { nama: string }[] | null;
};

type Tugas = {
  id: string;
  jenis: string;
  due_date: string;
  status: string;
  plant_batches: BatchMini | BatchMini[] | null;
};

// Pengingat murni: hanya dibaca, tidak perlu dicentang.
// Tidak ada laporan, tidak ada status yang perlu diubah.
export default function TugasCard({ tugas }: { tugas: Tugas }) {
  const batch = Array.isArray(tugas.plant_batches)
    ? tugas.plant_batches[0]
    : tugas.plant_batches;
  const komoditas = Array.isArray(batch?.commodities)
    ? batch?.commodities[0]?.nama
    : batch?.commodities?.nama;

  const hariIni = hariIniISO();
  const terlewat = tugas.due_date < hariIni;
  const besokDate = new Date(hariIni + "T00:00:00");
  besokDate.setDate(besokDate.getDate() + 1);
  const besok = besokDate.toISOString().slice(0, 10);
  const kapan =
    tugas.due_date === hariIni
      ? "Hari ini"
      : tugas.due_date === besok
        ? "Besok"
        : formatTanggal(tugas.due_date);

  return (
    <li
      className={`flex items-center gap-3 tf-item ${
        terlewat ? "border-amber-300 bg-amber-50" : "border-zinc-200"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">
        {terlewat ? "⚠️" : "🔔"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900">
          {LABEL_TUGAS[tugas.jenis] ?? tugas.jenis} — {komoditas ?? "?"}
        </p>
        <p className="text-xs text-zinc-500">
          {batch?.jumlah ?? 0} wadah • {kapan}
          {terlewat ? " • terlewat" : ""}
        </p>
      </div>
    </li>
  );
}
