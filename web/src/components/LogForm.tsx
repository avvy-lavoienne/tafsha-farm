"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apakahJaringanGagal, tambahAntrean } from "@/lib/outbox";
import { LABEL_TUGAS } from "@/lib/tanggal";
import MiniSpin from "@/components/MiniSpin";

export default function LogForm({ batchId }: { batchId: string }) {
  const [jenis, setJenis] = useState("siram");
  const [deskripsi, setDeskripsi] = useState("");
  const [dosis, setDosis] = useState("");
  const [lampirkanFoto, setLampirkanFoto] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const router = useRouter();

  function namaPendek(email: string | null | undefined): string | null {
    if (!email) return null;
    const nama = email.split("@")[0] ?? "";
    return nama ? nama.slice(0, 24) : null;
  }

  async function simpan() {
    setSibuk(true);
    setPesan(null);
    const muatan = {
      batch_id: batchId,
      jenis,
      deskripsi: deskripsi || null,
      dosis: dosis || null,
      created_at: new Date().toISOString(),
    };
    try {
      const supabase = createClient();
      // getUser() butuh jaringan — offline gagal di sini, anggap user/email null
      // (user_id diganti user asli saat sinkron).
      let userId: string | null = null;
      let email: string | null = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id ?? null;
        email = user?.email ?? null;
      } catch (e) {
        if (!apakahJaringanGagal(e)) throw e;
      }
      // Reuse URL foto progres terakhir batch ini (tanpa ubah skema):
      // foto lampiran = 1 URL terbaru kebun_foto batch ini.
      let foto_urls: string[] = [];
      if (lampirkanFoto && userId) {
        const { data: fotoTerakhir } = await supabase
          .from("kebun_foto")
          .select("foto_url")
          .eq("subjek_tipe", "batch")
          .eq("subjek_id", batchId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fotoTerakhir?.foto_url) foto_urls = [fotoTerakhir.foto_url];
      }
      const oleh = namaPendek(email);
      const baris = { ...muatan, user_id: userId, oleh, foto_urls };
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const n = await tambahAntrean("activity_log", baris);
        setPesan(`📴 tersimpan offline, menunggu sinkron: ${n}`);
        setDeskripsi("");
        setDosis("");
        setLampirkanFoto(false);
        return;
      }
      try {
        const { error } = await supabase.from("activity_logs").insert(baris);
        if (error) throw error;
      } catch (e) {
        if (apakahJaringanGagal(e)) {
          const n = await tambahAntrean("activity_log", baris);
          setPesan(`📴 tersimpan offline, menunggu sinkron: ${n}`);
          setDeskripsi("");
          setDosis("");
          setLampirkanFoto(false);
          return;
        }
        throw e;
      }
      setDeskripsi("");
      setDosis("");
      setLampirkanFoto(false);
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
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
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={lampirkanFoto}
          onChange={(e) => setLampirkanFoto(e.target.checked)}
          className="h-4 w-4"
        />
        Lampirkan foto progres terakhir ke catatan ini
      </label>
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
