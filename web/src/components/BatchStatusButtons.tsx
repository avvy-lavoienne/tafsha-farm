"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PENYEBAB = [
  "busuk akar",
  "hama kutu/ulat",
  "layu",
  "kekeringan",
  "kebanjiran",
  "lain-lain",
];

export default function BatchStatusButtons({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [sibuk, setSibuk] = useState(false);
  const [modeGagal, setModeGagal] = useState(false);
  const [penyebab, setPenyebab] = useState(PENYEBAB[0]);

  async function ubah(statusBaru: string, penyebabGagal: string | null) {
    setSibuk(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("plant_batches")
        .update({ status: statusBaru, penyebab_gagal: penyebabGagal })
        .eq("id", id);
      if (error) throw error;
      window.location.reload();
    } catch {
      alert("Gagal mengubah status.");
    } finally {
      setSibuk(false);
    }
  }

  // Batch sudah ditutup (misal kepencet Selesaikan): bisa dibuka lagi,
  // data tugas, catatan, dan panen tidak hilang.
  if (status === "selesai" || status === "gagal") {
    return (
      <div className="mt-3">
        <button
          onClick={() => {
            if (confirm("Buka lagi batch ini? Status kembali ke Tumbuh."))
              ubah("tumbuh", null);
          }}
          disabled={sibuk}
          className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-800 disabled:opacity-50"
        >
          Buka lagi batch ini
        </button>
        <p className="mt-1 text-xs text-zinc-500">
          Kepencet tutup? Dibuka lagi saja, datanya tetap aman.
        </p>
      </div>
    );
  }

  if (modeGagal) {
    return (
      <div className="mt-3 rounded-xl border p-3">
        <p className="text-sm font-semibold">Penyebab gagal?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PENYEBAB.map((p) => (
            <button
              key={p}
              onClick={() => setPenyebab(p)}
              className={`rounded-xl px-3 py-1.5 text-sm ${
                penyebab === p
                  ? "bg-red-700 text-white"
                  : "border border-red-300 text-red-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              if (confirm("Tandai batch ini gagal dan tutup?")) ubah("gagal", penyebab);
            }}
            disabled={sibuk}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Tandai gagal
          </button>
          <button
            onClick={() => setModeGagal(false)}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {status !== "panen" && (
          <button
            onClick={() => ubah("panen", null)}
            disabled={sibuk}
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Mulai masa panen
          </button>
        )}
        <button
          onClick={() => {
            if (
              confirm(
                "Tutup batch ini? Batch hilang dari daftar aktif, tapi riwayatnya tetap tersimpan.",
              )
            )
              ubah("selesai", null);
          }}
          disabled={sibuk}
          className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-800 disabled:opacity-50"
        >
          Tutup batch
        </button>
        <button
          onClick={() => setModeGagal(true)}
          disabled={sibuk}
          className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          Gagal
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Mulai masa panen = tanaman sedang dipanen. Tutup batch = selesai total
        dan arsipkan.
      </p>
    </div>
  );
}
