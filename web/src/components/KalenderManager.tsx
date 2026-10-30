"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  META_JENIS,
  type EventKalender,
  type JenisEvent,
} from "@/lib/kalender";
import { formatTanggal, geserBulan, namaBulan } from "@/lib/tanggal";

type Opsi = { id: string; nama: string };

const WARNA_TITIK: Record<JenisEvent, string> = {
  semai: "bg-zinc-400",
  tanam: "bg-green-700",
  pindah: "bg-blue-600",
  estimasi: "bg-amber-500",
  panen: "bg-green-400",
};

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function KalenderManager({
  bulan,
  hariIni,
  daftarLokasi,
  daftarKomoditas,
  filterLokasi,
  filterKomoditas,
  perTanggal,
  siapMingguIni,
  tanpaUmur,
}: {
  bulan: string;
  hariIni: string;
  daftarLokasi: Opsi[];
  daftarKomoditas: Opsi[];
  filterLokasi: string;
  filterKomoditas: string;
  perTanggal: Record<string, EventKalender[]>;
  siapMingguIni: number;
  tanpaUmur: number;
}) {
  const router = useRouter();
  const [tglPilih, setTglPilih] = useState<string | null>(null);
  const tglAktif = tglPilih ?? (bulan === hariIni.slice(0, 7) ? hariIni : `${bulan}-01`);

  function qs(patch: Record<string, string | undefined>): string {
    const s = new URLSearchParams();
    const b = patch.bulan ?? bulan;
    if (b) s.set("bulan", b);
    const l = patch.lokasi ?? filterLokasi;
    if (l) s.set("lokasi", l);
    const k = patch.komoditas ?? filterKomoditas;
    if (k) s.set("komoditas", k);
    const q = s.toString();
    return `/kalender${q ? `?${q}` : ""}`;
  }

  // Sel grid: hari Senin=0..Minggu=6 → offset kolom.
  const [y, m] = bulan.split("-").map(Number);
  const pertama = new Date(y, m - 1, 1);
  const offset = (pertama.getDay() + 6) % 7; // Senin dulu
  const jumHari = new Date(y, m, 0).getDate();
  const sel: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: jumHari }, (_, i) => {
      const t = String(i + 1).padStart(2, "0");
      return `${bulan}-${t}`;
    }),
  ];
  while (sel.length % 7 !== 0) sel.push(null);

  const daftar = perTanggal[tglAktif] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <p className="tf-eyebrow">Siklus tanam</p>
        <h1 className="mt-1 text-xl font-bold text-green-900">📅 Kalender</h1>
        <p className="mt-1 text-sm capitalize text-zinc-600">
          {namaBulan(bulan)} • semai, tanam, pindah, estimasi panen
        </p>
        {siapMingguIni > 0 && (
          <p className="mt-2 rounded-xl bg-green-100 p-2 text-sm font-semibold text-green-800">
            🧺 {siapMingguIni} batch mulai siap panen 7 hari ke depan.
          </p>
        )}
        {tanpaUmur > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 p-2 text-sm text-amber-800">
            ⚠️ {tanpaUmur} batch belum punya umur panen —{" "}
            <Link href="/komoditas" className="font-semibold underline">
              isi di Komoditas
            </Link>{" "}
            agar estimasi muncul.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push(qs({ bulan: geserBulan(bulan, -1) }))}
            className="tf-chip"
          >
            ← Bulan lalu
          </button>
          <button
            onClick={() => router.push(qs({ bulan: geserBulan(bulan, 1) }))}
            className="tf-chip"
          >
            Bulan depan →
          </button>
          <input
            type="month"
            value={bulan}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d{4}-\d{2}$/.test(v)) router.push(qs({ bulan: v }));
            }}
            className="tf-input max-w-44"
            aria-label="Pilih bulan"
          />
          <Link
            href={qs({ bulan: hariIni.slice(0, 7) })}
            className="tf-btn-kecil tf-btn-abu"
          >
            Bulan ini
          </Link>
        </div>
        {daftarLokasi.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={qs({ lokasi: "" })}
              className={`tf-chip ${!filterLokasi ? "tf-chip-on" : ""}`}
            >
              Semua lokasi
            </Link>
            {daftarLokasi.map((l) => (
              <Link
                key={l.id}
                href={qs({ lokasi: filterLokasi === l.id ? "" : l.id })}
                className={`tf-chip ${filterLokasi === l.id ? "tf-chip-on" : ""}`}
              >
                {l.nama}
              </Link>
            ))}
          </div>
        )}
        {daftarKomoditas.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={qs({ komoditas: "" })}
              className={`tf-chip ${!filterKomoditas ? "tf-chip-on" : ""}`}
            >
              Semua komoditas
            </Link>
            {daftarKomoditas.map((k) => (
              <Link
                key={k.id}
                href={qs({
                  komoditas: filterKomoditas === k.id ? "" : k.id,
                })}
                className={`tf-chip ${filterKomoditas === k.id ? "tf-chip-on" : ""}`}
              >
                {k.nama}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="tf-card">
        <div className="flex flex-wrap gap-2" aria-label="Legenda kalender">
          {(Object.keys(META_JENIS) as JenisEvent[]).map((j) => (
            <span
              key={j}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${WARNA_TITIK[j]}`}
                aria-hidden="true"
              />
              {META_JENIS[j].ikon} {META_JENIS[j].nama}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1" role="grid" aria-label={`Kalender ${namaBulan(bulan)}`}>
          {NAMA_HARI.map((h) => (
            <p
              key={h}
              className="pb-1 text-center text-xs font-bold text-zinc-500"
            >
              {h}
            </p>
          ))}
          {sel.map((tgl, i) => {
            if (!tgl) return <span key={`k-${i}`} />;
            const ev = perTanggal[tgl] ?? [];
            const aktif = tgl === tglAktif;
            const ini = tgl === hariIni;
            const labelHari = Number(tgl.slice(8, 10));
            const ringkas = ev.length === 0
              ? `Tidak ada kejadian pada ${formatTanggal(tgl)}`
              : `${ev.length} kejadian pada ${formatTanggal(tgl)}: ${ev.map((e) => e.label).join(", ")}`;
            return (
              <button
                key={tgl}
                type="button"
                onClick={() => setTglPilih(tgl)}
                aria-label={ringkas}
                aria-pressed={aktif}
                aria-current={ini ? "date" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-start gap-1 rounded-xl border p-1 md:min-h-[72px] ${
                  aktif
                    ? "border-green-700 bg-green-50"
                    : ini
                      ? "border-amber-400 bg-amber-50"
                      : "border-zinc-100 bg-white"
                }`}
              >
                <span
                  className={`text-xs font-bold ${aktif || ini ? "text-green-900" : "text-zinc-700"}`}
                >
                  {labelHari}
                </span>
                {ev.length > 0 && (
                  <span className="flex flex-wrap items-center justify-center gap-0.5" aria-hidden="true">
                    {ev.slice(0, 4).map((e, k) => (
                      <span
                        key={k}
                        title={`${META_JENIS[e.jenis].nama}: ${e.label}`}
                        className={`h-2 w-2 rounded-full ${WARNA_TITIK[e.jenis]} ${e.jenis === "estimasi" && e.rentang ? "opacity-40" : ""} ${e.jenis === "pindah" && e.selesai ? "opacity-40" : ""}`}
                      />
                    ))}
                    {ev.length > 4 && (
                      <span className="text-[10px] font-bold text-zinc-500">
                        +{ev.length - 4}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="tf-card" aria-live="polite">
        <h2 className="font-bold text-green-900">
          📌 {formatTanggal(tglAktif)} ({daftar.length} kejadian)
        </h2>
        {daftar.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">
            Tidak ada kejadian hari ini.{" "}
            <Link href="/batch/baru" className="font-semibold text-green-800 underline">
              Tanam baru →
            </Link>
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {daftar.map((e, i) => (
              <li key={`${e.tanggal}-${e.batchId}-${e.jenis}-${i}`}>
                <Link
                  href={`/batch/${e.batchId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-green-900">
                      {META_JENIS[e.jenis].ikon} {e.label}
                      {e.jenis === "pindah" && e.selesai ? " ✅" : ""}
                    </span>
                    <span className="block text-xs text-zinc-600">
                      📍 {e.lokasi} • {META_JENIS[e.jenis].nama}
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
    </div>
  );
}
