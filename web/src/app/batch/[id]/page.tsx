import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LABEL_STATUS,
  LABEL_TUGAS,
  formatTanggal,
  hitungHST,
} from "@/lib/tanggal";
import BatchStatusButtons from "@/components/BatchStatusButtons";
import LogForm from "@/components/LogForm";
import HarvestForm from "@/components/HarvestForm";
import DaftarTugas from "@/components/DaftarTugas";
import RiwayatFoto from "@/components/RiwayatFoto";
import BibitTracker, { TimelineMoves } from "@/components/BibitTracker";
import { ikonKomoditas, ikonMedia } from "@/lib/media";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // select("*") + relasi: tahan skema lama (migrasi 0007/0008 belum jalan)
  // tanpa fallback bertingkat. Kolom yang belum ada dibaca dengan `?? default`.
  const { data: b } = await supabase
    .from("plant_batches")
    .select(
      "*,commodities(*),locations(id,nama),sub_blocks(nama),media_types(nama)",
    )
    .eq("id", id)
    .single();

  if (!b) notFound();

  const tujuan = (b.tujuan as string | null) ?? "kebun";
  const sisaHidup = Number(b.jumlah_hidup ?? b.jumlah ?? 0);

  const komoditas = satu(b.commodities);
  const mediaNama = Array.isArray(b.media_types)
    ? (b.media_types[0]?.nama ?? null)
    : ((b.media_types as { nama: string | null } | null)?.nama ?? null);
  const hst = hitungHST(b.tgl_tanam);
  const siap =
    komoditas?.umur_panen_min != null && hst >= komoditas.umur_panen_min;

  const [tugasRes, logRes, moveRes, panenRes] = await Promise.all([
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
      .select("id,jenis,deskripsi,dosis,oleh,foto_urls,created_at")
      .eq("batch_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("batch_moves").select("id,jenis,dari_status,ke_status,jumlah,sisa,stok_siap,catatan,created_at").eq("batch_id", id).order("created_at", { ascending: false }).limit(50), supabase.from("harvests")
      .select("id,tanggal,jumlah,satuan,kualitas,peruntukan")
      .eq("batch_id", id)
      .order("tanggal", { ascending: false }),
  ]);

  const tutup = b.status === "selesai" || b.status === "gagal";

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/batch" className="text-xs font-semibold text-green-700">
            ← Kembali ke daftar
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href={`/batch/baru?dari=${id}`} className="tf-btn-kecil">
              Duplikat batch
            </Link>
            <Link href={`/batch/${id}/edit`} className="tf-btn-kecil tf-btn-abu">
              Edit batch
            </Link>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="min-w-0 break-words text-lg font-bold text-green-900 sm:text-xl">
            {ikonKomoditas(komoditas?.nama)} {komoditas?.nama ?? "?"} × {b.jumlah}
          </h1>
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
            {LABEL_STATUS[b.status] ?? b.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {satu(b.locations)?.nama ?? "-"}
          {satu(b.sub_blocks)?.nama
            ? ` • ${satu(b.sub_blocks)?.nama}`
            : ""}{" "}
          • {ikonMedia(mediaNama)} {mediaNama}
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
        {tujuan === "jual" && (
          <BibitTracker
            batchId={b.id}
            awalSisa={sisaHidup}
            awalSiap={Number(b.stok_siap ?? 0)}
            harga={(b.harga_pcs as number | null) ?? komoditas?.harga_pcs ?? null}
            tutup={tutup}
          />
        )}
      </section>

      <RiwayatFoto subjek="batch" id={b.id} fotoUtama={b.foto_url ?? null} />
      {tujuan === "jual" && (
        <section className="tf-card">
          <h2 className="font-bold text-green-900">🧾 Riwayat tracker</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Semai → siap jual → terjual/mati, tercatat otomatis.
          </p>
          <TimelineMoves moves={(moveRes.data ?? []) as never} />
        </section>
      )}
      {!tutup && (
        <section className="tf-card">
          <h2 className="font-bold text-green-900">🔔 Pengingat</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Centang kalau sudah dikerjakan — tercatat ke logbook ✅
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
                  <DaftarTugas tugas={depan} />
                )}
              </>
            );
          })()}
        </section>
      )}

      <section className="tf-card">
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
            <li key={l.id} className="tf-item">
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
              {Array.isArray(l.foto_urls) && l.foto_urls.length > 0 && (
                <a href={l.foto_urls[0]} target="_blank" rel="noreferrer">
                  <Image
                    src={l.foto_urls[0]}
                    alt="Foto lampiran catatan"
                    width={160}
                    height={100}
                    loading="lazy"
                    className="mt-1 h-20 w-20 rounded-xl object-cover"
                  />
                </a>
              )}
            </li>
          ))}
        </ul>
        {(logRes.data ?? []).length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">Belum ada catatan.</p>
        )}
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">Panen batch ini</h2>
        <div className="mt-2">
          <HarvestForm batchId={b.id} />
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {(panenRes.data ?? []).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 tf-item text-sm"
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
