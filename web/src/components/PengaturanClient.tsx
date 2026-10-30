"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/LogoutButton";
import NotifButton from "@/components/NotifButton";
import MiniSpin from "@/components/MiniSpin";
import { ambilSemuaAntrean, hapusAntrean, hitungAntrean } from "@/lib/outbox";

function barisCsv(sel: (string | number | null | undefined)[]): string {
  return sel
    .map((v) => {
      const teks = v == null ? "" : String(v);
      return /[",;\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
    })
    .join(";");
}

function namaFile(awal: string): string {
  const d = new Date();
  const tgl = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${awal}-${tgl}.csv`;
}

function unduhCsv(nama: string, baris: string[]): void {
  const blob = new Blob(["\uFEFF" + baris.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type PanenBaris = {
  tanggal: string | null;
  jumlah: number | null;
  satuan: string | null;
  kualitas: string | null;
  peruntukan: string | null;
  batch_id: string | null;
};

type LogBaris = {
  batch_id: string | null;
  jenis: string | null;
  deskripsi: string | null;
  dosis: string | null;
  oleh: string | null;
  created_at: string | null;
};

export default function PengaturanClient({
  email,
  hapusAkun,
}: {
  email: string | null;
  hapusAkun: () => Promise<{ ok: boolean; pesan: string }>;
}) {
  const router = useRouter();
  const [jumlahAntre, setJumlahAntre] = useState(0);
  const [siap, setSiap] = useState(false);
  const [aksi, setAksi] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    let hidup = true;
    const baca = async () => {
      try {
        const n = await hitungAntrean();
        if (!hidup) return;
        setJumlahAntre(n);
      } catch {
        // browser lama tanpa IndexedDB: anggap kosong
      } finally {
        if (hidup) setSiap(true);
      }
    };
    baca();
    const saatBerubah = () => {
      hitungAntrean()
        .then((n) => {
          if (hidup) setJumlahAntre(n);
        })
        .catch(() => {
          // abaikan: badge tetap tampilkan angka lama
        });
    };
    window.addEventListener("outbox:berubah", saatBerubah);
    return () => {
      hidup = false;
      window.removeEventListener("outbox:berubah", saatBerubah);
    };
  }, []);

  async function unduhPanen() {
    setAksi("panen");
    setPesan("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("harvests")
        .select("tanggal,jumlah,satuan,kualitas,peruntukan,batch_id")
        .order("tanggal", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const isi: PanenBaris[] = (data ?? []) as PanenBaris[];
      const baris = [
        barisCsv(["tanggal", "jumlah", "satuan", "kualitas", "peruntukan", "batch_id"]),
        ...isi.map((p) =>
          barisCsv([p.tanggal, p.jumlah, p.satuan, p.kualitas, p.peruntukan, p.batch_id]),
        ),
      ];
      unduhCsv(namaFile("panen"), baris);
      setPesan(`✅ ${isi.length} baris panen diunduh.`);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal mengunduh panen, coba lagi ya.");
    } finally {
      setAksi(null);
    }
  }

  async function unduhLogbook() {
    setAksi("logbook");
    setPesan("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("activity_logs")
        .select("batch_id,jenis,deskripsi,dosis,oleh,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const isi: LogBaris[] = (data ?? []) as LogBaris[];
      const baris = [
        barisCsv(["batch_id", "jenis", "deskripsi", "dosis", "oleh", "created_at"]),
        ...isi.map((l) =>
          barisCsv([l.batch_id, l.jenis, l.deskripsi, l.dosis, l.oleh, l.created_at]),
        ),
      ];
      unduhCsv(namaFile("logbook"), baris);
      setPesan(`✅ ${isi.length} baris logbook diunduh.`);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal mengunduh logbook, coba lagi ya.");
    } finally {
      setAksi(null);
    }
  }

  async function hapusAntre() {
    if (!confirm(`Hapus ${jumlahAntre} data antrean offline? Data ini belum tersinkron dan akan hilang.`))
      return;
    setAksi("antre");
    setPesan("");
    try {
      const semua = await ambilSemuaAntrean();
      for (const entri of semua) {
        await hapusAntrean(entri.id);
      }
      setJumlahAntre(0);
      setPesan("✅ Antrean offline dihapus.");
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menghapus antrean, coba lagi ya.");
    } finally {
      setAksi(null);
    }
  }

  async function akunHapus() {
    if (!confirm("Hapus akun Tafsha Farm? Semua datamu ikut terhapus dan tidak bisa dikembalikan."))
      return;
    if (!confirm("Yakin sekali? Tekan OK untuk menghapus akun sekarang."))
      return;
    setAksi("akun");
    setPesan("");
    try {
      const hasil = await hapusAkun();
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/landing.html");
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menghapus akun, coba lagi ya.");
    } finally {
      setAksi(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <h2 className="font-bold text-green-900">👤 Akun</h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-zinc-700">
            {email ?? "Belum masuk"}
          </p>
          <LogoutButton />
        </div>
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">🔔 Notifikasi</h2>
        <div className="mt-2">
          <NotifButton />
        </div>
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">💾 Data</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Unduh datamu sebagai file CSV (bisa dibuka di Excel/Spreadsheet).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={unduhPanen}
            disabled={aksi !== null}
            className="tf-btn-kecil tf-btn-abu"
          >
            {aksi === "panen" ? (
              <><MiniSpin /> Mengunduh...</>
            ) : (
              "⬇️ Unduh panen (CSV)"
            )}
          </button>
          <button
            onClick={unduhLogbook}
            disabled={aksi !== null}
            className="tf-btn-kecil tf-btn-abu"
          >
            {aksi === "logbook" ? (
              <><MiniSpin /> Mengunduh...</>
            ) : (
              "⬇️ Unduh logbook (CSV)"
            )}
          </button>
        </div>
        {siap && (
          <div className="tf-item mt-3">
            <p className="text-sm font-semibold">
              ⏳ Antrean offline: {jumlahAntre}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Data yang menunggu sinkron saat online.
            </p>
            <button
              onClick={hapusAntre}
              disabled={aksi !== null || jumlahAntre === 0}
              className="tf-btn-kecil tf-btn-abu mt-2"
            >
              {aksi === "antre" ? (
                <><MiniSpin /> Menghapus...</>
              ) : (
                "Hapus antrean offline"
              )}
            </button>
          </div>
        )}
        {pesan && <p className="mt-2 text-xs text-zinc-700">{pesan}</p>}
      </section>

      <section className="tf-card border-l-4 border-l-red-500">
        <h2 className="font-bold text-red-800">⚠️ Zona bahaya</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Hapus akun beserta seluruh datanya. Tindakan ini permanen.
        </p>
        <button
          onClick={akunHapus}
          disabled={aksi !== null}
          className="tf-btn-merah mt-2"
        >
          {aksi === "akun" ? (
            <><MiniSpin /> Menghapus...</>
          ) : (
            "Hapus akun saya"
          )}
        </button>
      </section>
    </div>
  );
}
