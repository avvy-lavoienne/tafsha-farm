"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ikonMedia } from "@/lib/media";
import { formatTanggal, hariIniISO } from "@/lib/tanggal";
import MiniSpin from "@/components/MiniSpin";

export type MediaRingkasan = {
  id: string;
  nama: string;
  ukuran: string | null;
  total: number;
  rusak: number;
  terpakaiHitung: number;
  batchAktif: number;
};

export type SaranaItem = {
  id: string;
  nama: string;
  kategori: string | null;
  stok: number;
  satuan: string | null;
  min_stok: number;
};

export type GerakItem = {
  id: string;
  tanggal: string;
  arah: string;
  jumlah: number;
  supply_id: string;
  supplies: { nama: string | null } | { nama: string | null }[] | null;
};

export default function SaranaManager({
  media,
  awalSarana,
  awalGerak,
}: {
  media: MediaRingkasan[];
  awalSarana: SaranaItem[];
  awalGerak: GerakItem[];
}) {
  const router = useRouter();
  const [daftar, setDaftar] = useState<SaranaItem[]>(awalSarana);
  const [gerak, setGerak] = useState<GerakItem[]>(awalGerak);
  const [tambahBuka, setTambahBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("pupuk");
  const [stok, setStok] = useState("");
  const [satuan, setSatuan] = useState("kg");
  const [minStok, setMinStok] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ nama: "", kategori: "", satuan: "", min_stok: "" });
  const [gerakForm, setGerakForm] = useState<Record<string, { arah: string; jumlah: string }>>({});
  const [mediaEditId, setMediaEditId] = useState<string | null>(null);
  const [mediaEdit, setMediaEdit] = useState({ total: "", rusak: "" });
  const [daftarMedia, setDaftarMedia] = useState<MediaRingkasan[]>(media);
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

  function namaGerak(g: GerakItem): string {
    if (Array.isArray(g.supplies)) return g.supplies[0]?.nama ?? "-";
    return g.supplies?.nama ?? "-";
  }

  function pesanDuplikat(e: unknown, fallback: string): string {
    if (e instanceof Error) {
      if (e.message.includes("duplicate")) return "Nama sarana sudah dipakai. Gunakan nama lain.";
      return e.message;
    }
    return fallback;
  }

  async function tambahSarana() {
    if (!nama.trim()) {
      setPesan("Nama sarana wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase, userId } = await uid();
      const { data, error } = await supabase
        .from("supplies")
        .insert({
          user_id: userId,
          nama: nama.trim(),
          kategori: kategori.trim() || null,
          stok: stok ? Number(stok) : 0,
          satuan: satuan.trim() || null,
          min_stok: minStok ? Number(minStok) : 0,
        })
        .select("id,nama,kategori,stok,satuan,min_stok")
        .single();
      if (error) throw error;
      setDaftar((d) => [...d, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setNama("");
      setStok("");
      setMinStok("");
      setTambahBuka(false);
      segarkan();
    } catch (e) {
      setPesan(pesanDuplikat(e, "Gagal menambah sarana."));
    } finally {
      setSibuk(false);
    }
  }

  function mulaiEdit(s: SaranaItem) {
    setEditId(s.id);
    setEdit({
      nama: s.nama,
      kategori: s.kategori ?? "",
      satuan: s.satuan ?? "",
      min_stok: String(s.min_stok ?? 0),
    });
  }

  async function simpanEdit(id: string) {
    if (!edit.nama.trim()) {
      setPesan("Nama sarana wajib diisi.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("supplies")
        .update({
          nama: edit.nama.trim(),
          kategori: edit.kategori.trim() || null,
          satuan: edit.satuan.trim() || null,
          min_stok: edit.min_stok ? Number(edit.min_stok) : 0,
        })
        .eq("id", id);
      if (error) throw error;
      setDaftar((d) =>
        d.map((s) =>
          s.id === id
            ? {
                ...s,
                nama: edit.nama.trim(),
                kategori: edit.kategori.trim() || null,
                satuan: edit.satuan.trim() || null,
                min_stok: edit.min_stok ? Number(edit.min_stok) : 0,
              }
            : s,
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

  async function hapus(s: SaranaItem) {
    if (!confirm(`Hapus "${s.nama}" permanen? Riwayat beli/pakai ikut terhapus.`)) return;
    setSibuk(true);
    try {
      const { supabase } = await uid();
      const { count } = await supabase
        .from("supply_moves")
        .select("id", { count: "exact", head: true })
        .eq("supply_id", s.id);
      if ((count ?? 0) > 0) {
        setPesan(
          `"${s.nama}" sudah punya ${count} riwayat beli/pakai. Tidak bisa dihapus supaya riwayat aman — biarkan stoknya 0 bila sudah habis.`,
        );
        return;
      }
      const { error } = await supabase.from("supplies").delete().eq("id", s.id);
      if (error) throw error;
      setDaftar((d) => d.filter((x) => x.id !== s.id));
      segarkan();
    } catch {
      setPesan("Gagal menghapus sarana.");
    } finally {
      setSibuk(false);
    }
  }

  async function catatGerak(s: SaranaItem) {
    const f = gerakForm[s.id] ?? { arah: "beli", jumlah: "" };
    const jumlah = Number(f.jumlah);
    if (!jumlah || jumlah <= 0) {
      setPesan(`Jumlah ${f.arah === "beli" ? "beli" : "pakai"} untuk "${s.nama}" wajib diisi.`);
      return;
    }
    if (f.arah === "pakai" && jumlah > Number(s.stok)) {
      setPesan(`Stok "${s.nama}" tinggal ${s.stok}. Tidak bisa pakai ${jumlah} sekaligus.`);
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase, userId } = await uid();
      const stokBaru = f.arah === "beli" ? Number(s.stok) + jumlah : Number(s.stok) - jumlah;
      const { error: errGerak } = await supabase.from("supply_moves").insert({
        user_id: userId,
        supply_id: s.id,
        arah: f.arah,
        jumlah,
        tanggal: hariIniISO(),
      });
      if (errGerak) throw errGerak;
      const { error: errStok } = await supabase
        .from("supplies")
        .update({ stok: stokBaru })
        .eq("id", s.id);
      if (errStok) throw errStok;
      setDaftar((d) => d.map((x) => (x.id === s.id ? { ...x, stok: stokBaru } : x)));
      setGerak((g) => [
        {
          id: `baru-${Date.now()}`,
          tanggal: hariIniISO(),
          arah: f.arah,
          jumlah,
          supply_id: s.id,
          supplies: { nama: s.nama },
        },
        ...g,
      ]);
      setGerakForm((m) => ({ ...m, [s.id]: { arah: "beli", jumlah: "" } }));
      segarkan();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal mencatat.");
    } finally {
      setSibuk(false);
    }
  }

  const menipis = daftar.filter((s) => Number(s.stok) <= Number(s.min_stok)).length;

  function mulaiEditMedia(m: MediaRingkasan) {
    setMediaEditId(m.id);
    setMediaEdit({ total: String(m.total ?? 0), rusak: String(m.rusak ?? 0) });
  }

  async function simpanMedia(m: MediaRingkasan) {
    const total = Number(mediaEdit.total);
    const rusak = Number(mediaEdit.rusak);
    if (!Number.isFinite(total) || total < 0 || !Number.isInteger(total)) {
      setPesan(`Total "${m.nama}" wajib angka bulat 0 atau lebih.`);
      return;
    }
    if (!Number.isFinite(rusak) || rusak < 0 || !Number.isInteger(rusak)) {
      setPesan(`Rusak "${m.nama}" wajib angka bulat 0 atau lebih.`);
      return;
    }
    if (total < m.terpakaiHitung + rusak) {
      setPesan(
        `Total "${m.nama}" (${total}) kurang dari terpakai ${m.terpakaiHitung} + rusak ${rusak}. Tambah dulu wadahnya.`,
      );
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const { supabase } = await uid();
      const { error } = await supabase
        .from("media_stocks")
        .upsert({ media_type_id: m.id, total, rusak }, { onConflict: "media_type_id" });
      if (error) throw error;
      setDaftarMedia((d) => d.map((x) => (x.id === m.id ? { ...x, total, rusak } : x)));
      setMediaEditId(null);
      segarkan();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan stok media.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <p className="tf-eyebrow">Stok media tanam</p>
        <h1 className="mt-1 text-xl font-bold text-green-900">Sarana</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {media.length} tipe media • {daftar.length} sarana •{" "}
          {menipis > 0 ? (
            <span className="font-semibold text-red-700">⚠️ {menipis} menipis</span>
          ) : (
            "stok aman"
          )}
        </p>
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">🪴 Media tanam</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Terpakai dihitung otomatis dari batch aktif. Kosong = total − terpakai − rusak.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {daftarMedia.map((m) => {
            const kosong = Math.max(0, m.total - m.terpakaiHitung - m.rusak);
            return (
              <div key={m.id} className="tf-item">
                <p className="text-sm font-bold text-green-900">
                  {ikonMedia(m.nama)} {m.nama}
                </p>
                {m.ukuran && <p className="text-xs text-zinc-500">{m.ukuran}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                    Total {m.total}
                  </span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                    Terpakai {m.terpakaiHitung}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                    Kosong {kosong}
                  </span>
                  {m.rusak > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                      Rusak {m.rusak}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{m.batchAktif} batch aktif memakai media ini.</p>
                {mediaEditId === m.id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-medium">
                        Total
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={mediaEdit.total}
                          onChange={(e) => setMediaEdit((v) => ({ ...v, total: e.target.value }))}
                          className="tf-input mt-1"
                        />
                      </label>
                      <label className="text-xs font-medium">
                        Rusak
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={mediaEdit.rusak}
                          onChange={(e) => setMediaEdit((v) => ({ ...v, rusak: e.target.value }))}
                          className="tf-input mt-1"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Total wajib ≥ terpakai ({m.terpakaiHitung}) + rusak.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => simpanMedia(m)} disabled={sibuk} className="tf-btn">
                        {sibuk ? (
                          <>
                            <MiniSpin /> Menyimpan...
                          </>
                        ) : (
                          "Simpan"
                        )}
                      </button>
                      <button onClick={() => setMediaEditId(null)} className="rounded-xl border px-4 py-2 text-sm">
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => mulaiEditMedia(m)} className="tf-btn-outline tf-btn-kecil mt-2">
                    Edit total/rusak
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {daftarMedia.length === 0 && (
          <p className="mt-2 text-sm text-zinc-600">Belum ada tipe media.</p>
        )}
      </section>

      <section className="tf-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-green-900">🧪 Benih & pupuk ({daftar.length})</h2>
          <button onClick={() => setTambahBuka((v) => !v)} className="tf-btn">
            {tambahBuka ? "Tutup" : "+ Sarana"}
          </button>
        </div>

        {tambahBuka && (
          <div className="tf-item mt-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 text-sm font-medium md:col-span-1">
                Nama
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="cth: NPK 16-16-16"
                  className="tf-input mt-1"
                />
              </label>
              <label className="text-sm font-medium">
                Kategori
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="tf-input mt-1">
                  {["pupuk", "benih", "pestisida", "media", "alat", "lainnya"].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              <label className="text-sm font-medium">
                Stok awal
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={stok}
                  onChange={(e) => setStok(e.target.value)}
                  placeholder="0"
                  className="tf-input mt-1"
                />
              </label>
              <label className="text-sm font-medium">
                Satuan
                <input
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  placeholder="kg"
                  className="tf-input mt-1"
                />
              </label>
              <label className="text-sm font-medium">
                Min. stok
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={minStok}
                  onChange={(e) => setMinStok(e.target.value)}
                  placeholder="0"
                  className="tf-input mt-1"
                />
              </label>
            </div>
            <button onClick={tambahSarana} disabled={sibuk} className="tf-btn">
              {sibuk ? (
                <>
                  <MiniSpin /> Menyimpan...
                </>
              ) : (
                "Simpan sarana"
              )}
            </button>
          </div>
        )}

        {pesan && (
          <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-700">{pesan}</p>
        )}

        {daftar.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Belum ada sarana. Tambahkan benih/pupuk pertama lewat tombol + Sarana.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {daftar.map((s) => {
              const habis = Number(s.stok) <= Number(s.min_stok);
              const f = gerakForm[s.id] ?? { arah: "beli", jumlah: "" };
              return (
                <div key={s.id} className="tf-item">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-green-900">{s.nama}</p>
                      <p className="text-xs text-zinc-600">
                        {s.kategori ?? "-"} • stok {s.stok} {s.satuan ?? ""} • min {s.min_stok}
                      </p>
                    </div>
                    {habis && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        ⚠️ Menipis
                      </span>
                    )}
                  </div>

                  {editId === s.id ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <input
                        value={edit.nama}
                        onChange={(e) => setEdit((m) => ({ ...m, nama: e.target.value }))}
                        className="tf-input"
                      />
                      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                        <input
                          value={edit.kategori}
                          onChange={(e) => setEdit((m) => ({ ...m, kategori: e.target.value }))}
                          placeholder="Kategori"
                          className="tf-input"
                        />
                        <input
                          value={edit.satuan}
                          onChange={(e) => setEdit((m) => ({ ...m, satuan: e.target.value }))}
                          placeholder="Satuan"
                          className="tf-input"
                        />
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={edit.min_stok}
                          onChange={(e) => setEdit((m) => ({ ...m, min_stok: e.target.value }))}
                          placeholder="Min"
                          className="tf-input"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => simpanEdit(s.id)} disabled={sibuk} className="tf-btn">
                          Simpan
                        </button>
                        <button onClick={() => setEditId(null)} className="rounded-xl border px-4 py-2 text-sm">
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => mulaiEdit(s)} className="tf-btn-outline tf-btn-kecil">
                        Edit
                      </button>
                      <button
                        onClick={() => hapus(s)}
                        disabled={sibuk}
                        className="tf-btn-kecil tf-btn-abu border-red-200 text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  )}

                  <div className="mt-2 flex gap-2 border-t pt-2">
                    <select
                      value={f.arah}
                      onChange={(e) =>
                        setGerakForm((m) => ({ ...m, [s.id]: { ...f, arah: e.target.value } }))
                      }
                      className="tf-input max-w-28"
                    >
                      <option value="beli">Beli +</option>
                      <option value="pakai">Pakai −</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={f.jumlah}
                      onChange={(e) =>
                        setGerakForm((m) => ({ ...m, [s.id]: { ...f, jumlah: e.target.value } }))
                      }
                      placeholder="Jumlah"
                      className="tf-input min-w-0 flex-1"
                    />
                    <button onClick={() => catatGerak(s)} disabled={sibuk} className="tf-btn shrink-0">
                      {sibuk ? <MiniSpin /> : "Catat"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="tf-card">
        <h2 className="font-bold text-green-900">📒 Riwayat beli/pakai (20 terakhir)</h2>
        {gerak.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-600">Belum ada pergerakan stok.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {gerak.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-green-900">
                    {g.arah === "beli" ? "➕" : "➖"} {namaGerak(g)} — {g.jumlah}
                  </span>
                  <span className="block text-xs text-zinc-600">{formatTanggal(g.tanggal)}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    g.arah === "beli" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {g.arah === "beli" ? "Beli" : "Pakai"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-zinc-500">
        Sarana yang sudah punya riwayat beli/pakai tidak bisa dihapus supaya riwayat aman.
      </p>
    </div>
  );
}
