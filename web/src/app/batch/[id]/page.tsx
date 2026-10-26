import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  LABEL_STATUS,
  LABEL_TUGAS,
  formatTanggal,
  hitungHST,
} from "@/lib/tanggal";
import BatchStatusButtons from "@/components/BatchStatusButtons";
import LogForm from "@/components/LogForm";
import HarvestForm from "@/components/HarvestForm";
import TugasCard from "@/components/TugasCard";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: b } = await supabase
    .from("plant_batches")
    .select(
      "id,jumlah,tgl_semai,tgl_tanam,status,penyebab_gagal,catatan,created_at,commodities(id,nama,tipe_panen,umur_panen_min,umur_panen_maks,siram_default),locations(id,nama),sub_blocks(nama),media_types(nama)",
    )
    .eq("id", id)
    .single();

  if (!b) notFound();

  const komoditas = satu(b.commodities);
  const hst = hitungHST(b.tgl_tanam);
  const siap =
    komoditas?.umur_panen_min != null && hst >= komoditas.umur_panen_min;

  const [tugasRes, logRes, panenRes] = await Promise.all([
    supabase
      .from("care_tasks")
      .select(
        "id,jenis,due_date,status,plant_batches(id,commodity_id,jumlah,location_id,locations(nama),commodities(nama))",
      )
      .eq("batch_id", id)
      .order("due_date", { ascending: true })
      .limit(30),
    supabase
      .from("activity_logs")
      .select("id,jenis,deskripsi,dosis,oleh,created_at")
      .eq("batch_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("harvests")
      .select("id,tanggal,jumlah,satuan,kualitas,peruntukan")
      .eq("batch_id", id)
      .order("tanggal", { ascending: false }),
  ]);

  const tutup = b.status === "selesai" || b.status === "gagal";

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <a href="/batch" className="text-xs font-semibold text-green-700">
          ← Kembali ke daftar
        </a>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-green-900">
            {komoditas?.nama ?? "?"} × {b.jumlah}
          </h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
            {LABEL_STATUS[b.status] ?? b.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {satu(b.locations)?.nama ?? "-"}
          {satu(b.sub_blocks)?.nama
            ? ` • ${satu(b.sub_blocks)?.nama}`
            : ""}{" "}
          • {satu(b.media_types)?.nama ?? "-"}
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          HST <strong>{hst}</strong> • tanam {formatTanggal(b.tgl_tanam)}
          {b.tgl_semai ? ` • semai ${formatTanggal(b.tgl_semai)}` : ""}
        </p>
        {siap && !tutup && (
          <p className="mt-2 rounded-xl bg-green-100 p-2 text-sm font-semibold text-green-800">
            Siap panen! Umur panen {komoditas?.umur_panen_min}–
            {komoditas?.umur_panen_maks} HST.
          </p>
        )}
        {b.status === "gagal" && b.penyebab_gagal && (
          <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-700">
            Gagal: {b.penyebab_gagal}
          </p>
        )}
        {b.catatan && (
          <p className="mt-2 text-sm text-zinc-600">📝 {b.catatan}</p>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          Siram default: {komoditas?.siram_default ?? "-"} • Tipe:{" "}
          {komoditas?.tipe_panen ?? "-"}
        </p>
        <BatchStatusButtons id={b.id} status={b.status} />
      </section>

      {!tutup && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-bold text-green-900">🔔 Pengingat</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Hanya pengingat — tidak perlu dicentang atau dilaporkan.
          </p>
          {(() => {
            const semua = tugasRes.data ?? [];
            const hariIni = new Date();
            hariIni.setHours(0, 0, 0, 0);
            const depan = semua
              .filter(
                (t) => new Date(t.due_date + "T00:00:00") >= hariIni,
              )
              .slice(0, 3);
            const terlewat = semua.filter(
              (t) => new Date(t.due_date + "T00:00:00") < hariIni,
            ).length;
            return (
              <>
                {terlewat > 0 && (
                  <p className="mt-2 rounded-xl bg-amber-50 p-2 text-sm text-amber-800">
                    ⚠️ {terlewat} pengingat terlewat — kerjakan kalau sempat.
                  </p>
                )}
                {depan.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    Tidak ada pengingat ke depan.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {depan.map((t) => (
                      <TugasCard key={t.id} tugas={t} />
                    ))}
                  </ul>
                )}
              </>
            );
          })()}
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-green-900">Catatan (opsional)</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Hanya isi kalau ada hal penting — misal daun menguning, dosis pupuk
          yang dipakai.
        </p>
        <div className="mt-2">
          <LogForm batchId={b.id} />
        </div>
        <h3 className="mt-4 font-semibold text-green-900">Riwayat</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {(logRes.data ?? []).map((l) => (
            <li key={l.id} className="rounded-xl border p-3">
              <p className="text-sm font-semibold">
                {LABEL_TUGAS[l.jenis] ?? l.jenis}
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  {new Date(l.created_at).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {l.oleh ? ` • ${l.oleh}` : ""}
                </span>
              </p>
              {l.deskripsi && (
                <p className="mt-0.5 text-sm text-zinc-700">{l.deskripsi}</p>
              )}
              {l.dosis && (
                <p className="text-xs text-zinc-500">Dosis: {l.dosis}</p>
              )}
            </li>
          ))}
        </ul>
        {(logRes.data ?? []).length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">Belum ada catatan.</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-green-900">Panen batch ini</h2>
        <div className="mt-2">
          <HarvestForm batchId={b.id} />
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {(panenRes.data ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border p-3 text-sm"
            >
              <span>
                <strong>
                  {p.jumlah} {p.satuan}
                </strong>{" "}
                • {formatTanggal(p.tanggal)}
              </span>
              <span className="text-xs text-zinc-500">
                {[p.kualitas, p.peruntukan].filter(Boolean).join(" • ")}
              </span>
            </li>
          ))}
        </ul>
        {(panenRes.data ?? []).length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">Belum ada panen.</p>
        )}
      </section>
    </div>
  );
}

function satu<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}
