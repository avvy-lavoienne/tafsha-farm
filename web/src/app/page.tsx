import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SeedButton from "@/components/SeedButton";
import CuacaCard from "@/components/CuacaCard";
import { formatTanggal, hariIniISO, hitungHST } from "@/lib/tanggal";
import { ikonKomoditas, ikonMedia } from "@/lib/media";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tamu → landing publik (boleh dibuka tanpa login, lihat middleware).
  if (!user) redirect("/landing.html");

  const hariIni = hariIniISO();

  const [lokasiRes, tugasRes, batchRes, panenRes] = await Promise.all([
    supabase.from("locations").select("id,nama").eq("aktif", true),
    supabase.from("care_tasks").select("id").eq("due_date", hariIni),
    supabase
      .from("plant_batches")
      .select(
        "id,jumlah,tgl_tanam,status,location_id,commodities(nama,umur_panen_min,umur_panen_maks),locations(nama),sub_blocks(nama),media_types(nama)",
      )
      .not("status", "in", "(selesai,gagal)")
      .order("tgl_tanam", { ascending: false }),
    supabase
      .from("harvests")
      .select("jumlah")
      .gte("tanggal", hariIni.slice(0, 7) + "-01"),
  ]);

  // stok menipis: stok <= min_stok (query di atas hanya pendekatan; saring manual)
  const { data: semuaSarana } = await supabase
    .from("supplies")
    .select("id,stok,min_stok");
  const menipis =
    semuaSarana?.filter((s) => Number(s.stok) <= Number(s.min_stok)).length ??
    0;

  const tugas = tugasRes.data ?? [];
  const batchAktif = batchRes.data ?? [];
  const daftarLokasi = lokasiRes.data ?? [];

  // Rangkuman per batch untuk kartu "Isi kebun"
  type Ringkas = {
    id: string;
    komoditas: string;
    media: string;
    lokasi: string;
    subBlok: string | null;
    jumlah: number;
    hst: number;
    siap: boolean;
    dekatPanen: boolean;
  };
  const ringkasan: Ringkas[] = [];
  let siapPanen = 0;
  for (const b of batchAktif) {
    const kom = Array.isArray(b.commodities)
      ? b.commodities[0]
      : (b.commodities as {
          nama: string | null;
          umur_panen_min: number | null;
          umur_panen_maks: number | null;
        } | null);
    const lok = Array.isArray(b.locations)
      ? b.locations[0]
      : (b.locations as { nama: string | null } | null);
    const blok = Array.isArray(b.sub_blocks)
      ? b.sub_blocks[0]
      : (b.sub_blocks as { nama: string | null } | null);
    const med = Array.isArray(b.media_types)
      ? b.media_types[0]
      : (b.media_types as { nama: string | null } | null);
    const hst = hitungHST(b.tgl_tanam);
    const siap = kom?.umur_panen_min != null && hst >= kom.umur_panen_min;
    const sisa =
      kom?.umur_panen_min != null ? kom.umur_panen_min - hst : null;
    if (siap) siapPanen++;
    ringkasan.push({
      id: b.id,
      komoditas: kom?.nama ?? "?",
      media: med?.nama ?? "-",
      lokasi: lok?.nama ?? "-",
      subBlok: blok?.nama ?? null,
      jumlah: b.jumlah,
      hst,
      siap,
      dekatPanen: !siap && sisa != null && sisa >= 0 && sisa <= 7,
    });
  }

  const perLokasi = daftarLokasi.map((l) => ({
    ...l,
    batch: ringkasan.filter((r) =>
      batchAktif.some((b) => b.id === r.id && b.location_id === l.id),
    ),
  }));

  const totalPanenBulanIni = (panenRes.data ?? []).reduce(
    (a, p) => a + Number(p.jumlah ?? 0),
    0,
  );

  // Belum seed: tidak ada lokasi sama sekali
  if ((lokasiRes.data ?? []).length === 0 && batchAktif.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <section className="tf-card">
          <h1 className="text-xl font-bold text-green-900">
            Akun sudah masuk 🎉
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Tinggal satu langkah: isi data awal kebun (2 lokasi, 4 tipe media,
            9 komoditas).
          </p>
          <div className="mt-3">
            <SeedButton />
          </div>
        </section>
        <MenuGrid />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="tf-card lg:col-span-2 lg:row-span-2">
        <p className="tf-eyebrow">Kebun hari ini</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#18181b] lg:text-3xl">
          Selamat berkebun 🌱
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {tugas.length === 0
            ? "Tidak ada pengingat hari ini. Santai 🎉"
            : `${tugas.length} pengingat perlu dibaca — tanpa centang, tanpa laporan.`}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            angka={String(tugas.length)}
            label="Pengingat hari ini"
            href="/tugas"
          />
          <StatCard
            angka={String(siapPanen)}
            label="Siap panen"
            href="/batch"
          />
          <StatCard
            angka={String(batchAktif.length)}
            label="Batch aktif"
            href="/batch"
          />
          <StatCard
            angka={String(totalPanenBulanIni)}
            label="Panen bulan ini"
            href="/panen"
          />
        </div>
      </section>

      <CuacaCard mode="beranda" />

      {menipis > 0 && (
        <Link
          href="/sarana"
          className="tf-card border-l-4 border-l-amber-500 text-sm font-medium text-amber-800"
        >
          ⚠️ {menipis} sarana di bawah stok minimum. Cek persediaan.
        </Link>
      )}

      {batchAktif.length === 0 ? (
        <section className="tf-card">
          <h1 className="text-xl font-bold text-green-900">
            Belum ada tanaman
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Data dasar sudah ada. Tambahkan batch tanam pertamamu — misal cabai
            di galon 15L — supaya tugas siram otomatis muncul tiap pagi.
          </p>
          <Link
            href="/batch"
            className="mt-3 inline-block tf-btn"
          >
            + Tambah batch tanam
          </Link>
        </section>
      ) : (
        <section className="tf-card">
          <h2 className="font-bold text-green-900">
            🔔 Pengingat hari ini ({formatTanggal(hariIni)})
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {tugas.length === 0
              ? "Tidak ada pengingat hari ini. Santai 🎉"
              : `${tugas.length} hal perlu dikerjakan — dibaca saja, tidak perlu laporan.`}
          </p>
          <Link
            href="/tugas"
            className="mt-3 inline-block tf-btn"
          >
            Lihat pengingat
          </Link>
        </section>
      )}

      <div className="lg:col-span-3">
        <MenuGrid />
      </div>

      {ringkasan.length > 0 && (
        <section className="tf-card lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="tf-eyebrow">Isi kebun</p>
              <h2 className="mt-1 font-bold text-green-900">
                🌱 Rangkuman tanaman ({ringkasan.length} batch)
              </h2>
            </div>
            <Link href="/kebun" className="tf-btn-kecil tf-btn-abu shrink-0">
              Kelola kebun →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {perLokasi.map((l) => (
              <div key={l.id} className="tf-item">
                <p className="text-sm font-bold text-green-900">
                  📍 {l.nama}{" "}
                  <span className="font-normal text-zinc-500">
                    ({l.batch.length} batch)
                  </span>
                </p>
                {l.batch.length === 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Belum ada batch di sini.{" "}
                    <Link
                      href="/batch/baru"
                      className="font-semibold text-green-800 underline"
                    >
                      Tanam baru →
                    </Link>
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {l.batch.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/batch/${r.id}`}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {ikonKomoditas(r.komoditas)} {r.komoditas} ×{" "}
                            {r.jumlah}{" "}
                            <span className="text-xs text-zinc-500">
                              {r.subBlok ? `${r.subBlok} • ` : ""}
                              {ikonMedia(r.media)} {r.media} • HST {r.hst}
                            </span>
                          </span>
                          {r.siap ? (
                            <span className="shrink-0 rounded-full bg-[#166534] px-2 py-0.5 text-[11px] font-semibold text-white">
                              Siap panen
                            </span>
                          ) : r.dekatPanen ? (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              Segera panen
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                    {l.batch.length > 5 && (
                      <li>
                        <Link
                          href={`/batch?lokasi=${l.id}`}
                          className="text-xs font-semibold text-green-800 underline"
                        >
                          + {l.batch.length - 5} batch lagi →
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  angka,
  label,
  href,
}: {
  angka: string;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="tf-card">
      <p className="text-2xl font-bold text-[#166534]">{angka}</p>
      <p className="mt-1 text-xs text-zinc-600">{label}</p>
    </Link>
  );
}

function MenuGrid() {
  const CARDS = [
    { title: "Pengingat", desc: "Apa yang perlu dikerjakan", href: "/tugas" },
    { title: "Tanam", desc: "Batch per galon/polybag", href: "/batch" },
    { title: "Kebun", desc: "2 lokasi + sub-blok", href: "/kebun" },
    { title: "Panen", desc: "Hasil kg / ikat / buah", href: "/panen" },
    { title: "Sarana", desc: "Benih, pupuk & media", href: "/sarana" },
    { title: "Komoditas", desc: "9 komoditas + SOP", href: "/komoditas" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {CARDS.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          className="tf-card"
        >
          <p className="font-semibold text-[#166534]">{c.title}</p>
          <p className="mt-1 text-xs text-zinc-600">{c.desc}</p>
        </Link>
      ))}
    </div>
  );
}
