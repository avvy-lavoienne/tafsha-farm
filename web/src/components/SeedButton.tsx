"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SeedButton() {
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function isi() {
    setSibuk(true);
    setPesan(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("seed_tafsha_farm");
      if (error) throw error;
      window.location.reload();
    } catch (e) {
      setPesan(
        e instanceof Error
          ? e.message
          : "Gagal mengisi data awal.",
      );
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      <button
        onClick={isi}
        disabled={sibuk}
        className="tf-btn disabled:opacity-50"
      >
        {sibuk ? "Mengisi..." : "Isi data awal kebun"}
      </button>
      {pesan && <p className="mt-2 text-xs text-red-700">{pesan}</p>}
      <p className="mt-1 text-xs text-zinc-500">
        Mengisi 2 lokasi, 4 media, 9 komoditas. Aman ditekan berkali-kali.
      </p>
    </div>
  );
}
