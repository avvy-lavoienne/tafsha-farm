import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hitungHST } from "@/lib/tanggal";
import { ikonKomoditas } from "@/lib/media";

export default async function BibitPage() {
  const supabase = await createClient();

  const { data: batch, error } = await supabase
    .from("plant_batches")
    .select(
      "id,jumlah,tgl_semai,tgl_tanam,status,tujuan,stok_siap,harga_pcs,commodities(nama,harga_pcs,umur_siap_min,umur_siap_maks,umur_panen_min),locations(nama)",
    )
    .eq("tujuan", "jual")
    .not("status", "in", "(selesai,gagal)")
    .order("tgl_tanam", { ascending: false });

  // Fallback bila migrasi 0007 belum dijalankan di Supabase:
  // tampilkan instruksi, bukan halaman kosong/error.
  if (error && /tujuan|stok_siap|harga_pcs|column|schema cache/i.test(error.message)) {
    return (
      <div className="flex flex-col gap-4">
        <section className="tf-card border-l-4 border-l-amber-500">
          <h1 className="text-xl font-bold text-green-900">🌱 Stok bibit siap jual</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Database belum update ke model jualan bibit. Jalankan sekali di
            Supabase Dashboard → SQL Editor, file:
          </p>
          <p className="mt-1 rounded-xl bg-zinc-100 p-2 font-mono text-xs">
            supabase/migrations/0007_bibit_jual_tracker.sql
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Setelah itu refresh halaman ini. Batch lama tetap aman.
          </p>
        </section>
      </div>
    );
  }

  const daftar = batch ?? [];
  let totalSiap = 0;
  let totalNilai = 0;
  const perKomoditas = new Map<string, { siap: number; harga: number | null }>();
  for (const b of daftar) {
    const siap = Number(b.stok_siap ?? 0);
    const harga = (b.harga_pcs ?? satuHarga(b.commodities)) as number | null;
    totalSiap += siap;
    if (harga) totalNilai += siap * Number(harga);
    const nama = satuNama(b.commodities);
    const s = perKomoditas.get(nama) ?? { siap: 0, harga };
    s.siap += siap;
    if (harga && !s.harga) s.harga = harga;
    perKomoditas.set(nama, s);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <p className="tf-eyebrow">Toko bibit</p>
        <h1 className="mt-1 text-xl font-bold text-green-900">
          🌱 Stok bibit siap jual
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Per pcs polybag — cabai, tomat, daun bawang, seledri, bawang merah,
          terong, strawberry, mint.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="tf-card">
            <p className="text-2xl font-bold text-[#166534]">{totalSiap}</p>
            <p className="mt-1 text-xs text-zinc-600">pcs siap jual</p>
          </div>
          <div className="tf-card">
            <p className="text-2xl font-bold text-[#166534]">
              {totalNilai > 0 ? `Rp ${totalNilai.toLocaleString("id-ID")}` : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">nilai stok siap</p>
          </div>
        </div>
        <Link href="/batch/baru" className="tf-btn mt-3 inline-block">
          + Batch bibit baru
        </Link>
      </section>

      {daftar.length === 0 ? (
        <section className="tf-card text-sm text-zinc-600">
          Belum ada batch bibit jual aktif. Buat batch baru → pilih Tujuan
          &quot;🌱 Bibit jual&quot;.
        </section>
      ) : (
        <>
          <section className="tf-card">
            <h2 className="font-bold text-green-900">Per komoditas</h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {[...perKomoditas.entries()].map(([nama, s]) => (
                <li
                  key={nama}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {ikonKomoditas(nama)} {nama}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {s.siap} pcs
                    {s.harga ? ` • Rp ${Number(s.harga).toLocaleString("id-ID")}/pcs` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {daftar.map((b) => {
            const kom = satuKom(b.commodities);
            const nama = kom?.nama ?? "?";
            const harga = (b.harga_pcs ?? kom?.harga_pcs ?? null) as number | null;
            const hst = hitungHST(b.tgl_tanam);
            const umurSemai = b.tgl_semai ? hitungHST(b.tgl_semai) : null;
            const siapMin = kom?.umur_siap_min ?? null;
            // Kesiapan bibit dihitung sejak semai; tanpa umur siap, pakai umur panen dari tanam.
            const siapJual =
              siapMin != null
                ? (umurSemai ?? hst) >= siapMin
                : kom?.umur_panen_min != null && hst >= kom.umur_panen_min;
            return (
              <Link key={b.id} href={`/batch/${b.id}`} className="tf-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words font-bold text-green-900">
                    {ikonKomoditas(nama)} {nama} × {b.jumlah} pcs
                  </p>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    {Number(b.stok_siap ?? 0)} siap
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {satuLok(b.locations)} • HST {hst}
                  {umurSemai != null ? ` • semai ${umurSemai} hr` : ""}
                  {harga ? ` • Rp ${Number(harga).toLocaleString("id-ID")}/pcs` : ""}
                  {siapJual && (
                    <span className="ml-2 font-semibold text-green-700">
                      Siap jual!
                    </span>
                  )}
                </p>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}

function satuKom(v: unknown): {
  nama: string | null;
  harga_pcs: number | null;
  umur_siap_min: number | null;
  umur_siap_maks: number | null;
  umur_panen_min: number | null;
} | null {
  if (Array.isArray(v)) return (v[0] as never) ?? null;
  return v as never;
}
function satuNama(v: unknown): string {
  return satuKom(v)?.nama ?? "?";
}
function satuHarga(v: unknown): number | null {
  return satuKom(v)?.harga_pcs ?? null;
}
function satuLok(v: unknown): string {
  if (Array.isArray(v)) return ((v[0] as { nama?: string })?.nama ?? "-");
  return ((v as { nama?: string } | null)?.nama ?? "-");
}
