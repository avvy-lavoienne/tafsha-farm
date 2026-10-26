import { createClient } from "@/lib/supabase/server";
import SeedButton from "@/components/SeedButton";
import { formatTanggal, hariIniISO, hitungHST } from "@/lib/tanggal";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <section className="tf-card">
          <h1 className="text-xl font-bold text-green-900">
            Selamat datang di Tafsha Farm
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Catat tanam, rawat, dan panen di Halaman Depan & Lahan Mushola.
            Masuk dulu untuk melihat tugas hari ini.
          </p>
          <a
            href="/masuk"
            className="mt-3 inline-block tf-btn"
          >
            Masuk / Daftar
          </a>
        </section>
        <MenuGrid />
      </div>
    );
  }

  const hariIni = hariIniISO();

  const [lokasiRes, tugasRes, batchRes, panenRes] = await Promise.all([
    supabase.from("locations").select("id").eq("aktif", true),
    supabase.from("care_tasks").select("id").eq("due_date", hariIni),
    supabase
      .from("plant_batches")
      .select("id,commodity_id,tgl_tanam,status,commodities(umur_panen_min)")
      .not("status", "in", "(selesai,gagal)"),
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

  // Siap panen: HST >= umur_panen_min
  let siapPanen = 0;
  for (const b of batchAktif) {
    const min = Array.isArray(b.commodities)
      ? b.commodities[0]?.umur_panen_min
      : (b.commodities as { umur_panen_min: number | null } | null)
          ?.umur_panen_min;
    if (min != null && hitungHST(b.tgl_tanam) >= min) siapPanen++;
  }

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
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <p className="tf-eyebrow">Kebun hari ini</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#18181b]">
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

      {menipis > 0 && (
        <a
          href="/sarana"
          className="tf-card border-l-4 border-l-amber-500 text-sm font-medium text-amber-800"
        >
          ⚠️ {menipis} sarana di bawah stok minimum. Cek persediaan.
        </a>
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
          <a
            href="/batch"
            className="mt-3 inline-block tf-btn"
          >
            + Tambah batch tanam
          </a>
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
          <a
            href="/tugas"
            className="mt-3 inline-block tf-btn"
          >
            Lihat pengingat
          </a>
        </section>
      )}

      <MenuGrid />
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
    <a href={href} className="tf-card">
      <p className="text-2xl font-bold text-[#166534]">{angka}</p>
      <p className="mt-1 text-xs text-zinc-600">{label}</p>
    </a>
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
    <div className="grid grid-cols-2 gap-3">
      {CARDS.map((c) => (
        <a
          key={c.title}
          href={c.href}
          className="tf-card"
        >
          <p className="font-semibold text-[#166534]">{c.title}</p>
          <p className="mt-1 text-xs text-zinc-600">{c.desc}</p>
        </a>
      ))}
    </div>
  );
}
