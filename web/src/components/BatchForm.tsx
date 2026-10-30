"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hariIniISO } from "@/lib/tanggal";
import { ikonKomoditas, ikonMedia } from "@/lib/media";
import MiniSpin from "@/components/MiniSpin";

type Opsi = {
  id: string;
  nama: string;
  aktif?: boolean | null;
  siram_default?: string | null;
  jual_bibit?: boolean | null;
  harga_pcs?: number | null;
};
type SubBlok = { id: string; nama: string; location_id: string };

export default function BatchForm({
  komoditas,
  lokasi,
  subBlok,
  media,
  edit,
  duplikat,
}: {
  komoditas: Opsi[];
  lokasi: Opsi[];
  subBlok: SubBlok[];
  media: Opsi[];
  edit?: {
    id: string;
    commodity_id: string;
    location_id: string;
    sub_block_id: string | null;
    media_type_id: string;
    jumlah: number;
    tgl_tanam: string;
    tgl_semai: string | null;
    catatan: string | null;
    tujuan?: string | null;
    harga_pcs?: number | null;
    stok_siap?: number | null;
  };
  duplikat?: {
    commodity_id: string;
    location_id: string;
    sub_block_id: string | null;
    media_type_id: string;
    jumlah: number;
    tgl_semai: string | null;
    catatan: string | null;
    nama: string | null;
    tgl_tanam_asal: string | null;
    tujuan?: string | null;
    harga_pcs?: number | null;
    stok_siap?: number | null;
  } | null;
}) {
  const [commodityId, setCommodityId] = useState(
    edit?.commodity_id ?? duplikat?.commodity_id ?? komoditas[0]?.id ?? "",
  );
  const [locationId, setLocationId] = useState(
    edit?.location_id ?? duplikat?.location_id ?? lokasi[0]?.id ?? "",
  );
  const [subBlockId, setSubBlockId] = useState(edit?.sub_block_id ?? duplikat?.sub_block_id ?? "");
  const [mediaTypeId, setMediaTypeId] = useState(
    edit?.media_type_id ?? duplikat?.media_type_id ?? media[0]?.id ?? "",
  );
  const [jumlah, setJumlah] = useState(String(edit?.jumlah ?? duplikat?.jumlah ?? "5"));
  const [tglTanam, setTglTanam] = useState(edit?.tgl_tanam ?? hariIniISO());
  const [tglSemai, setTglSemai] = useState(edit?.tgl_semai ?? duplikat?.tgl_semai ?? "");
  const [tujuan, setTujuan] = useState(edit?.tujuan ?? duplikat?.tujuan ?? "kebun");
  const [hargaPcs, setHargaPcs] = useState(
    edit?.harga_pcs != null
      ? String(edit.harga_pcs)
      : duplikat?.harga_pcs != null
        ? String(duplikat.harga_pcs)
        : "",
  );
  const [stokAwal, setStokAwal] = useState(
    edit?.stok_siap != null
      ? String(edit.stok_siap)
      : duplikat?.stok_siap != null
        ? String(duplikat.stok_siap)
        : "",
  );
  const [catatan, setCatatan] = useState(
    edit?.catatan ??
      (duplikat
        ? `Duplikat dari ${duplikat.nama ?? "batch"}${duplikat.tgl_tanam_asal ? ` (tanam ${duplikat.tgl_tanam_asal})` : ""}${duplikat.catatan ? ` — ${duplikat.catatan}` : ""}`
        : ""),
  );
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const router = useRouter();

  const subBlokTampil = subBlok.filter((s) => s.location_id === locationId);

  async function simpan() {
    setSibuk(true);
    setPesan(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Harus masuk dulu.");

      if (edit) {
        // Mode edit: ubah data batch, tanpa menyentuh tugas/panen/riwayat.
        // Fallback: bila kolom bibit belum ada (migrasi 0007 belum jalan),
        // simpan versi lama tanpa tujuan/harga/stok.
        const inti = {
          commodity_id: commodityId,
          location_id: locationId,
          sub_block_id: subBlockId || null,
          media_type_id: mediaTypeId,
          jumlah: Number(jumlah) || 1,
          tgl_tanam: tglTanam,
          tgl_semai: tglSemai || null,
          catatan: catatan || null,
        };
        const { error } = await supabase
          .from("plant_batches")
          .update({ ...inti, tujuan, harga_pcs: hargaPcs ? Number(hargaPcs) : null, stok_siap: stokAwal !== "" ? Number(stokAwal) : 0 })
          .eq("id", edit.id)
          .then(async (r) => {
            if (r.error && /tujuan|stok_siap|harga_pcs|column|schema cache/i.test(r.error.message)) {
              return await supabase.from("plant_batches").update(inti).eq("id", edit.id);
            }
            return r;
          });
        if (error) throw error;
        // Tracker: abaikan diam-diam bila tabel batch_moves belum ada.
        await supabase.from("batch_moves").insert({
          user_id: user.id,
          batch_id: edit.id,
          jenis: "catat",
          ke_status: null,
          jumlah: Number(jumlah) || 1,
          sisa: Number(jumlah) || 1,
          stok_siap: stokAwal !== "" ? Number(stokAwal) : 0,
          catatan: "Edit batch",
        }).then(() => undefined, () => undefined);
        router.push(`/batch/${edit.id}`);
        return;
      }

      const hariIni = hariIniISO();
      const komTerpilih = komoditas.find((k) => k.id === commodityId);
      const intiBaru = {
        user_id: user.id,
        commodity_id: commodityId,
        location_id: locationId,
        sub_block_id: subBlockId || null,
        media_type_id: mediaTypeId,
        jumlah: Number(jumlah) || 1,
        tgl_tanam: tglTanam,
        tgl_semai: tglSemai || null,
        status: tglTanam > hariIni ? "semai" : "tumbuh",
        catatan: catatan || null,
      };
      const siapBaru =
        tujuan === "jual"
          ? (stokAwal !== "" ? Number(stokAwal) : Number(jumlah) || 1)
          : 0;
      async function insertBatch() {
        const baru = await supabase
          .from("plant_batches")
          .insert({
            ...intiBaru,
            tujuan: tujuan === "jual" ? "jual" : "kebun",
            harga_pcs: hargaPcs !== "" ? Number(hargaPcs) : (komTerpilih?.harga_pcs ?? null),
            stok_siap: siapBaru,
          })
          .select("id")
          .single();
        if (!baru.error) return baru;
        if (/tujuan|stok_siap|harga_pcs|column|schema cache/i.test(baru.error.message)) {
          return await supabase.from("plant_batches").insert(intiBaru).select("id").single();
        }
        return baru;
      }
      const { data: batch, error } = await insertBatch();
      if (error) throw error;
      await supabase.from("batch_moves").insert({
        user_id: user.id,
        batch_id: batch.id,
        jenis: "semai",
        ke_status: tglTanam > hariIni ? "semai" : "tumbuh",
        jumlah: Number(jumlah) || 1,
        sisa: Number(jumlah) || 1,
        stok_siap: siapBaru,
        catatan:
          tujuan === "jual" ? "Batch bibit jual dibuat" : "Batch kebun dibuat",
      }).then(() => undefined, () => undefined);

      // Tugas siram otomatis 30 hari ke depan.
      // Teks siram bebas ("1x pagi", "suka lembap") tak bisa diparse presisi —
      // hanya pola "2x" yang dispesialkan jadi 2 tugas/hari (pagi+sore);
      // sisanya 1 tugas/hari. Skema care_tasks tanpa kolom waktu/deskripsi,
      // jadi pembeda pagi/sore hanya jumlah baris (2 baris per hari).
      const siramDefault = (
        komoditas.find((k) => k.id === commodityId)?.siram_default ?? ""
      ).toLowerCase();
      const duaKali = siramDefault.includes("2x");
      const tugas = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(tglTanam + "T00:00:00");
        d.setDate(d.getDate() + i);
        const baris = {
          user_id: user.id,
          batch_id: batch.id,
          jenis: "siram",
          due_date: d.toISOString().slice(0, 10),
          status: "belum",
        };
        tugas.push(baris);
        if (duaKali) tugas.push({ ...baris });
      }
      const { error: errTugas } = await supabase
        .from("care_tasks")
        .insert(tugas);
      if (errTugas) throw errTugas;

      router.push(`/batch/${batch.id}`);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Komoditas
        <select
          value={commodityId}
          onChange={(e) => setCommodityId(e.target.value)}
          className="mt-1 tf-input"
        >
          {komoditas.map((k) => (
            <option key={k.id} value={k.id}>
              {ikonKomoditas(k.nama)} {k.nama}
              {k.aktif === false ? " (rencana)" : ""}
              {k.jual_bibit ? " 🌱" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Tujuan batch
          <select
            value={tujuan}
            onChange={(e) => setTujuan(e.target.value)}
            className="mt-1 tf-input"
          >
            <option value="kebun">🏡 Kebun (rawat → panen)</option>
            <option value="jual">🌱 Bibit jual (per pcs)</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Jumlah wadah (pcs)
          <input
            type="number"
            min={1}
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="mt-1 tf-input"
          />
        </label>
      </div>

      {tujuan === "jual" && (
        <div className="tf-item grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Harga/pcs (Rp)
            <input
              type="number"
              min={0}
              value={hargaPcs}
              onChange={(e) => setHargaPcs(e.target.value)}
              placeholder={String(
                komoditas.find((k) => k.id === commodityId)?.harga_pcs ?? "cth: 5000",
              )}
              className="mt-1 tf-input"
            />
          </label>
          <label className="text-sm font-medium">
            Stok siap jual (pcs)
            <input
              type="number"
              min={0}
              value={stokAwal}
              onChange={(e) => setStokAwal(e.target.value)}
              placeholder={`ikut jumlah (${jumlah}) bila kosong`}
              className="mt-1 tf-input"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <label className="text-sm font-medium">
          Lokasi
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setSubBlockId("");
            }}
            className="mt-1 tf-input"
          >
            {lokasi.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nama}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Sub-blok
          <select
            value={subBlockId}
            onChange={(e) => setSubBlockId(e.target.value)}
            className="mt-1 tf-input"
          >
            <option value="">—</option>
            {subBlokTampil.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <label className="text-sm font-medium">
          Media (polybag per pcs)
          <select
            value={mediaTypeId}
            onChange={(e) => setMediaTypeId(e.target.value)}
            className="mt-1 tf-input"
          >
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {ikonMedia(m.nama)} {m.nama}
              </option>
            ))}
          </select>
        </label>
        <p className="self-end text-xs text-zinc-500">
          Jumlah pcs diisi di atas — 1 polybag = 1 pcs bibit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <label className="text-sm font-medium">
          Tgl tanam
          <input
            type="date"
            value={tglTanam}
            onChange={(e) => setTglTanam(e.target.value)}
            className="mt-1 tf-input"
          />
        </label>
        <label className="text-sm font-medium">
          Tanggal semai (opsional)
          <input
            type="date"
            value={tglSemai}
            onChange={(e) => setTglSemai(e.target.value)}
            className="mt-1 tf-input"
          />
        </label>
      </div>
      <p className="text-xs leading-5 text-zinc-500">
        Semai sendiri: isi tanggal semai sebenarnya. Beli bibit: isi perkiraan
        tanggal semainya (mis. tanggal tanam dikurangi umur bibit saat dibeli).
        Kosongkan bila tanam langsung tanpa semai.
      </p>

      <label className="text-sm font-medium">
        Catatan (opsional)
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          className="mt-1 tf-input"
          rows={2}
          placeholder="cth: cabai rawit, galon bekas dicuci dulu"
        />
      </label>

      {pesan && (
        <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{pesan}</p>
      )}

      <button
        onClick={simpan}
        disabled={sibuk || !commodityId || !locationId || !mediaTypeId}
        className="tf-btn"
      >
        {sibuk ? (<><MiniSpin /> Menyimpan...</>) : edit ? ("Simpan perubahan") : ("Simpan batch")}
      </button>
    </div>
  );
}
