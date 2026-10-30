"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MiniSpin from "@/components/MiniSpin";

export type Move = {
  id: string;
  jenis: string | null;
  dari_status: string | null;
  ke_status: string | null;
  jumlah: number | null;
  sisa: number | null;
  stok_siap: number | null;
  catatan: string | null;
  created_at: string | null;
};

// Tracker komprehensif batch bibit: stok siap jual, mati, terjual —
// tiap aksi tercatat ke batch_moves + (bila jual) ke bibit_sales.
export default function BibitTracker({
  batchId,
  awalSisa,
  awalSiap,
  harga,
  tutup,
}: {
  batchId: string;
  awalSisa: number;
  awalSiap: number;
  harga: number | null;
  tutup: boolean;
}) {
  const router = useRouter();
  const [sisa, setSisa] = useState(awalSisa);
  const [siap, setSiap] = useState(awalSiap);
  const [n, setN] = useState("1");
  const [pembeli, setPembeli] = useState("");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  async function ctx() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Harus masuk dulu.");
    return { supabase, userId: user.id };
  }

  async function tulisMove(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    p: { jenis: string; catatan: string; sisaBaru: number; siapBaru: number },
  ) {
    const { error } = await supabase.from("batch_moves").insert({
      user_id: userId,
      batch_id: batchId,
      jenis: p.jenis,
      jumlah: Number(n) || 0,
      sisa: p.sisaBaru,
      stok_siap: p.siapBaru,
      catatan: p.catatan || null,
    });
    if (error) throw error;
    // Sisa hidup ikut disimpan: tanpa kolom ini, mati/terjual hilang setiap
    // kali halaman dimuat ulang (sisa kembali ke jumlah awal batch).
    const { error: e2 } = await supabase
      .from("plant_batches")
      .update({ stok_siap: p.siapBaru, jumlah_hidup: p.sisaBaru })
      .eq("id", batchId);
    if (e2 && /jumlah_hidup|column|schema cache/i.test(e2.message)) {
      const { error: e3 } = await supabase
        .from("plant_batches")
        .update({ stok_siap: p.siapBaru })
        .eq("id", batchId);
      if (e3) throw e3;
    } else if (e2) {
      throw e2;
    }
    setSisa(p.sisaBaru);
    setSiap(p.siapBaru);
  }

  async function aksiSiap() {
    const jml = Math.max(0, Number(n) || 0);
    if (jml < 1) return setPesan("Isi jumlah pcs dulu.");
    if (jml > sisa) return setPesan(`Sisa hidup tinggal ${sisa} pcs.`);
    setSibuk("siap");
    setPesan(null);
    try {
      const { supabase, userId } = await ctx();
      await tulisMove(supabase, userId, {
        jenis: "siap_jual",
        catatan: catatan || `${jml} pcs masuk stok siap jual`,
        sisaBaru: sisa,
        siapBaru: siap + jml,
      });
      setPesan(`✅ ${jml} pcs masuk stok siap jual.`);
      setCatatan("");
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(null);
    }
  }

  async function aksiMati() {
    const jml = Math.max(0, Number(n) || 0);
    if (jml < 1) return setPesan("Isi jumlah pcs dulu.");
    if (jml > sisa) return setPesan(`Sisa hidup tinggal ${sisa} pcs.`);
    setSibuk("mati");
    setPesan(null);
    try {
      const { supabase, userId } = await ctx();
      const ambilSiap = Math.min(siap, jml);
      await tulisMove(supabase, userId, {
        jenis: "mati",
        catatan: catatan || `${jml} pcs mati (${catatan || "tanpa keterangan"})`,
        sisaBaru: sisa - jml,
        siapBaru: siap - ambilSiap,
      });
      setPesan(`🕊️ ${jml} pcs dicatat mati. Sisa ${sisa - jml} pcs.`);
      setCatatan("");
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(null);
    }
  }

  async function aksiJual() {
    const jml = Math.max(0, Number(n) || 0);
    if (jml < 1) return setPesan("Isi jumlah pcs dulu.");
    if (jml > siap) return setPesan(`Stok siap tinggal ${siap} pcs.`);
    setSibuk("jual");
    setPesan(null);
    try {
      const { supabase, userId } = await ctx();
      const { error: eJual } = await supabase.from("bibit_sales").insert({
        user_id: userId,
        batch_id: batchId,
        jumlah_pcs: jml,
        harga_pcs: harga,
        pembeli: pembeli.trim() || null,
        catatan: catatan.trim() || null,
      });
      if (eJual) throw eJual;
      await tulisMove(supabase, userId, {
        jenis: "terjual",
        catatan: `${jml} pcs terjual${pembeli.trim() ? ` ke ${pembeli.trim()}` : ""}${harga ? ` @Rp ${Number(harga).toLocaleString("id-ID")}` : ""}`,
        sisaBaru: sisa - jml,
        siapBaru: siap - jml,
      });
      setPesan(`💰 ${jml} pcs terjual. Stok siap ${siap - jml} pcs.`);
      setPembeli("");
      setCatatan("");
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(null);
    }
  }

  if (tutup) return null;

  return (
    <section className="tf-card border-l-4 border-l-green-600">
      <h2 className="font-bold text-green-900">🌱 Tracker bibit jual</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Sisa hidup <strong>{sisa} pcs</strong> • Stok siap jual{" "}
        <strong>{siap} pcs</strong>
        {harga ? ` • Rp ${Number(harga).toLocaleString("id-ID")}/pcs` : ""}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-sm font-medium">
          Jumlah (pcs)
          <input
            type="number"
            min={1}
            value={n}
            onChange={(e) => setN(e.target.value)}
            className="tf-input mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Pembeli (khusus jual)
          <input
            value={pembeli}
            onChange={(e) => setPembeli(e.target.value)}
            placeholder="cth: Bu RT"
            className="tf-input mt-1"
          />
        </label>
      </div>
      <label className="mt-2 block text-sm font-medium">
        Keterangan (opsional)
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="cth: daun 4, batang tegak"
          className="tf-input mt-1"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={aksiSiap} disabled={sibuk !== null} className="tf-btn">
          {sibuk === "siap" ? (<><MiniSpin /> ...</>) : ("✅ Siap jual")}
        </button>
        <button onClick={aksiJual} disabled={sibuk !== null} className="tf-btn-outline">
          {sibuk === "jual" ? (<><MiniSpin /> ...</>) : ("💰 Terjual")}
        </button>
        <button onClick={aksiMati} disabled={sibuk !== null} className="tf-btn-kecil tf-btn-abu border-red-200 text-red-700">
          {sibuk === "mati" ? (<><MiniSpin /> ...</>) : ("🕊️ Mati")}
        </button>
      </div>
      {pesan && <p className="mt-2 text-xs text-zinc-700">{pesan}</p>}
    </section>
  );
}

export function TimelineMoves({ moves }: { moves: Move[] }) {
  if (moves.length === 0)
    return <p className="mt-2 text-sm text-zinc-500">Belum ada riwayat tracker.</p>;
  const ikon: Record<string, string> = {
    semai: "🌱",
    siap_jual: "✅",
    terjual: "💰",
    mati: "🕊️",
    pindah: "🪴",
    catat: "📝",
  };
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {moves.map((m) => (
        <li key={m.id} className="tf-item text-sm">
          <p className="font-semibold">
            {ikon[m.jenis ?? ""] ?? "📝"} {labelJenis(m.jenis)}
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {m.created_at
                ? new Date(m.created_at).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">
            {(m.jumlah ?? 0) > 0 ? `${m.jumlah} pcs` : ""}
            {m.sisa != null ? ` • sisa ${m.sisa}` : ""}
            {m.stok_siap != null ? ` • siap ${m.stok_siap}` : ""}
          </p>
          {m.catatan && <p className="mt-0.5 text-sm text-zinc-700">{m.catatan}</p>}
        </li>
      ))}
    </ul>
  );
}

function labelJenis(j: string | null): string {
  const m: Record<string, string> = {
    semai: "Batch dibuat",
    siap_jual: "Masuk stok siap",
    terjual: "Terjual",
    mati: "Mati",
    pindah: "Pindah",
    catat: "Catatan",
  };
  return (j && m[j]) || j || "-";
}
