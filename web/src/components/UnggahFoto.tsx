"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tambahAntrean, apakahJaringanGagal } from "@/lib/outbox";
import MiniSpin from "@/components/MiniSpin";

// Batas & kompres: foto HP 4MB+ diterima, dikompres dulu di HP baru diupload.
// Target akhir <= 500KB (sesuai PRD) supaya hemat kuota & storage.
const MAKS_ASLI = 15 * 1024 * 1024;
const TARGET_BYTE = 500 * 1024;

async function decodeKeBitmap(file: File): Promise<ImageBitmap> {
  try {
    // Hormati orientasi EXIF foto HP (potrait tidak miring).
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(file);
  }
}

async function bitmapKeJpeg(
  bitmap: ImageBitmap,
  sisiMaks: number,
  kualitas: number,
): Promise<Blob> {
  const skala = Math.min(1, sisiMaks / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * skala));
  const h = Math.max(1, Math.round(bitmap.height * skala));
  const kanvas = document.createElement("canvas");
  kanvas.width = w;
  kanvas.height = h;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung resize foto.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((selesai) =>
    kanvas.toBlob((b) => selesai(b), "image/jpeg", kualitas),
  );
  if (!blob) throw new Error("Gagal memproses foto.");
  return blob;
}

// Kompres adaptif: coba 1280px/q0.82 dulu, turunkan sampai <= 500KB.
async function kompresFoto(file: File): Promise<{ blob: Blob; asliKb: number; akhirKb: number }> {
  const asliKb = file.size / 1024;
  const bitmap = await decodeKeBitmap(file);
  const kombinasi: Array<[number, number]> = [
    [1280, 0.82],
    [1280, 0.72],
    [1024, 0.72],
    [1024, 0.62],
    [800, 0.62],
  ];
  let hasil: Blob | null = null;
  try {
    for (const [sisi, q] of kombinasi) {
      const b = await bitmapKeJpeg(bitmap, sisi, q);
      hasil = b;
      if (b.size <= TARGET_BYTE) break;
    }
  } finally {
    bitmap.close();
  }
  if (!hasil) throw new Error("Gagal memproses foto.");
  return { blob: hasil, asliKb, akhirKb: hasil.size / 1024 };
}

function formatKb(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${Math.round(kb)}KB`;
}

export type SubjekFoto = "lokasi" | "sub_blok" | "batch";

export default function UnggahFoto({
  subjek,
  id,
  label,
  kompak,
  saatSelesai,
}: {
  subjek: SubjekFoto;
  id: string;
  label?: string;
  kompak?: boolean;
  saatSelesai?: (url: string) => void;
}) {
  const kameraRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [tahap, setTahap] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  async function tangani(file: File | undefined) {
    if (!file) return;
    setSibuk(true);
    setPesan(null);
    let hasil: { blob: Blob; asliKb: number; akhirKb: number } | null = null;
    let userId: string | null = null;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar (JPG/PNG).");
      if (file.size > MAKS_ASLI) throw new Error("Foto terlalu besar (maks 15MB).");
      // 0) kompres dulu di HP — foto kamera 4MB jadi ~200-400KB sebelum dikirim
      setTahap("Mengompres foto...");
      try {
        hasil = await kompresFoto(file);
      } catch {
        throw new Error("Foto tidak bisa dibaca HP ini. Coba foto JPG biasa (bukan HEIC).");
      }
      const supabase = createClient();
      // getUser() butuh jaringan — offline gagal di sini, anggap user null.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      } catch (e) {
        if (!apakahJaringanGagal(e)) throw e;
      }
      const sedangOffline =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (sedangOffline || !userId || !hasil) {
        // Offline (atau sesi belum kebaca): antrekan blob JPEG terkompres.
        // Saat sinkron: upload dengan nama outboxId + upsert agar retry aman.
        if (!hasil) {
          setPesan("Foto tidak terbaca. Coba foto ulang ya 📷");
          return;
        }
        try {
          const n = await tambahAntrean(
            "foto",
            {
              user_id: userId,
              subjek,
              subjek_id: id,
              created_at: new Date().toISOString(),
            },
            hasil.blob,
          );
          setPesan(
            `📴 Foto tersimpan offline, menunggu sinkron: ${n} (${formatKb(hasil.asliKb)} → ${formatKb(hasil.akhirKb)})`,
          );
          saatSelesai?.(URL.createObjectURL(hasil.blob));
        } catch (antre) {
          setPesan(
            antre instanceof Error ? antre.message : "Gagal menyimpan foto offline.",
          );
        }
        return;
      }
      setTahap("Mengunggah...");

      const path = `${userId}/${subjek}/${id}/${Date.now()}.jpg`;
      const { error: errUp } = await supabase.storage
        .from("kebun-foto")
        .upload(path, hasil.blob, { contentType: "image/jpeg", upsert: false });
      if (errUp) throw errUp;

      const {
        data: { publicUrl },
      } = supabase.storage.from("kebun-foto").getPublicUrl(path);

      // 1) catat ke riwayat berkala
      const { error: errRiwayat } = await supabase.from("kebun_foto").insert({
        user_id: userId,
        subjek_tipe: subjek,
        subjek_id: id,
        foto_url: publicUrl,
      });
      if (errRiwayat) throw errRiwayat;

      // 2) jadikan foto utama subjek
      const tabel =
        subjek === "lokasi" ? "locations" : subjek === "sub_blok" ? "sub_blocks" : "plant_batches";
      const { error: errUtama } = await supabase
        .from(tabel)
        .update({ foto_url: publicUrl })
        .eq("id", id);
      if (errUtama) throw errUtama;

      setPesan(`Foto tersimpan ✅ (${formatKb(hasil.asliKb)} → ${formatKb(hasil.akhirKb)})`);
      saatSelesai?.(publicUrl);
    } catch (e) {
      // Jaringan putus di tengah upload → antrekan offline agar tidak hilang.
      const gagal = apakahJaringanGagal(e) ? hasil : null;
      if (gagal) {
        try {
          const n = await tambahAntrean(
            "foto",
            {
              user_id: userId,
              subjek,
              subjek_id: id,
              created_at: new Date().toISOString(),
            },
            gagal.blob,
          );
          setPesan(
            `📴 Foto tersimpan offline, menunggu sinkron: ${n} (${formatKb(gagal.asliKb)} → ${formatKb(gagal.akhirKb)})`,
          );
          saatSelesai?.(URL.createObjectURL(gagal.blob));
        } catch (antre) {
          setPesan(
            antre instanceof Error ? antre.message : "Gagal menyimpan foto offline.",
          );
        }
        return;
      }
      setPesan(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setSibuk(false);
      setTahap(null);
      if (kameraRef.current) kameraRef.current.value = "";
      if (galeriRef.current) galeriRef.current.value = "";
    }
  }

  const merah = (t: string) =>
    t.includes("Gagal") ||
    t.includes("maks") ||
    t.includes("Pilih") ||
    t.includes("masuk") ||
    t.includes("besar") ||
    t.includes("tidak bisa");

  return (
    <div className={kompak ? "" : "mt-2"}>
      {/* Input kamera: di HP langsung buka kamera belakang */}
      <input
        ref={kameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => tangani(e.target.files?.[0])}
      />
      {/* Input galeri: pilih foto yang sudah ada */}
      <input
        ref={galeriRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => tangani(e.target.files?.[0])}
      />
      {kompak ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sibuk}
            onClick={() => kameraRef.current?.click()}
            className="tf-btn-kecil tf-btn-abu"
          >
            {sibuk ? (
              <>
                <MiniSpin /> {tahap ?? "Mengunggah..."}
              </>
            ) : (
              <>📷 {label ?? "Foto"}</>
            )}
          </button>
          <button
            type="button"
            disabled={sibuk}
            onClick={() => galeriRef.current?.click()}
            className="tf-btn-kecil tf-btn-abu"
            aria-label="Pilih dari galeri HP"
          >
            🖼️
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={sibuk}
            onClick={() => kameraRef.current?.click()}
            className="tf-btn-outline flex-1"
          >
            {sibuk ? (
              <>
                <MiniSpin /> {tahap ?? "Mengunggah..."}
              </>
            ) : (
              <>📷 {label ?? "Ambil foto"}</>
            )}
          </button>
          <button
            type="button"
            disabled={sibuk}
            onClick={() => galeriRef.current?.click()}
            className="tf-btn-outline shrink-0"
            aria-label="Pilih dari galeri HP"
          >
            🖼️
          </button>
        </div>
      )}
      {pesan && (
        <p className={`mt-1 text-xs ${merah(pesan) ? "text-red-700" : "text-green-700"}`}>
          {pesan}
        </p>
      )}
    </div>
  );
}
