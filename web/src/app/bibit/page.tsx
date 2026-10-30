import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hariIniISO, hitungHST } from "@/lib/tanggal";
import { ikonKomoditas } from "@/lib/media";
import { badgeJual, statusJual } from "@/lib/jual";

type Kom = {
  nama: string | null;
  harga_pcs: number | null;
  umur_panen_min: number | null;
  umur_panen_maks: number | null;
  umur_jual_min: number | null;
  umur_jual_maks: number | null;
};

function satu<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default async function BibitPage() {
  const supabase = await createClient();
  const hariIni = hariIniISO();

  // select("*") + relasi: aman bila migrasi 0010 (umur_jual_*) belum jalan.
  const { data: batch, error } = await supabase
    .from("plant_batches")
    .select("*,commodities(*),locations(nama)")
    .eq("tujuan", "jual")
    .not("status", "in", "(selesai,gagal)")
    .order("tgl_tanam", { ascending: false });

  // Fallback bila migrasi 0007 belum dijalankan di Supabase.
  if (error && /tujuan|stok_siap|harga_pcs|column|schema cache/i.test(error.message)) {
    return (
      <div className="flex flex-col gap-4">
        <section className="tf-card border-l-4 border-l-amber-500">
          <h1 className="text-xl font-bold text-green-900">🌱 Tanaman siap jual</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Database belum update ke model jualan tanaman. Jalankan sekali di
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
  let totalStok = 0;
  let totalUsiaSiap = 0;
  let totalNilai = 0;
  const perKomoditas = new Map<
    string,
    { siap: number; harga: number | null; sisaHari: number | null }
  >();

  for (const b of daftar) {
    const kom = satu(b.commodities) as Kom | null;
    const nama = kom?.nama ?? "?";
    const stok = Number(b.stok_siap ?? 0);
    const jumlah = Number(b.jumlah ?? 0);
    const harga = (b.harga_pcs ?? kom?.harga_pcs ?? null) as number | null;
    const st = statusJual({
      hst: hitungHST(b.tgl_tanam, hariIni),
      umurJualMin: kom?.umur_jual_min,
      umurJualMaks: kom?.umur_jual_maks,
      umurPanenMin: kom?.umur_panen_min,
      umurPanenMaks: kom?.umur_panen_maks,
    });

    totalStok += stok;
    if (st.fase === "siap" || st.fase === "lewat") totalUsiaSiap += jumlah;
    if (harga) totalNilai += stok * Number(harga);

    const s = perKomoditas.get(nama) ?? { siap: 0, harga, sisaHari: null };
    s.siap += stok;
    if (harga && !s.harga) s.harga = harga;
    if (st.fase === "hampir") {
      s.sisaHari =
        s.sisaHari == null ? st.sisaHari : Math.min(s.sisaHari, st.sisaHari ?? 0);
    }
    perKomoditas.set(nama, s);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <p className="tf-eyebrow">Toko tanaman</p>
        <h1 className="mt-1 text-xl font-bold text-green-900">
          🌱 Tanaman siap jual
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Bukan bibit semai — ini tanaman yang sudah mendekati masa
          berbunga/berbuah, tinggal dirawat sebentar lalu panen.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="tf-card">
            <p className="text-2xl font-bold text-[#166534]">{totalStok}</p>
            <p className="mt-1 text-xs text-zinc-600">pcs stok siap jual</p>
          </div>
          <div className="tf-card">
            <p className="text-2xl font-bold text-[#166534]">
              {totalNilai > 0 ? `Rp ${totalNilai.toLocaleString("id-ID")}` : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">nilai stok siap</p>
          </div>
          <div className="tf-card col-span-2">
            <p className="text-sm font-semibold text-green-900">
              {totalUsiaSiap} pcs sudah masuk usia jual
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Sudah cukup umur untuk ditawarkan. Angka stok di atas baru
              bertambah setelah kamu memisahkan stok lewat tombol “Siap jual”.
            </p>
          </div>
        </div>
        <Link href="/batch/baru" className="tf-btn mt-3 inline-block">
          + Batch tanaman baru
        </Link>
      </section>

      {daftar.length === 0 ? (
        <section className="tf-card text-sm text-zinc-600">
          Belum ada batch jual aktif. Buat batch baru → pilih Tujuan
          &quot;🌱 Jual tanaman (mendekati berbuah)&quot;.
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
                    {s.siap === 0 && s.sisaHari != null
                      ? ` • ±${s.sisaHari} hari lagi`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {daftar.map((b) => {
            const kom = satu(b.commodities) as Kom | null;
            const nama = kom?.nama ?? "?";
            const harga = (b.harga_pcs ?? kom?.harga_pcs ?? null) as number | null;
            const hst = hitungHST(b.tgl_tanam, hariIni);
            const st = statusJual({
              hst,
              umurJualMin: kom?.umur_jual_min,
              umurJualMaks: kom?.umur_jual_maks,
              umurPanenMin: kom?.umur_panen_min,
              umurPanenMaks: kom?.umur_panen_maks,
            });
            const stok = Number(b.stok_siap ?? 0);
            const badge = stok > 0 ? `${stok} siap` : badgeJual(st);
            return (
              <Link key={b.id} href={`/batch/${b.id}`} className="tf-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words font-bold text-green-900">
                    {ikonKomoditas(nama)} {nama} × {b.jumlah} pcs
                  </p>
                  {badge && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        stok > 0
                          ? "bg-green-100 text-green-800"
                          : st.fase === "lewat"
                            ? "bg-zinc-200 text-zinc-600"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {(satu(b.locations) as { nama: string } | null)?.nama ?? "-"} •
                  HST {hst}
                  {st.targetMin != null
                    ? ` • usia jual ${st.targetMin} HST`
                    : ""}
                  {harga ? ` • Rp ${Number(harga).toLocaleString("id-ID")}/pcs` : ""}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{st.label}</p>
              </Link>
            );
          })}
          <p className="text-center text-xs text-zinc-500">
            Usia jual diatur per komoditas (default: 15 HST sebelum masa panen).{" "}
            <Link href="/komoditas" className="font-semibold underline">
              Ubah di Komoditas
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
