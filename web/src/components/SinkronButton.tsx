"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hitungAntrean, sinkronkanAntrean } from "@/lib/outbox";
import MiniSpin from "@/components/MiniSpin";

// Tombol sinkron manual + auto-sync (event online & saat aplikasi dibuka).
export default function SinkronButton() {
  const [jumlah, setJumlah] = useState(0);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);
  const router = useRouter();

  const muat = useCallback(async () => {
    try {
      setJumlah(await hitungAntrean());
    } catch {
      // browser lama tanpa IndexedDB: tombol disembunyikan
    }
  }, []);

  const jalan = useCallback(
    async (diam: boolean) => {
      setSibuk(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!diam) setPesan("Harus masuk dulu untuk sinkron.");
          return;
        }
        const hasil = await sinkronkanAntrean(supabase);
        await muat();
        if (hasil.gagal > 0)
          setPesan(
            `⏳ ${hasil.berhasil} tersinkron, ${hasil.gagal} masih menunggu.`,
          );
        else if (hasil.berhasil > 0) {
          setPesan(`✅ ${hasil.berhasil} data tersinkron.`);
          router.refresh();
        } else if (!diam) setPesan("✅ Semua sudah sinkron.");
      } catch (e) {
        if (!diam)
          setPesan(e instanceof Error ? e.message : "Gagal sinkron.");
      } finally {
        setSibuk(false);
      }
    },
    [muat, router],
  );

  useEffect(() => {
    let hidup = true;
    const awal = async () => {
      try {
        const n = await hitungAntrean();
        if (!hidup) return;
        setJumlah(n);
        setSiap(true);
        if (typeof navigator !== "undefined" && navigator.onLine)
          jalan(true);
      } catch {
        if (hidup) setSiap(true);
      }
    };
    awal();
    const saatOnline = () => {
      muat();
      jalan(true);
    };
    const saatBerubah = () => muat();
    window.addEventListener("online", saatOnline);
    window.addEventListener("outbox:berubah", saatBerubah);
    return () => {
      hidup = false;
      window.removeEventListener("online", saatOnline);
      window.removeEventListener("outbox:berubah", saatBerubah);
    };
  }, [muat, jalan]);

  if (!siap) return null;
  if (jumlah === 0 && !pesan && !sibuk) return null;

  return (
    <div className="tf-card border-l-4 border-l-amber-500 lg:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-amber-800">
          ⏳ menunggu sinkron: {jumlah}
        </p>
        <button
          onClick={() => jalan(false)}
          disabled={sibuk || jumlah === 0}
          className="tf-btn-kecil shrink-0"
        >
          {sibuk ? (
            <>
              <MiniSpin /> Menyinkron...
            </>
          ) : (
            "🔄 Sinkronkan"
          )}
        </button>
      </div>
      {pesan && <p className="mt-1 text-xs text-zinc-600">{pesan}</p>}
    </div>
  );
}
