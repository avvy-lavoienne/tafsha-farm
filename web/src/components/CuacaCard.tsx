import { Suspense } from "react";
import MiniSpin from "@/components/MiniSpin";
import { ambilCuaca, CUACA_LABEL } from "@/lib/cuaca";

function CuacaJatuh() {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <MiniSpin />
      <span>Memuat cuaca {CUACA_LABEL}...</span>
    </div>
  );
}

async function IsiCuaca({ mode }: { mode: "beranda" | "tugas" }) {
  const info = await ambilCuaca();

  if (!info) {
    return (
      <div className="text-sm text-zinc-500">
        <p className="font-semibold text-green-900">🌤️ Cuaca {CUACA_LABEL}</p>
        <p className="mt-1">
          Belum bisa memuat cuaca saat ini (offline / jaringan lambat). Lanjutkan
          jadwal siram seperti biasa.
        </p>
      </div>
    );
  }

  if (mode === "tugas") {
    return (
      <div
        className={`flex items-start gap-3 rounded-2xl p-3 text-sm ${
          info.hujan ? "bg-[#dcfce7]" : "bg-[#fffbeb] border border-green-100"
        }`}
      >
        <span className="text-2xl" aria-hidden="true">
          {info.ikon}
        </span>
        <div>
          <p className="font-bold text-green-900">
            {info.suhu != null ? `${info.suhu}°C · ` : ""}
            {info.label} di {CUACA_LABEL}
          </p>
          <p className="mt-0.5 text-zinc-600">
            {info.peluangHujan != null
              ? `Peluang hujan ${info.peluangHujan}%. `
              : ""}
            {info.saranSiram}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="tf-eyebrow">Cuaca kebun · {CUACA_LABEL}</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold text-[#18181b]">
            <span aria-hidden="true">{info.ikon}</span>
            {info.suhu != null ? `${info.suhu}°C` : "--"}
          </p>
          <p className="mt-1 text-sm font-semibold text-green-900">{info.label}</p>
        </div>
        <div className="text-right text-xs text-zinc-600">
          {info.kelembapan != null && <p>💧 {info.kelembapan}%</p>}
          {info.peluangHujan != null && <p>🌧️ {info.peluangHujan}%</p>}
        </div>
      </div>
      <p
        className={`mt-3 rounded-2xl p-3 text-sm font-medium ${
          info.hujan
            ? "bg-[#dcfce7] text-green-900"
            : "bg-[#fffbeb] text-zinc-700 border border-green-100"
        }`}
      >
        {info.hujan ? "🌧️ " : "☀️ "}
        {info.saranSiram}
      </p>
    </div>
  );
}

export default function CuacaCard({ mode = "beranda" }: { mode?: "beranda" | "tugas" }) {
  return (
    <section className="tf-card" aria-label={`Cuaca ${CUACA_LABEL}`}>
      <Suspense fallback={<CuacaJatuh />}>
        <IsiCuaca mode={mode} />
      </Suspense>
    </section>
  );
}
