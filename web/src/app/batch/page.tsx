import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LABEL_STATUS, formatTanggal, hitungHST } from "@/lib/tanggal";
import { ikonKomoditas, ikonMedia } from "@/lib/media";
import { badgeJual, statusJual } from "@/lib/jual";

export default async function BatchPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    lokasi?: string;
    komoditas?: string;
    siap?: string;
    tujuan?: string;
  }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const filterStatus = params.status ?? "aktif";
  const filterLokasi = params.lokasi ?? "";
  const filterKomoditas = params.komoditas ?? "";
  const filterTujuan = params.tujuan ?? "";
  const hanyaSiap = params.siap === "1";

  const { data: semuaLokasi } = await supabase
    .from("locations")
    .select("id,nama")
    .order("nama");

  const { data: semuaKomoditas } = await supabase
    .from("commodities")
    .select("id,nama")
    .order("nama");

  async function ambilBatch() {
    // Coba kolom bibit (migrasi 0007); fallback ke skema lama bila DB belum update.
    let q = supabase
      .from("plant_batches")
      .select(
        "id,commodity_id,jumlah,tgl_semai,tgl_tanam,status,tujuan,stok_siap,harga_pcs,location_id,commodities(nama,umur_panen_min,umur_panen_maks,umur_jual_min,umur_jual_maks),locations(nama),sub_blocks(nama),media_types(nama)",
      )
      .order("tgl_tanam", { ascending: false });
    if (filterStatus === "aktif") q = q.not("status", "in", "(selesai,gagal)");
    else if (filterStatus !== "semua") q = q.eq("status", filterStatus);
    if (filterLokasi) q = q.eq("location_id", filterLokasi);
    if (filterKomoditas) q = q.eq("commodity_id", filterKomoditas);
    if (filterTujuan) q = q.eq("tujuan", filterTujuan);
    const r = await q;
    if (!r.error) return r.data ?? [];
    let q2 = supabase
      .from("plant_batches")
      .select(
        "id,commodity_id,jumlah,tgl_semai,tgl_tanam,status,location_id,commodities(nama,umur_panen_min),locations(nama),sub_blocks(nama),media_types(nama)",
      )
      .order("tgl_tanam", { ascending: false });
    if (filterStatus === "aktif") q2 = q2.not("status", "in", "(selesai,gagal)");
    else if (filterStatus !== "semua") q2 = q2.eq("status", filterStatus);
    if (filterLokasi) q2 = q2.eq("location_id", filterLokasi);
    if (filterKomoditas) q2 = q2.eq("commodity_id", filterKomoditas);
    const r2 = await q2;
    return r2.data ?? [];
  }

  const rows = await ambilBatch();

  // Chip "Siap panen": batch kebun pakai umur panen, batch jual pakai usia jual.
  const daftar = (rows ?? []).filter((b) => {
    if (!hanyaSiap) return true;
    const kom = komRow(b.commodities);
    const hst = hitungHST(b.tgl_tanam);
    if (((b as { tujuan?: string }).tujuan ?? "kebun") === "jual") {
      const st = statusJual({
        hst,
        umurJualMin: kom?.umur_jual_min,
        umurJualMaks: kom?.umur_jual_maks,
        umurPanenMin: kom?.umur_panen_min,
        umurPanenMaks: kom?.umur_panen_maks,
      });
      return st.fase === "siap" || st.fase === "lewat";
    }
    return kom?.umur_panen_min != null && hst >= kom.umur_panen_min;
  });

  function qs(patch: Record<string, string | undefined>): string {
    const s = new URLSearchParams();
    const status = patch.status ?? filterStatus;
    if (status && status !== "aktif") s.set("status", status);
    if (status === "aktif" && patch.status === "aktif") s.set("status", "aktif");
    const lokasi = patch.lokasi ?? filterLokasi;
    if (lokasi) s.set("lokasi", lokasi);
    const komoditas = patch.komoditas ?? filterKomoditas;
    if (komoditas) s.set("komoditas", komoditas);
    const tujuan = patch.tujuan ?? filterTujuan;
    if (tujuan) s.set("tujuan", tujuan);
    const siap = patch.siap ?? (hanyaSiap ? "1" : "");
    if (siap) s.set("siap", siap);
    const q = s.toString();
    return `/batch${q ? `?${q}` : ""}`;
  }

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
              href={qs({ status: v })}
              className={`tf-chip ${
                filterStatus === v
                  ? "tf-chip-on"
                  : ""
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href={qs(hanyaSiap ? { siap: "" } : { siap: "1" })}
            className={`tf-chip ${hanyaSiap ? "tf-chip-on" : ""}`}
          >
            🌱 Siap panen
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={qs({ tujuan: "" })}
            className={`tf-chip ${!filterTujuan ? "tf-chip-on" : ""}`}
          >
            Semua tujuan
          </Link>
          <Link
            href={qs({ tujuan: filterTujuan === "kebun" ? "" : "kebun" })}
            className={`tf-chip ${filterTujuan === "kebun" ? "tf-chip-on" : ""}`}
          >
            🏡 Kebun
          </Link>
          <Link
            href={qs({ tujuan: filterTujuan === "jual" ? "" : "jual" })}
            className={`tf-chip ${filterTujuan === "jual" ? "tf-chip-on" : ""}`}
          >
            🌱 Bibit jual
          </Link>
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
              href={qs({ lokasi: "" })}
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
                href={qs({ lokasi: filterLokasi === l.id ? "" : l.id })}
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
        {(semuaKomoditas ?? []).length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={qs({ komoditas: "" })}
              className={`tf-chip ${
                !filterKomoditas
                  ? "tf-chip-on"
                  : ""
              }`}
            >
              Semua komoditas
            </Link>
            {(semuaKomoditas ?? []).map((k) => (
              <Link
                key={k.id}
                href={qs({
                  komoditas: filterKomoditas === k.id ? "" : k.id,
                })}
                className={`tf-chip ${
                  filterKomoditas === k.id
                    ? "tf-chip-on"
                    : ""
                }`}
              >
                {ikonKomoditas(k.nama)} {k.nama}
              </Link>
            ))}
          </div>
        )}
      </section>

      {daftar.length === 0 ? (
        <section className="tf-card text-sm text-zinc-600">
          Belum ada batch
          {hanyaSiap
            ? " yang siap panen untuk filter ini"
            : filterStatus === "aktif"
              ? " aktif"
              : ""}
          . Tambahkan batch tanam pertama — misal cabai di galon 15L.
        </section>
      ) : (
        daftar.map((b) => {
          const kom = komRow(b.commodities);
          const komoditas = kom?.nama ?? "?";
          const hst = hitungHST(b.tgl_tanam);
          const tujuan = (b as { tujuan?: string }).tujuan ?? "kebun";
          const jual = tujuan === "jual";
          const stokSiap = Number((b as { stok_siap?: number }).stok_siap ?? 0);
          // Batch jual dinilai dari usia jual (mendekati berbunga/berbuah),
          // batch kebun dari umur panen.
          const status = statusJual({
            hst,
            umurJualMin: jual ? kom?.umur_jual_min : kom?.umur_panen_min,
            umurJualMaks: jual ? kom?.umur_jual_maks : kom?.umur_panen_maks,
            umurPanenMin: kom?.umur_panen_min,
            umurPanenMaks: kom?.umur_panen_maks,
          });
          const badge = jual
            ? badgeJual(status)
            : kom?.umur_panen_min != null && hst >= kom.umur_panen_min
              ? "Siap panen"
              : null;
          const nadaHijau = jual ? status.fase === "siap" : badge != null;
          return (
            <Link
              key={b.id}
              href={`/batch/${b.id}`}
              className="tf-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 break-words font-bold text-green-900">
                  {ikonKomoditas(komoditas)} {komoditas} × {b.jumlah} pcs
                  {tujuan === "jual" && (
                    <span className="ml-2 rounded-full bg-green-700 px-2 py-0.5 text-[11px] font-bold text-white">
                      🌱 {stokSiap} siap
                    </span>
                  )}
                </p>
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
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
                {badge && (
                  <span
                    className={`ml-2 font-semibold ${
                      nadaHijau ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {badge}
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

type KomRow = {
  nama: string | null;
  umur_panen_min: number | null;
  umur_panen_maks: number | null;
  umur_jual_min: number | null;
  umur_jual_maks: number | null;
};

// Relasi komoditas bisa berbentuk objek atau array; kolom usia jual mungkin
// belum ada di DB lama, jadi dibaca longgar lalu diisi default di statusJual.
function komRow(v: unknown): KomRow | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x as KomRow | null) ?? null;
}
