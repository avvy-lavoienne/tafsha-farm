"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ikonKomoditas } from "@/lib/media";
import MiniSpin from "@/components/MiniSpin";

export type KomoditasItem = {
  id: string;
  nama: string;
  tipe_panen: string | null;
  umur_panen_min: number | null;
  umur_panen_maks: number | null;
  siram_default: string | null;
  catatan: string | null;
  aktif: boolean;
  jual_bibit?: boolean | null;
  harga_pcs?: number | null;
  umur_siap_min?: number | null;
  umur_siap_maks?: number | null;
};

const TIPE_PANEN = [
  ["petik_berulang", "Petik berulang"],
  ["sekali", "Sekali panen"],
  ["potong", "Potong (sayur daun)"],
  ["hias", "Hias / rencana"],
] as const;

export default function KomoditasManager({ awal }: { awal: KomoditasItem[] }) {
  const router = useRouter();
  const [daftar, setDaftar] = useState<KomoditasItem[]>(awal);
  const [tambahBuka, setTambahBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<string>("petik_berulang");
  const [umurMin, setUmurMin] = useState("");
  const [umurMaks, setUmurMaks] = useState("");
  const [siram, setSiram] = useState("");
  const [catatan, setCatatan] = useState("");
  const [jual, setJual] = useState(false);
  const [harga, setHarga] = useState("");
  const [siapMin, setSiapMin] = useState("");
  const [siapMaks, setSiapMaks] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    nama: "",
    tipe_panen: "petik_berulang",
    umurMin: "",
    umurMaks: "",
    siram: "",
    catatan: "",
    jual: false,
    harga: "",
    siapMin: "",
    siapMaks: "",
  });
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function uid() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Harus masuk dulu.");
    return { supabase, userId: user.id };
  }

  function segarkan() {
    router.refresh();
  }

  function pesanDuplikat(e: unknown, fallback: string): string {
    if (e instanceof Error) {
      if (e.message.includes("duplicate")) return "Nama komoditas sudah dipakai. Gunakan nama lain.";
      const kode = (e as { code?: string }).code;
      if (kode === "23505") return "Nama komoditas sudah dipakai. Gunakan nama lain.";
      return e.message;
    }
    return fallback;
  }

  async function tambah() {
    if (!nama.trim()) {
      setPesan("Nama komoditas wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase, userId } = await uid();
      const { data, error } = await supabase
        .from("commodities")
        .insert({
          user_id: userId,
          nama: nama.trim(),
          tipe_panen: tipe,
          umur_panen_min: umurMin ? Number(umurMin) : null,
          umur_panen_maks: umurMaks ? Number(umurMaks) : null,
          siram_default: siram.trim() || null,
          catatan: catatan.trim() || null,
          aktif: true,
          jual_bibit: jual,
          harga_pcs: harga ? Number(harga) : null,
          umur_siap_min: siapMin ? Number(siapMin) : null,
          umur_siap_maks: siapMaks ? Number(siapMaks) : null,
        })
        .select(
          "id,nama,tipe_panen,umur_panen_min,umur_panen_maks,siram_default,catatan,aktif,jual_bibit,harga_pcs,umur_siap_min,umur_siap_maks",
        )
        .single();
      if (error) throw error;
      setDaftar((d) => [...d, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setNama("");
      setTipe("petik_berulang");
      setUmurMin("");
      setUmurMaks("");
      setSiram("");
      setCatatan("");
      setJual(false);
      setHarga("");
      setSiapMin("");
      setSiapMaks("");
      setTambahBuka(false);
      segarkan();
    } catch (e) {
      setPesan(pesanDuplikat(e, "Gagal menambah komoditas."));
    } finally {
      setSibuk(false);
    }
  }

  function mulaiEdit(k: KomoditasItem) {
    setEditId(k.id);
    setEdit({
      nama: k.nama,
      tipe_panen: k.tipe_panen ?? "petik_berulang",
      umurMin: k.umur_panen_min != null ? String(k.umur_panen_min) : "",
      umurMaks: k.umur_panen_maks != null ? String(k.umur_panen_maks) : "",
      siram: k.siram_default ?? "",
      catatan: k.catatan ?? "",
      jual: Boolean(k.jual_bibit),
      harga: k.harga_pcs != null ? String(k.harga_pcs) : "",
      siapMin: k.umur_siap_min != null ? String(k.umur_siap_min) : "",
      siapMaks: k.umur_siap_maks != null ? String(k.umur_siap_maks) : "",
    });
  }

  async function simpanEdit(id: string) {
    if (!edit.nama.trim()) {
      setPesan("Nama komoditas wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("commodities")
        .update({
          nama: edit.nama.trim(),
          tipe_panen: edit.tipe_panen,
          umur_panen_min: edit.umurMin ? Number(edit.umurMin) : null,
          umur_panen_maks: edit.umurMaks ? Number(edit.umurMaks) : null,
          siram_default: edit.siram.trim() || null,
          catatan: edit.catatan.trim() || null,
          jual_bibit: edit.jual,
          harga_pcs: edit.harga ? Number(edit.harga) : null,
          umur_siap_min: edit.siapMin ? Number(edit.siapMin) : null,
          umur_siap_maks: edit.siapMaks ? Number(edit.siapMaks) : null,
        })
        .eq("id", id);
      if (error) throw error;
      // Aturan: ubah siram_default hanya untuk batch BARU (tugas batch lama
      // tidak disentuh — tabel care_tasks tidak di-update di sini).
      setDaftar((d) =>
        d.map((k) =>
          k.id === id
            ? {
                ...k,
                nama: edit.nama.trim(),
                tipe_panen: edit.tipe_panen,
                umur_panen_min: edit.umurMin ? Number(edit.umurMin) : null,
                umur_panen_maks: edit.umurMaks ? Number(edit.umurMaks) : null,
                siram_default: edit.siram.trim() || null,
                catatan: edit.catatan.trim() || null,
                jual_bibit: edit.jual,
                harga_pcs: edit.harga ? Number(edit.harga) : null,
                umur_siap_min: edit.siapMin ? Number(edit.siapMin) : null,
                umur_siap_maks: edit.siapMaks ? Number(edit.siapMaks) : null,
              }
            : k,
        ),
      );
      setEditId(null);
      segarkan();
    } catch (e) {
      setPesan(pesanDuplikat(e, "Gagal menyimpan."));
    } finally {
      setSibuk(false);
    }
  }

  async function toggleAktif(k: KomoditasItem) {
    if (
      k.aktif &&
      !confirm(
        `Nonaktifkan "${k.nama}"? Riwayat batch tetap tersimpan, komoditas hilang dari form batch baru.`,
      )
    )
      return;
    setSibuk(true);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("commodities")
        .update({ aktif: !k.aktif })
        .eq("id", k.id);
      if (error) throw error;
      setDaftar((d) =>
        d.map((x) => (x.id === k.id ? { ...x, aktif: !x.aktif } : x)),
      );
      segarkan();
    } catch {
      setPesan("Gagal mengubah status komoditas.");
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(k: KomoditasItem) {
    if (!confirm(`Hapus "${k.nama}" permanen?`)) return;
    setSibuk(true);
    try {
      const { supabase } = await uid();
      const { count } = await supabase
        .from("plant_batches")
        .select("id", { count: "exact", head: true })
        .eq("commodity_id", k.id);
      if ((count ?? 0) > 0) {
        setPesan(
          `"${k.nama}" dipakai ${count} batch. Tidak bisa dihapus supaya riwayat aman — nonaktifkan saja bila tidak ditanam lagi.`,
        );
        return;
      }
      const { error } = await supabase
        .from("commodities")
        .delete()
        .eq("id", k.id);
      if (error) throw error;
      setDaftar((d) => d.filter((x) => x.id !== k.id));
      segarkan();
    } catch {
      setPesan("Gagal menghapus komoditas.");
    } finally {
      setSibuk(false);
    }
  }

  const aktif = daftar.filter((k) => k.aktif).length;
  const jualCount = daftar.filter((k) => k.jual_bibit).length;

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-green-900">Komoditas</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {daftar.length} komoditas • {aktif} aktif •{" "}
              {daftar.length - aktif} rencana • 🌱 {jualCount} jual bibit
            </p>
          </div>
          <button onClick={() => setTambahBuka((v) => !v)} className="tf-btn">
            {tambahBuka ? "Tutup" : "+ Komoditas"}
          </button>
        </div>

        {tambahBuka && (
          <div className="tf-item mt-3 flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="text-sm font-medium">
                Nama
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="cth: Tomat"
                  className="tf-input mt-1"
                />
              </label>
              <label className="text-sm font-medium">
                Tipe panen
                <select
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="tf-input mt-1"
                >
                  {TIPE_PANEN.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label className="text-sm font-medium">
                Umur min (HST)
                <input
                  type="number"
                  min={0}
                  value={umurMin}
                  onChange={(e) => setUmurMin(e.target.value)}
                  placeholder="cth: 60"
                  className="tf-input mt-1"
                />
              </label>
              <label className="text-sm font-medium">
                Umur maks (HST)
                <input
                  type="number"
                  min={0}
                  value={umurMaks}
                  onChange={(e) => setUmurMaks(e.target.value)}
                  placeholder="cth: 75"
                  className="tf-input mt-1"
                />
              </label>
              <label className="col-span-2 text-sm font-medium">
                Siram default
                <input
                  value={siram}
                  onChange={(e) => setSiram(e.target.value)}
                  placeholder="cth: 1x pagi"
                  className="tf-input mt-1"
                />
              </label>
            </div>
            <label className="text-sm font-medium">
              Catatan (opsional)
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="cth: Rencana tanam"
                className="tf-input mt-1"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={jual}
                onChange={(e) => setJual(e.target.checked)}
                className="h-5 w-5 accent-green-700"
              />
              🌱 Jual bibit per pcs polybag
            </label>
            {jual && (
              <div className="grid grid-cols-3 gap-2">
                <label className="text-sm font-medium">
                  Harga/pcs (Rp)
                  <input
                    type="number"
                    min={0}
                    value={harga}
                    onChange={(e) => setHarga(e.target.value)}
                    placeholder="cth: 5000"
                    className="tf-input mt-1"
                  />
                </label>
                <label className="text-sm font-medium">
                  Siap min (hari semai)
                  <input
                    type="number"
                    min={0}
                    value={siapMin}
                    onChange={(e) => setSiapMin(e.target.value)}
                    placeholder="cth: 30"
                    className="tf-input mt-1"
                  />
                </label>
                <label className="text-sm font-medium">
                  Siap maks (hari semai)
                  <input
                    type="number"
                    min={0}
                    value={siapMaks}
                    onChange={(e) => setSiapMaks(e.target.value)}
                    placeholder="cth: 45"
                    className="tf-input mt-1"
                  />
                </label>
              </div>
            )}
            <button onClick={tambah} disabled={sibuk} className="tf-btn">
              {sibuk ? (
                <>
                  <MiniSpin /> Menyimpan...
                </>
              ) : (
                "Simpan komoditas"
              )}
            </button>
          </div>
        )}

        {pesan && (
          <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-700">
            {pesan}
          </p>
        )}
      </section>

      {daftar.length === 0 && (
        <section className="tf-card text-sm text-zinc-600">
          Belum ada komoditas. Tambahkan komoditas pertama lewat tombol +
          Komoditas.
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {daftar.map((k) => (
          <section key={k.id} className="tf-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-green-900">
                    {ikonKomoditas(k.nama)} {k.nama}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      k.aktif
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {k.aktif ? "Aktif" : "Rencana"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {labelTipe(k.tipe_panen)} • panen HST{" "}
                  {k.umur_panen_min ?? "-"}–{k.umur_panen_maks ?? "-"} • siram:{" "}
                  {k.siram_default ?? "-"}
                </p>
                {k.jual_bibit && (
                  <p className="mt-1 text-xs font-semibold text-green-800">
                    🌱 Bibit
                    {k.harga_pcs != null ? ` • Rp ${Number(k.harga_pcs).toLocaleString("id-ID")}/pcs` : " • harga belum diisi"}
                    {(k.umur_siap_min != null || k.umur_siap_maks != null) &&
                      ` • siap semai ${k.umur_siap_min ?? "-"}–${k.umur_siap_maks ?? "-"} hari`}
                  </p>
                )}
                {k.catatan && (
                  <p className="mt-1 text-xs text-zinc-500">📝 {k.catatan}</p>
                )}
              </div>
            </div>

            {editId === k.id ? (
              <div className="tf-item mt-3 flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                  <input
                    value={edit.nama}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, nama: e.target.value }))
                    }
                    className="tf-input"
                  />
                  <select
                    value={edit.tipe_panen}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, tipe_panen: e.target.value }))
                    }
                    className="tf-input"
                  >
                    {TIPE_PANEN.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                  <input
                    type="number"
                    min={0}
                    value={edit.umurMin}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, umurMin: e.target.value }))
                    }
                    placeholder="Min HST"
                    className="tf-input"
                  />
                  <input
                    type="number"
                    min={0}
                    value={edit.umurMaks}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, umurMaks: e.target.value }))
                    }
                    placeholder="Maks HST"
                    className="tf-input"
                  />
                  <input
                    value={edit.siram}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, siram: e.target.value }))
                    }
                    placeholder="Siram"
                    className="tf-input"
                  />
                </div>
                <input
                  value={edit.catatan}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, catatan: e.target.value }))
                  }
                  placeholder="Catatan (opsional)"
                  className="tf-input"
                />
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={edit.jual}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, jual: e.target.checked }))
                    }
                    className="h-5 w-5 accent-green-700"
                  />
                  🌱 Jual bibit per pcs polybag
                </label>
                {edit.jual && (
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                    <input
                      type="number"
                      min={0}
                      value={edit.harga}
                      onChange={(e) =>
                        setEdit((s) => ({ ...s, harga: e.target.value }))
                      }
                      placeholder="Harga/pcs Rp"
                      className="tf-input"
                    />
                    <input
                      type="number"
                      min={0}
                      value={edit.siapMin}
                      onChange={(e) =>
                        setEdit((s) => ({ ...s, siapMin: e.target.value }))
                      }
                      placeholder="Siap min (hari semai)"
                      className="tf-input"
                    />
                    <input
                      type="number"
                      min={0}
                      value={edit.siapMaks}
                      onChange={(e) =>
                        setEdit((s) => ({ ...s, siapMaks: e.target.value }))
                      }
                      placeholder="Siap maks (hari semai)"
                      className="tf-input"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => simpanEdit(k.id)}
                    disabled={sibuk}
                    className="tf-btn"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded-xl border px-4 py-2 text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => mulaiEdit(k)}
                  className="tf-btn-outline tf-btn-kecil"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleAktif(k)}
                  disabled={sibuk}
                  className="tf-btn-kecil tf-btn-abu"
                >
                  {k.aktif ? "Nonaktifkan" : "Aktifkan lagi"}
                </button>
                <button
                  onClick={() => hapus(k)}
                  disabled={sibuk}
                  className="tf-btn-kecil tf-btn-abu border-red-200 text-red-700"
                >
                  Hapus
                </button>
              </div>
            )}
          </section>
        ))}
      </div>

      <p className="text-center text-xs text-zinc-500">
        Ubah siram default hanya berlaku untuk batch baru — tugas siram batch
        lama tidak diubah. Komoditas yang sudah dipakai batch tidak bisa
        dihapus, nonaktifkan saja.
      </p>
    </div>
  );
}

function labelTipe(t: string | null): string {
  const m: Record<string, string> = {
    petik_berulang: "Petik berulang",
    sekali: "Sekali panen",
    potong: "Potong",
    hias: "Hias",
  };
  return (t && m[t]) || t || "-";
}
