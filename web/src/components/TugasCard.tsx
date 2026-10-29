"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apakahJaringanGagal, tambahAntrean } from "@/lib/outbox";
import { LABEL_TUGAS, formatTanggal, hariIniISO } from "@/lib/tanggal";
import { ikonKomoditas } from "@/lib/media";
import MiniSpin from "@/components/MiniSpin";

type BatchMini = {
  id: string;
  commodity_id: string;
  jumlah: number;
  location_id: string;
  locations: { nama: string } | { nama: string }[] | null;
  commodities: { nama: string } | { nama: string }[] | null;
};

export type Tugas = {
  id: string;
  jenis: string;
  due_date: string;
  status: string;
  plant_batches: BatchMini | BatchMini[] | null;
};

type Aksi = "selesai" | "lewat" | "besok";

function tambahHari(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${t}`;
}

async function ambilUserId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (e) {
    if (!apakahJaringanGagal(e)) throw e;
    return null;
  }
}

export default function TugasCard({
  tugas,
  saatBerubah,
}: {
  tugas: Tugas;
  saatBerubah?: () => void;
}) {
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const batch = Array.isArray(tugas.plant_batches)
    ? tugas.plant_batches[0]
    : tugas.plant_batches;
  const komoditas = Array.isArray(batch?.commodities)
    ? batch?.commodities[0]?.nama
    : batch?.commodities?.nama;

  const sudahSelesai = tugas.status === "selesai";
  const dilewati = tugas.status === "lewat";
  const nonaktif = sudahSelesai || dilewati;

  const hariIni = hariIniISO();
  const terlewat = tugas.due_date < hariIni && tugas.status === "belum";
  const besok = tambahHari(hariIni, 1);
  const kapan =
    tugas.due_date === hariIni
      ? "Hari ini"
      : tugas.due_date === besok
        ? "Besok"
        : formatTanggal(tugas.due_date);

  async function selesaikan() {
    if (aksi) return;
    setAksi("selesai");
    setPesan(null);
    try {
      const supabase = createClient();
      const userId = await ambilUserId(supabase);
      const sedangOffline =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (!userId && !sedangOffline) throw new Error("Harus masuk dulu ya 🔑");
      const batchId = batch?.id ?? null;
      if (!batchId)
        throw new Error("Batch tugas ini tidak ketemu. Muat ulang halaman ya 🔄");
      const label = LABEL_TUGAS[tugas.jenis] ?? tugas.jenis;
      const muatan = {
        batch_id: batchId,
        jenis: tugas.jenis,
        deskripsi: `Selesai via pengingat (${label})`,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      if (sedangOffline) {
        const n = await tambahAntrean("activity_log", muatan);
        setPesan(`📴 tersimpan offline, menunggu sinkron: ${n}`);
        saatBerubah?.();
        return;
      }
      try {
        const { error: errTugas } = await supabase
          .from("care_tasks")
          .update({ status: "selesai", selesai_at: new Date().toISOString() })
          .eq("id", tugas.id);
        if (errTugas) throw errTugas;
        const { error: errLog } = await supabase
          .from("activity_logs")
          .insert({
            user_id: userId,
            batch_id: batchId,
            jenis: tugas.jenis,
            deskripsi: muatan.deskripsi,
          });
        if (errLog) throw errLog;
      } catch (e) {
        if (apakahJaringanGagal(e)) {
          const n = await tambahAntrean("activity_log", muatan);
          setPesan(`📴 tersimpan offline, menunggu sinkron: ${n}`);
          saatBerubah?.();
          return;
        }
        throw e;
      }
      saatBerubah?.();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi ya 🙏");
    } finally {
      setAksi(null);
    }
  }

  async function lewati() {
    if (aksi) return;
    setAksi("lewat");
    setPesan(null);
    try {
      const supabase = createClient();
      const userId = await ambilUserId(supabase);
      const sedangOffline =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (!userId && !sedangOffline) throw new Error("Harus masuk dulu ya 🔑");
      if (sedangOffline)
        throw new Error("📴 sedang offline, coba lagi saat online ya 📶");
      const { error } = await supabase
        .from("care_tasks")
        .update({ status: "lewat" })
        .eq("id", tugas.id);
      if (error) throw error;
      saatBerubah?.();
    } catch (e) {
      if (apakahJaringanGagal(e)) {
        setPesan("📴 sedang offline, coba lagi saat online ya 📶");
      } else {
        setPesan(e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi ya 🙏");
      }
    } finally {
      setAksi(null);
    }
  }

  async function tundaBesok() {
    if (aksi) return;
    setAksi("besok");
    setPesan(null);
    try {
      const supabase = createClient();
      const userId = await ambilUserId(supabase);
      const sedangOffline =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (!userId && !sedangOffline) throw new Error("Harus masuk dulu ya 🔑");
      if (sedangOffline)
        throw new Error("📴 sedang offline, coba lagi saat online ya 📶");
      const { error } = await supabase
        .from("care_tasks")
        .update({ due_date: tambahHari(tugas.due_date, 1) })
        .eq("id", tugas.id);
      if (error) throw error;
      saatBerubah?.();
    } catch (e) {
      if (apakahJaringanGagal(e)) {
        setPesan("📴 sedang offline, coba lagi saat online ya 📶");
      } else {
        setPesan(e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi ya 🙏");
      }
    } finally {
      setAksi(null);
    }
  }

  const sibuk = aksi !== null;

  return (
    <li
      className={`flex flex-wrap items-center gap-3 tf-item ${
        terlewat
          ? "border-amber-300 bg-amber-50"
          : sudahSelesai
            ? "border-green-200 bg-green-50/50"
            : "border-zinc-200"
      } ${nonaktif ? "opacity-60" : ""}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">
        {sudahSelesai ? "✅" : dilewati ? "⏭" : terlewat ? "⚠️" : "🔔"}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold text-zinc-900 ${sudahSelesai ? "line-through" : ""}`}
        >
          {LABEL_TUGAS[tugas.jenis] ?? tugas.jenis} — {ikonKomoditas(komoditas)} {komoditas ?? "?"}
        </p>
        <p className="text-xs text-zinc-500">
          {batch?.jumlah ?? 0} wadah • {kapan}
          {terlewat ? " • terlewat" : ""}
          {sudahSelesai ? " • selesai ✅" : ""}
          {dilewati ? " • dilewati" : ""}
        </p>
        {!nonaktif && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              onClick={selesaikan}
              disabled={sibuk}
              className="tf-btn-kecil gap-1 bg-green-700 text-white"
            >
              {aksi === "selesai" ? (<><MiniSpin /> Menyimpan...</>) : ("✅ Selesai")}
            </button>
            <button
              onClick={lewati}
              disabled={sibuk}
              className="tf-btn-kecil tf-btn-abu gap-1"
            >
              {aksi === "lewat" ? (<><MiniSpin /> Menyimpan...</>) : ("⏭ Lewati")}
            </button>
            <button
              onClick={tundaBesok}
              disabled={sibuk}
              className="tf-btn-kecil tf-btn-abu gap-1"
            >
              {aksi === "besok" ? (<><MiniSpin /> Menyimpan...</>) : ("⏰ Besok")}
            </button>
          </div>
        )}
        {pesan && (
          <p
            className={`mt-2 rounded-xl p-2 text-xs ${
              pesan.startsWith("📴")
                ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {pesan}
          </p>
        )}
      </div>
    </li>
  );
}
