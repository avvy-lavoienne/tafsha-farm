"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hariIniISO } from "@/lib/tanggal";
import MiniSpin from "@/components/MiniSpin";

export default function HarvestForm({ batchId }: { batchId: string }) {
  const [jumlah, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("ikat");
  const [kualitas, setKualitas] = useState("bagus");
  const [peruntukan, setPeruntukan] = useState("konsumsi");
  const [tanggal, setTanggal] = useState(hariIniISO());
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function simpan() {
    setSibuk(true);
    setPesan(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("harvests").insert({
        user_id: user?.id ?? null,
        batch_id: batchId,
        tanggal,
        jumlah: Number(jumlah),
        satuan,
        kualitas,
        peruntukan,
      });
      if (error) throw error;
      setJumlah("");
      window.location.reload();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          min={0}
          step="any"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="Jumlah"
          className="tf-input"
        />
        <select
          value={satuan}
          onChange={(e) => setSatuan(e.target.value)}
          className="tf-input"
        >
          {["ikat", "kg", "gram", "buah", "batang", "potong"].map((s) => (
            <option key={s} value={s}>
              {s}
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
      <div className="grid grid-cols-2 gap-2">
        <select
          value={kualitas}
          onChange={(e) => setKualitas(e.target.value)}
          className="tf-input"
        >
          {["bagus", "sedang", "rusak"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={peruntukan}
          onChange={(e) => setPeruntukan(e.target.value)}
          className="tf-input"
        >
          {["konsumsi", "jual", "bagi"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {pesan && (
        <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{pesan}</p>
      )}
      <button
        onClick={simpan}
        disabled={sibuk || !jumlah}
        className="tf-btn"
      >
        {sibuk ? (<><MiniSpin /> Menyimpan...</>) : ("Catat panen")}
      </button>
    </div>
  );
}
