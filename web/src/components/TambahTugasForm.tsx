"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LABEL_TUGAS, hariIniISO } from "@/lib/tanggal";
import { ikonKomoditas } from "@/lib/media";
import MiniSpin from "@/components/MiniSpin";

type BatchOpsi = {
  id: string;
  jumlah: number;
  commodities: { nama: string } | { nama: string }[] | null;
  locations: { nama: string } | { nama: string }[] | null;
};

export default function TambahTugasForm({
  batchAktif,
}: {
  batchAktif: BatchOpsi[];
}) {
  const [batchId, setBatchId] = useState(batchAktif[0]?.id ?? "");
  const [jenis, setJenis] = useState("pupuk");
  const [tanggal, setTanggal] = useState(hariIniISO());
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const router = useRouter();

  async function simpan() {
    if (!batchId) {
      setPesan("Belum ada batch aktif. Tambah batch dulu.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Harus masuk dulu.");
      const { error } = await supabase.from("care_tasks").insert({
        user_id: user.id,
        batch_id: batchId,
        jenis,
        due_date: tanggal,
        status: "belum",
      });
      if (error) throw error;
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={batchId}
        onChange={(e) => setBatchId(e.target.value)}
        className="tf-input"
      >
        {batchAktif.map((b) => {
          const kom = Array.isArray(b.commodities)
            ? b.commodities[0]?.nama
            : b.commodities?.nama;
          const lok = Array.isArray(b.locations)
            ? b.locations[0]?.nama
            : b.locations?.nama;
          return (
            <option key={b.id} value={b.id}>
              {ikonKomoditas(kom)} {kom} × {b.jumlah} ({lok})
            </option>
          );
        })}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          className="tf-input"
        >
          {Object.entries(LABEL_TUGAS)
            .filter(([v]) => v !== "siram")
            .map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
        </select>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="tf-input"
        />
      </div>
      {pesan && (
        <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{pesan}</p>
      )}
      <button
        onClick={simpan}
        disabled={sibuk}
        className="tf-btn-outline"
      >
        {sibuk ? (<><MiniSpin /> Menyimpan...</>) : ("Tambah pengingat")}
      </button>
    </div>
  );
}
