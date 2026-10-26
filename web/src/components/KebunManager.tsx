"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ikonKomoditas, ikonMedia } from "@/lib/media";
import MiniSpin from "@/components/MiniSpin";

type SubBlok = { id: string; location_id: string; nama: string };
type LokasiItem = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  aktif: boolean;
  subBlok: SubBlok[];
  batch: {
    id: string;
    komoditas: string;
    media: string;
    subBlok: string | null;
    jumlah: number;
    hst: number;
    siap: boolean;
  }[];
  batchAktif: number;
  siapPanen: number;
};

export default function KebunManager({
  awal,
}: {
  awal: LokasiItem[];
}) {
  const router = useRouter();
  const [daftar, setDaftar] = useState<LokasiItem[]>(awal);
  const [tambahBuka, setTambahBuka] = useState(false);
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [blokBaru, setBlokBaru] = useState<Record<string, string>>({});
  const [editBlokId, setEditBlokId] = useState<string | null>(null);
  const [editBlokNama, setEditBlokNama] = useState("");
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

  async function tambahLokasi() {
    if (!kode.trim() || !nama.trim()) {
      setPesan("Kode dan nama lokasi wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase, userId } = await uid();
      const { data, error } = await supabase
        .from("locations")
        .insert({
          user_id: userId,
          kode: kode.trim(),
          nama: nama.trim(),
          deskripsi: deskripsi.trim() || null,
          aktif: true,
        })
        .select("id,kode,nama,deskripsi,aktif")
        .single();
      if (error) throw error;
      setDaftar((d) => [
        ...d,
        { ...data, subBlok: [], batch: [], batchAktif: 0, siapPanen: 0 },
      ]);
      setKode("");
      setNama("");
      setDeskripsi("");
      setTambahBuka(false);
      segarkan();
    } catch (e) {
      setPesan(
        e instanceof Error && e.message.includes("duplicate")
          ? "Kode lokasi sudah dipakai. Gunakan kode lain."
          : e instanceof Error
            ? e.message
            : "Gagal menambah lokasi.",
      );
    } finally {
      setSibuk(false);
    }
  }

  function mulaiEdit(l: LokasiItem) {
    setEditId(l.id);
    setEditNama(l.nama);
    setEditDeskripsi(l.deskripsi ?? "");
  }

  async function simpanEdit(id: string) {
    if (!editNama.trim()) {
      setPesan("Nama lokasi wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("locations")
        .update({ nama: editNama.trim(), deskripsi: editDeskripsi.trim() || null })
        .eq("id", id);
      if (error) throw error;
      setDaftar((d) =>
        d.map((l) =>
          l.id === id
            ? { ...l, nama: editNama.trim(), deskripsi: editDeskripsi.trim() || null }
            : l,
        ),
      );
      setEditId(null);
      segarkan();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  async function toggleAktif(l: LokasiItem) {
    if (
      l.aktif &&
      l.batchAktif > 0 &&
      !confirm(
        `Masih ada ${l.batchAktif} batch aktif di ${l.nama}. Nonaktifkan? Riwayat tetap tersimpan, lokasi hilang dari form batch baru.`,
      )
    )
      return;
    setSibuk(true);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("locations")
        .update({ aktif: !l.aktif })
        .eq("id", l.id);
      if (error) throw error;
      setDaftar((d) =>
        d.map((x) => (x.id === l.id ? { ...x, aktif: !x.aktif } : x)),
      );
      segarkan();
    } catch {
      setPesan("Gagal mengubah status lokasi.");
    } finally {
      setSibuk(false);
    }
  }

  async function tambahBlok(locationId: string) {
    const namaBlok = (blokBaru[locationId] ?? "").trim();
    if (!namaBlok) {
      setPesan("Nama sub-blok wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase, userId } = await uid();
      const { data, error } = await supabase
        .from("sub_blocks")
        .insert({ user_id: userId, location_id: locationId, nama: namaBlok })
        .select("id,location_id,nama")
        .single();
      if (error) throw error;
      setDaftar((d) =>
        d.map((l) =>
          l.id === locationId ? { ...l, subBlok: [...l.subBlok, data] } : l,
        ),
      );
      setBlokBaru((s) => ({ ...s, [locationId]: "" }));
      segarkan();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menambah sub-blok.");
    } finally {
      setSibuk(false);
    }
  }

  function mulaiEditBlok(b: SubBlok) {
    setEditBlokId(b.id);
    setEditBlokNama(b.nama);
  }

  async function simpanEditBlok(locationId: string, blokId: string) {
    if (!editBlokNama.trim()) {
      setPesan("Nama sub-blok wajib diisi.");
      return;
    }
    setSibuk(true);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("sub_blocks")
        .update({ nama: editBlokNama.trim() })
        .eq("id", blokId);
      if (error) throw error;
      setDaftar((d) =>
        d.map((l) =>
          l.id === locationId
            ? {
                ...l,
                subBlok: l.subBlok.map((b) =>
                  b.id === blokId ? { ...b, nama: editBlokNama.trim() } : b,
                ),
              }
            : l,
        ),
      );
      setEditBlokId(null);
      segarkan();
    } catch {
      setPesan("Gagal menyimpan sub-blok.");
    } finally {
      setSibuk(false);
    }
  }

  async function hapusBlok(locationId: string, blokId: string, namaBlok: string) {
    if (!confirm(`Hapus sub-blok "${namaBlok}"?`)) return;
    setSibuk(true);
    try {
      const { supabase } = await uid();
      const { count } = await supabase
        .from("plant_batches")
        .select("id", { count: "exact", head: true })
        .eq("sub_block_id", blokId);
      if ((count ?? 0) > 0) {
        setPesan(
          `Sub-blok "${namaBlok}" dipakai ${count} batch. Tidak bisa dihapus supaya riwayat aman — ubah namanya saja bila perlu.`,
        );
        return;
      }
      const { error } = await supabase.from("sub_blocks").delete().eq("id", blokId);
      if (error) throw error;
      setDaftar((d) =>
        d.map((l) =>
          l.id === locationId
            ? { ...l, subBlok: l.subBlok.filter((b) => b.id !== blokId) }
            : l,
        ),
      );
      segarkan();
    } catch {
      setPesan("Gagal menghapus sub-blok.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-green-900">Kebun</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {daftar.length} lokasi •{" "}
              {daftar.reduce((a, l) => a + l.subBlok.length, 0)} sub-blok •{" "}
              {daftar.reduce((a, l) => a + l.batchAktif, 0)} batch aktif
            </p>
          </div>
          <button
            onClick={() => setTambahBuka((v) => !v)}
            className="tf-btn"
          >
            {tambahBuka ? "Tutup" : "+ Lokasi"}
          </button>
        </div>

        {tambahBuka && (
          <div className="mt-3 flex flex-col gap-2 tf-item">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-medium">
                Kode
                <input
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  placeholder="cth: MUS-01"
                  className="mt-1 tf-input"
                />
              </label>
              <label className="text-sm font-medium">
                Nama
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="cth: Lahan Depan Mushola"
                  className="mt-1 tf-input"
                />
              </label>
            </div>
            <label className="text-sm font-medium">
              Deskripsi (opsional)
              <input
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="cth: petak dekat pagar"
                className="mt-1 tf-input"
              />
            </label>
            <button
              onClick={tambahLokasi}
              disabled={sibuk}
              className="tf-btn"
            >
              {sibuk ? (<><MiniSpin /> Menyimpan...</>) : ("Simpan lokasi")}
            </button>
          </div>
        )}

        {pesan && (
          <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-700">{pesan}</p>
        )}
      </section>

      {daftar.length === 0 && (
        <section className="tf-card text-sm text-zinc-600">
          Belum ada lokasi. Tambahkan lokasi pertama lewat tombol + Lokasi.
        </section>
      )}

      {daftar.map((l) => (
        <section key={l.id} className="tf-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-green-900">
                  {l.nama}
                </p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  {l.kode}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    l.aktif
                      ? "bg-green-100 text-green-800"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {l.aktif ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              {l.deskripsi && (
                <p className="mt-1 text-xs text-zinc-600">{l.deskripsi}</p>
              )}
              <p className="mt-1 text-xs text-zinc-600">
                🌱 {l.batchAktif} batch aktif • ✅ {l.siapPanen} siap panen • 🧱{" "}
                {l.subBlok.length} sub-blok
              </p>
            </div>
          </div>

          {editId === l.id ? (
            <div className="mt-3 flex flex-col gap-2 tf-item">
              <input
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                className="tf-input"
              />
              <input
                value={editDeskripsi}
                onChange={(e) => setEditDeskripsi(e.target.value)}
                placeholder="Deskripsi (opsional)"
                className="tf-input"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => simpanEdit(l.id)}
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
                onClick={() => mulaiEdit(l)}
                className="tf-btn-outline tf-btn-kecil"
              >
                Edit
              </button>
              <button
                onClick={() => toggleAktif(l)}
                disabled={sibuk}
                className={`tf-btn-kecil tf-btn-abu ${
                  l.aktif
                    ? "border-zinc-300 text-zinc-600"
                    : "border-green-700 text-green-800"
                }`}
              >
                {l.aktif ? "Nonaktifkan" : "Aktifkan lagi"}
              </button>
              <a
                href={`/batch?lokasi=${l.id}`}
                className="tf-btn-kecil tf-btn-abu"
              >
                Lihat batch →
              </a>
            </div>
          )}

          <div className="mt-4 border-t pt-3">
            <p className="text-sm font-semibold text-green-900">
              Batch di lokasi ini ({l.batch.length})
            </p>
            {l.batch.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                Belum ada batch aktif di sini.{" "}
                <a href="/batch/baru" className="font-semibold text-green-800 underline">
                  Tanam baru →
                </a>
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {l.batch.map((bt) => (
                  <li key={bt.id}>
                    <a
                      href={`/batch/${bt.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-green-900">
                          {ikonKomoditas(bt.komoditas)} {bt.komoditas} × {bt.jumlah}
                        </span>
                        <span className="block truncate text-xs text-zinc-600">
                          {bt.subBlok ? `${bt.subBlok} • ` : ""}
                          {ikonMedia(bt.media)} {bt.media} • HST {bt.hst}
                        </span>
                      </span>
                      {bt.siap && (
                        <span className="shrink-0 rounded-full bg-[#166534] px-2 py-0.5 text-xs font-semibold text-white">
                          Siap panen
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 border-t pt-3">
            <p className="text-sm font-semibold text-green-900">Sub-blok</p>
            {l.subBlok.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                Belum ada sub-blok. Tambahkan misal Blok A, Rak Galon.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {l.subBlok.map((b) =>
                  editBlokId === b.id ? (
                    <li key={b.id} className="flex gap-2">
                      <input
                        value={editBlokNama}
                        onChange={(e) => setEditBlokNama(e.target.value)}
                        className="tf-input"
                      />
                      <button
                        onClick={() => simpanEditBlok(l.id, b.id)}
                        disabled={sibuk}
                        className="shrink-0 tf-btn"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditBlokId(null)}
                        className="shrink-0 tf-btn-kecil tf-btn-abu"
                      >
                        Batal
                      </button>
                    </li>
                  ) : (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2"
                    >
                      <span className="text-sm font-medium text-green-900">
                        {b.nama}
                      </span>
                      <span className="flex shrink-0 gap-2">
                        <button
                          onClick={() => mulaiEditBlok(b)}
                          className="text-xs font-semibold text-green-800 underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => hapusBlok(l.id, b.id, b.nama)}
                          className="text-xs font-semibold text-red-700 underline"
                        >
                          Hapus
                        </button>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={blokBaru[l.id] ?? ""}
                onChange={(e) =>
                  setBlokBaru((s) => ({ ...s, [l.id]: e.target.value }))
                }
                placeholder="Nama sub-blok baru, cth: Blok C"
                className="tf-input"
              />
              <button
                onClick={() => tambahBlok(l.id)}
                disabled={sibuk}
                className="shrink-0 tf-btn"
              >
                + Tambah
              </button>
            </div>
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-zinc-500">
        Menonaktifkan lokasi tidak menghapus riwayat batch. Lokasi nonaktif
        hilang dari form batch baru. Sub-blok yang sudah dipakai batch tidak
        bisa dihapus.
      </p>
    </div>
  );
}
