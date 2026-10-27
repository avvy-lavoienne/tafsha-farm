import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LABEL_STATUS, formatTanggal, hitungHST } from "@/lib/tanggal";
import { ikonKomoditas, ikonMedia } from "@/lib/media";

export default async function BatchPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; lokasi?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const filterStatus = params.status ?? "aktif";
  const filterLokasi = params.lokasi ?? "";

  const { data: semuaLokasi } = await supabase
    .from("locations")
    .select("id,nama")
    .order("nama");

  let query = supabase
    .from("plant_batches")
    .select(
      "id,jumlah,tgl_semai,tgl_tanam,status,location_id,commodities(nama,umur_panen_min),locations(nama),sub_blocks(nama),media_types(nama)",
    )
    .order("tgl_tanam", { ascending: false });

  if (filterStatus === "aktif") {
    query = query.not("status", "in", "(selesai,gagal)");
  } else if (filterStatus !== "semua") {
    query = query.eq("status", filterStatus);
  }

  if (filterLokasi) {
    query = query.eq("location_id", filterLokasi);
  }

  const { data: batch } = await query;

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <h1 className="text-xl font-bold text-green-900">Batch Tanam</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["aktif", "Aktif"],
            ["panen", "Panen"],
            ["selesai", "Selesai"],
            ["gagal", "Gagal"],
            ["semua", "Semua"],
          ].map(([v, label]) => (
            <Link
              key={v}
              href={`/batch?status=${v}`}
              className={`tf-chip ${
                filterStatus === v
                  ? "tf-chip-on"
                  : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <Link
          href="/batch/baru"
          className="mt-3 inline-block tf-btn"
        >
          + Batch baru
        </Link>
        {(semuaLokasi ?? []).length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/batch?status=${filterStatus}`}
              className={`tf-chip ${
                !filterLokasi
                  ? "tf-chip-on"
                  : ""
              }`}
            >
              Semua lokasi
            </Link>
            {(semuaLokasi ?? []).map((l) => (
              <Link
                key={l.id}
                href={`/batch?status=${filterStatus}&lokasi=${l.id}`}
                className={`tf-chip ${
                  filterLokasi === l.id
                    ? "tf-chip-on"
                    : ""
                }`}
              >
                {l.nama}
              </Link>
            ))}
          </div>
        )}
      </section>

      {(batch ?? []).length === 0 ? (
        <section className="tf-card text-sm text-zinc-600">
          Belum ada batch
          {filterStatus === "aktif" ? " aktif" : ""}. Tambahkan batch tanam
          pertama — misal cabai di galon 15L.
        </section>
      ) : (
        (batch ?? []).map((b) => {
          const komoditas = satu(b.commodities)?.nama ?? "?";
          const umurMin = satu(b.commodities)?.umur_panen_min;
          const hst = hitungHST(b.tgl_tanam);
          const siap = umurMin != null && hst >= umurMin;
          return (
            <Link
              key={b.id}
              href={`/batch/${b.id}`}
              className="tf-card"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-green-900">
                  {ikonKomoditas(komoditas)} {komoditas} × {b.jumlah}
                </p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  {LABEL_STATUS[b.status] ?? b.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {satu(b.locations)?.nama ?? "-"}
                {satu(b.sub_blocks)?.nama
                  ? ` • ${satu(b.sub_blocks)?.nama}`
                  : ""}{" "}
                • {ikonMedia(satu(b.media_types)?.nama)}{" "}
                {satu(b.media_types)?.nama ?? "-"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                HST {hst} • tanam {formatTanggal(b.tgl_tanam)}
                {siap && (
                  <span className="ml-2 font-semibold text-green-700">
                    Siap panen!
                  </span>
                )}
              </p>
            </Link>
          );
        })
      )}
    </div>
  );
}

function satu<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}
