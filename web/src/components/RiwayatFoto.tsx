import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import UnggahFoto, { type SubjekFoto } from "@/components/UnggahFoto";

// Galeri riwayat: foto utama + 6 foto terakhir subjek ini.
// Dipakai di detail batch (live update tiap upload karena router refresh).
export default async function RiwayatFoto({
  subjek,
  id,
  fotoUtama,
  judul,
}: {
  subjek: SubjekFoto;
  id: string;
  fotoUtama: string | null;
  judul?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kebun_foto")
    .select("id,foto_url,created_at")
    .eq("subjek_tipe", subjek)
    .eq("subjek_id", id)
    .order("created_at", { ascending: false })
    .limit(6);
  const riwayat = data ?? [];

  return (
    <section className="tf-card">
      <h2 className="font-bold text-green-900">📷 {judul ?? "Foto progres"}</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Foto terbaru jadi sampul. Semua foto otomatis masuk galeri landing.
      </p>
      {fotoUtama && (
        <Image
          src={fotoUtama}
          alt="Foto terbaru"
          width={800}
          height={400}
          loading="lazy"
          className="mt-2 h-52 w-full rounded-2xl object-cover"
        />
      )}
      <div className="mt-2">
        <UnggahFoto subjek={subjek} id={id} label="Tambah foto progres" />
      </div>
      {riwayat.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {riwayat.slice(1).map((f) => (
            <a key={f.id} href={f.foto_url} target="_blank" rel="noreferrer">
              <Image
                src={f.foto_url}
                alt={`Foto ${new Date(f.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                width={200}
                height={120}
                loading="lazy"
                className="h-20 w-full rounded-xl object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {!fotoUtama && riwayat.length === 0 && (
        <p className="mt-2 text-sm text-zinc-500">
          Belum ada foto. Foto pertama yang diunggah jadi sampul.
        </p>
      )}
    </section>
  );
}
