// Outbox M4-2 — antrean offline di IndexedDB, tanpa dependensi baru.
// Dipakai 4 form saat offline: tulis lokal dulu, sinkron otomatis saat online.
import type { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export type TipeAntrean = "activity_log" | "harvest" | "care_task" | "foto";
export type SubjekFoto = "lokasi" | "sub_blok" | "batch";

export type EntriAntrean = {
  id: string;
  tipe: TipeAntrean;
  payload: Record<string, unknown>;
  blob?: Blob;
  created_at: string;
  percobaan: number;
};

const NAMA_DB = "tafsha-farm";
const NAMA_STORE = "outbox";
const MAKS_FOTO = 20;
const MAKS_BYTE = 50 * 1024 * 1024;

// Deteksi error jaringan: tulis gagal di tengah jalan (offline setengah).
export function apakahJaringanGagal(e: unknown): boolean {
  const teks = (e instanceof Error ? `${e.name} ${e.message}` : String(e)).toLowerCase();
  return (
    teks.includes("failed to fetch") ||
    teks.includes("networkerror") ||
    teks.includes("network error") ||
    teks.includes("network request failed") ||
    teks.includes("load failed") ||
    teks.includes("offline")
  );
}

function harusBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let cacheDb: Promise<IDBDatabase> | null = null;

function bukaDb(): Promise<IDBDatabase> {
  if (!harusBrowser())
    return Promise.reject(
      new Error("Browser ini tidak mendukung simpan offline."),
    );
  if (!cacheDb) {
    cacheDb = new Promise<IDBDatabase>((selesai, gagal) => {
      const permintaan = indexedDB.open(NAMA_DB, 1);
      permintaan.onupgradeneeded = () => {
        const db = permintaan.result;
        if (!db.objectStoreNames.contains(NAMA_STORE))
          db.createObjectStore(NAMA_STORE, { keyPath: "id" });
      };
      permintaan.onsuccess = () => selesai(permintaan.result);
      permintaan.onerror = () => {
        cacheDb = null;
        gagal(permintaan.error ?? new Error("Gagal membuka antrean offline."));
      };
    });
  }
  return cacheDb;
}

function denganStore<T>(
  mode: IDBTransactionMode,
  kerja: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return bukaDb().then(
    (db) =>
      new Promise<T>((selesai, gagal) => {
        const req = kerja(db.transaction(NAMA_STORE, mode).objectStore(NAMA_STORE));
        req.onsuccess = () => selesai(req.result);
        req.onerror = () =>
          gagal(req.error ?? new Error("Gagal mengakses antrean offline."));
      }),
  );
}

function buatId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  )
    return crypto.randomUUID();
  return `antre-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function umumkan(): void {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("outbox:berubah"));
}

export async function hitungAntrean(): Promise<number> {
  if (!harusBrowser()) return 0;
  try {
    return await denganStore("readonly", (s) => s.count());
  } catch {
    return 0; // browser lama: anggap kosong
  }
}

export async function ambilSemuaAntrean(): Promise<EntriAntrean[]> {
  if (!harusBrowser()) return [];
  const semua = (await denganStore("readonly", (s) =>
    s.getAll(),
  )) as EntriAntrean[];
  return semua.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export async function hapusAntrean(id: string): Promise<void> {
  await denganStore("readwrite", (s) => s.delete(id));
  umumkan();
}

async function naikkanPercobaan(entri: EntriAntrean): Promise<void> {
  await denganStore("readwrite", (s) =>
    s.put({ ...entri, percobaan: entri.percobaan + 1 }),
  );
}

// Simpan satu baris ke antrean. Kembalikan jumlah antrean terbaru.
// Foto dibatasi 20 antrean / total 50MB dengan pesan ramah.
export async function tambahAntrean(
  tipe: TipeAntrean,
  payload: Record<string, unknown>,
  blob?: Blob,
): Promise<number> {
  if (!harusBrowser())
    throw new Error("Browser ini tidak mendukung simpan offline.");
  if (tipe === "foto") {
    if (!blob) throw new Error("Foto tidak terbaca. Coba foto ulang ya 📷");
    const semua = await ambilSemuaAntrean();
    const foto = semua.filter((e) => e.tipe === "foto");
    const totalByte = foto.reduce((a, e) => a + (e.blob?.size ?? 0), 0);
    if (foto.length >= MAKS_FOTO)
      throw new Error(
        "Galeri offline penuh (20 foto). Saat online, buka aplikasi agar tersinkron otomatis 📶",
      );
    if (totalByte + blob.size > MAKS_BYTE)
      throw new Error(
        "Ruang offline hampir penuh (50MB). Saat online, buka aplikasi agar tersinkron otomatis 📶",
      );
  }
  const entri: EntriAntrean = {
    id: buatId(),
    tipe,
    payload,
    blob,
    created_at: new Date().toISOString(),
    percobaan: 0,
  };
  await denganStore("readwrite", (s) => s.add(entri));
  umumkan();
  return hitungAntrean();
}

const TABEL_SUBJEK: Record<SubjekFoto, string> = {
  lokasi: "locations",
  sub_blok: "sub_blocks",
  batch: "plant_batches",
};

async function kirimSatu(
  supabase: SupabaseClient,
  uid: string,
  entri: EntriAntrean,
): Promise<void> {
  const p = entri.payload as Record<
    string,
    string | number | null | undefined
  >;
  const pemilik = (p.user_id as string | null | undefined) ?? uid;
  if (entri.tipe === "activity_log") {
    const { error } = await supabase.from("activity_logs").insert({
      user_id: pemilik,
      batch_id: p.batch_id,
      jenis: p.jenis,
      deskripsi: p.deskripsi ?? null,
      dosis: p.dosis ?? null,
    });
    if (error) throw error;
    return;
  }
  if (entri.tipe === "harvest") {
    const { error } = await supabase.from("harvests").insert({
      user_id: pemilik,
      batch_id: p.batch_id,
      tanggal: p.tanggal,
      jumlah: p.jumlah,
      satuan: p.satuan,
      kualitas: p.kualitas ?? null,
      peruntukan: p.peruntukan ?? null,
    });
    if (error) throw error;
    return;
  }
  if (entri.tipe === "care_task") {
    const { error } = await supabase.from("care_tasks").insert({
      user_id: pemilik,
      batch_id: p.batch_id,
      jenis: p.jenis,
      due_date: p.due_date,
      status: "belum",
    });
    if (error) throw error;
    return;
  }
  // foto: upload storage (upsert agar retry tidak duplikat) → riwayat → foto utama
  const subjek = p.subjek as SubjekFoto;
  const subjekId = p.subjek_id as string;
  const path = `${pemilik}/${subjek}/${subjekId}/${entri.id}.jpg`;
  const { error: errUp } = await supabase.storage
    .from("kebun-foto")
    .upload(path, entri.blob as Blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (errUp) throw errUp;
  const {
    data: { publicUrl },
  } = supabase.storage.from("kebun-foto").getPublicUrl(path);
  const { error: errRiwayat } = await supabase.from("kebun_foto").insert({
    user_id: pemilik,
    subjek_tipe: subjek,
    subjek_id: subjekId,
    foto_url: publicUrl,
  });
  if (errRiwayat) throw errRiwayat;
  const { error: errUtama } = await supabase
    .from(TABEL_SUBJEK[subjek])
    .update({ foto_url: publicUrl })
    .eq("id", subjekId);
  if (errUtama) throw errUtama;
}

export type HasilSinkron = { berhasil: number; gagal: number };

// Kunci ganda: dua tombol/halaman tidak sinkron paralel (anti duplikat).
let janjiBerjalan: Promise<HasilSinkron> | null = null;

export function sinkronkanAntrean(
  supabase: SupabaseClient,
): Promise<HasilSinkron> {
  if (!janjiBerjalan) {
    janjiBerjalan = jalankanSinkron(supabase).finally(() => {
      janjiBerjalan = null;
    });
  }
  return janjiBerjalan;
}

async function jalankanSinkron(
  supabase: SupabaseClient,
): Promise<HasilSinkron> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Harus masuk dulu untuk sinkron.");
  const antre = await ambilSemuaAntrean();
  let berhasil = 0;
  let gagal = 0;
  for (const entri of antre) {
    try {
      if (entri.tipe === "foto" && !entri.blob) {
        await hapusAntrean(entri.id);
        gagal += 1;
        continue;
      }
      await kirimSatu(supabase, user.id, entri);
      await hapusAntrean(entri.id);
      berhasil += 1;
    } catch {
      gagal += 1;
      try {
        await naikkanPercobaan(entri);
      } catch {
        // antrean tak bisa ditulis: lewati, coba lagi lain waktu
      }
    }
  }
  return { berhasil, gagal };
}
