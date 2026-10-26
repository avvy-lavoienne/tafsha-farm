"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hariIniISO } from "@/lib/tanggal";
import { ikonMedia } from "@/lib/media";

type Opsi = { id: string; nama: string; aktif?: boolean | null };
type SubBlok = { id: string; nama: string; location_id: string };

export default function BatchForm({
  komoditas,
  lokasi,
  subBlok,
  media,
  edit,
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
  };
}) {
  const [commodityId, setCommodityId] = useState(
    edit?.commodity_id ?? komoditas[0]?.id ?? "",
  );
  const [locationId, setLocationId] = useState(
    edit?.location_id ?? lokasi[0]?.id ?? "",
  );
  const [subBlockId, setSubBlockId] = useState(edit?.sub_block_id ?? "");
  const [mediaTypeId, setMediaTypeId] = useState(
    edit?.media_type_id ?? media[0]?.id ?? "",
  );
  const [jumlah, setJumlah] = useState(String(edit?.jumlah ?? "5"));
  const [tglTanam, setTglTanam] = useState(edit?.tgl_tanam ?? hariIniISO());
  const [tglSemai, setTglSemai] = useState(edit?.tgl_semai ?? "");
  const [catatan, setCatatan] = useState(edit?.catatan ?? "");
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

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
        const { error } = await supabase
          .from("plant_batches")
          .update({
            commodity_id: commodityId,
            location_id: locationId,
            sub_block_id: subBlockId || null,
            media_type_id: mediaTypeId,
            jumlah: Number(jumlah) || 1,
            tgl_tanam: tglTanam,
            tgl_semai: tglSemai || null,
            catatan: catatan || null,
          })
          .eq("id", edit.id);
        if (error) throw error;
        window.location.href = `/batch/${edit.id}`;
        return;
      }

      const { data: batch, error } = await supabase
        .from("plant_batches")
        .insert({
          user_id: user.id,
          commodity_id: commodityId,
          location_id: locationId,
          sub_block_id: subBlockId || null,
          media_type_id: mediaTypeId,
          jumlah: Number(jumlah) || 1,
          tgl_tanam: tglTanam,
          tgl_semai: tglSemai || null,
          status: "tumbuh",
          catatan: catatan || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Tugas siram otomatis 30 hari ke depan
      const tugas = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(tglTanam + "T00:00:00");
        d.setDate(d.getDate() + i);
        tugas.push({
          user_id: user.id,
          batch_id: batch.id,
          jenis: "siram",
          due_date: d.toISOString().slice(0, 10),
          status: "belum",
        });
      }
      const { error: errTugas } = await supabase
        .from("care_tasks")
        .insert(tugas);
      if (errTugas) throw errTugas;

      window.location.href = `/batch/${batch.id}`;
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
              {k.nama}
              {k.aktif === false ? " (rencana)" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Media
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
        <label className="text-sm font-medium">
          Jumlah wadah
          <input
            type="number"
            min={1}
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="mt-1 tf-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          Tgl semai (opsional)
          <input
            type="date"
            value={tglSemai}
            onChange={(e) => setTglSemai(e.target.value)}
            className="mt-1 tf-input"
          />
        </label>
      </div>

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
        {sibuk ? "Menyimpan..." : edit ? "Simpan perubahan" : "Simpan batch"}
      </button>
    </div>
  );
}
