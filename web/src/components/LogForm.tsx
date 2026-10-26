"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LABEL_TUGAS } from "@/lib/tanggal";
import MiniSpin from "@/components/MiniSpin";

export default function LogForm({ batchId }: { batchId: string }) {
  const [jenis, setJenis] = useState("siram");
  const [deskripsi, setDeskripsi] = useState("");
  const [dosis, setDosis] = useState("");
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
      const { error } = await supabase.from("activity_logs").insert({
        user_id: user?.id ?? null,
        batch_id: batchId,
        jenis,
        deskripsi: deskripsi || null,
        dosis: dosis || null,
      });
      if (error) throw error;
      setDeskripsi("");
      setDosis("");
      window.location.reload();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          className="tf-input"
        >
          {Object.entries(LABEL_TUGAS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          value={dosis}
          onChange={(e) => setDosis(e.target.value)}
          placeholder="Dosis (opsional)"
          className="tf-input"
        />
      </div>
      <textarea
        value={deskripsi}
        onChange={(e) => setDeskripsi(e.target.value)}
        placeholder="cth: daun menguning di 2 galon, kasih NPK 1 sdm"
        rows={2}
        className="tf-input"
      />
      {pesan && (
        <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{pesan}</p>
      )}
      <button
        onClick={simpan}
        disabled={sibuk}
        className="tf-btn"
      >
        {sibuk ? (<><MiniSpin /> Menyimpan...</>) : ("Catat")}
      </button>
    </div>
  );
}
