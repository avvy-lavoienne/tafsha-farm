"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ikonKomoditas } from "@/lib/media";
import { formatTanggal } from "@/lib/tanggal";

export type PanenItem = {
  id: string;
  tanggal: string;
  jumlah: number;
  satuan: string | null;
  kualitas: string | null;
  peruntukan: string | null;
  batch_id: string;
  komoditas: string;
};

export default function PanenManager({
  awal,
  bulan,
}: {
  awal: PanenItem[];
  bulan: string;
}) {
  const router = useRouter();
  const [pilihan, setPilihan] = useState(bulan);

  const labelBulan = new Date(bulan + "-01T00:00:00").toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" },
  );

  // Agregasi di JS: total per komoditas + satuan.
  const totalMap = new Map<string, { nama: string; satuan: string; total: number }>();
  for (const p of awal) {
    const nama = p.komoditas;
    const satuan = p.satuan ?? "";
    const kunci = `${nama}|||${satuan}`;
    const lama = totalMap.get(kunci);
    totalMap.set(kunci, {
      nama,
      satuan,
      total: (lama?.total ?? 0) + Number(p.jumlah ?? 0),
    });
  }
  const total = [...totalMap.values()].sort((a, b) => b.total - a.total);
  const maks = total[0]?.total ?? 0;

  function bulanGeser(delta: number) {
    const d = new Date(bulan + "-01T00:00:00");
    d.setMonth(d.getMonth() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    router.push(`/panen?bulan=${y}-${m}`);
  }

  function terapkan() {
    if (/^\d{4}-\d{2}$/.test(pilihan)) router.push(`/panen?bulan=${pilihan}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <p className="tf-eyebrow">Hasil kebun</p>
        <h1 className="mt-1 text-xl font-bold text-green-900">Panen</h1>
        <p className="mt-1 text-sm capitalize text-zinc-600">
          {labelBulan} • {awal.length} catatan
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => bulanGeser(-1)} className="tf-chip">
            ← Bulan lalu
          </button>
          <button onClick={() => bulanGeser(1)} className="tf-chip">
            Bulan depan →
          </button>
          <input
            type="month"
            value={pilihan}
            onChange={(e) => setPilihan(e.target.value)}
            className="tf-input max-w-44"
          />
          <button onClick={terapkan} className="tf-btn-kecil tf-btn-abu">
            Tampilkan
          </button>
        </div>
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">
          📊 Total per komoditas ({labelBulan})
        </h2>
        {total.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-600">
            Belum ada panen bulan ini. Catat panen dari halaman batch — misal
            panen kangkung 2× sebulan, totalnya muncul di sini.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {total.map((t) => (
              <li key={`${t.nama}-${t.satuan}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-green-900">
                    {ikonKomoditas(t.nama)} {t.nama}
                  </span>
                  <span className="shrink-0 font-bold text-green-900">
                    {t.total} {t.satuan}
                  </span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-green-100">
                  <div
                    className="h-full rounded-full bg-[#166534]"
                    style={{
                      width: `${maks > 0 ? Math.max(4, Math.round((t.total / maks) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">
          📒 Riwayat ({awal.length})
        </h2>
        {awal.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-600">
            Belum ada riwayat bulan ini.{" "}
            <Link href="/batch" className="font-semibold text-green-800 underline">
              Buka batch →
            </Link>
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {awal.map((p) => (
            <li key={p.id}>
                <Link
                  href={`/batch/${p.batch_id}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-green-900">
                      {ikonKomoditas(p.komoditas)} {p.komoditas} — {p.jumlah}{" "}
                      {p.satuan ?? ""}
                    </span>
                    <span className="block text-xs text-zinc-600">
                      {formatTanggal(p.tanggal)}
                      {p.kualitas ? ` • ${p.kualitas}` : ""}
                      {p.peruntukan ? ` • ${p.peruntukan}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-green-800 underline">
                    Batch →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-zinc-500">
        Panen dicatat dari halaman tiap batch. Total dihitung per komoditas +
        satuan (kg/ikat/buah tidak dicampur).
      </p>
    </div>
  );
}
