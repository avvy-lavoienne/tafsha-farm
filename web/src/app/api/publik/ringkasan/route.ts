import { createClient as buatAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { bangunEventKalender, type BatchKalender } from "@/lib/kalender";
import { hariIniISO } from "@/lib/tanggal";

// Ringkasan komunitas anonim untuk landing publik.
// Hanya angka agregat yang keluar — tanpa id/nama user/lokasi.
// Cache 10 menit di CDN/Vercel.
export const revalidate = 600;

function tambahHari(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${t}`;
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !kunci) return NextResponse.json({ kosong: true });
    const admin = buatAdmin(url, kunci, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ini = hariIniISO();
    const awalBulan = ini.slice(0, 7) + "-01";

    const [fotoRes, batchRes, panenRes] = await Promise.all([
      admin.from("kebun_foto").select("id", { count: "exact", head: true }),
      admin
        .from("plant_batches")
        .select(
          "id,jumlah,tgl_semai,tgl_tanam,status,commodities(nama,umur_panen_min,umur_panen_maks)",
        )
        .not("status", "in", "(selesai,gagal)")
        .limit(500),
      admin
        .from("harvests")
        .select("jumlah,satuan")
        .gte("tanggal", awalBulan)
        .limit(1000),
    ]);

    const batches: BatchKalender[] = (batchRes.data ?? []).map((b) => {
      const kom = Array.isArray(b.commodities)
        ? b.commodities[0]
        : (b.commodities as {
            nama: string | null;
            umur_panen_min: number | null;
            umur_panen_maks: number | null;
          } | null);
      return {
        id: b.id,
        komoditas: kom?.nama ?? "?",
        lokasi: "-",
        jumlah: b.jumlah,
        tgl_semai: b.tgl_semai ?? null,
        tgl_tanam: b.tgl_tanam,
        status: b.status,
        umur_min: kom?.umur_panen_min ?? null,
        umur_maks: kom?.umur_panen_maks ?? null,
        pindah: [],
        panen: [],
      };
    });
    const events = bangunEventKalender(batches);

    // Hitung per hari 7 hari ke depan: estimasi hari-pertama + panen aktual.
    const minggu: { tanggal: string; siap: number; panen: number }[] = [];
    const panenAktual = new Set<string>();
    const { data: panenMinggu } = await admin
      .from("harvests")
      .select("tanggal")
      .gte("tanggal", ini)
      .lte("tanggal", tambahHari(ini, 6))
      .limit(500);
    for (const h of panenMinggu ?? []) panenAktual.add(h.tanggal as string);
    const siapPerHari = new Map<string, Set<string>>();
    for (const e of events) {
      if (e.jenis !== "estimasi" || e.rentang) continue;
      if (e.tanggal < ini || e.tanggal > tambahHari(ini, 6)) continue;
      const s = siapPerHari.get(e.tanggal) ?? new Set<string>();
      s.add(e.batchId);
      siapPerHari.set(e.tanggal, s);
    }
    for (let i = 0; i < 7; i++) {
      const tgl = tambahHari(ini, i);
      minggu.push({
        tanggal: tgl,
        siap: siapPerHari.get(tgl)?.size ?? 0,
        panen: [...panenAktual].filter((t) => t === tgl).length > 0 ? 1 : 0,
      });
    }

    // Total panen bulan ini per satuan (jangan campur kg+ikat).
    const jumPerSatuan = new Map<string, number>();
    for (const p of panenRes.data ?? []) {
      const satuan = ((p.satuan as string) ?? "-").trim() || "-";
      jumPerSatuan.set(
        satuan,
        (jumPerSatuan.get(satuan) ?? 0) + Number(p.jumlah ?? 0),
      );
    }
    const rincian = [...jumPerSatuan.entries()]
      .map(([s, j]) => `${j} ${s}`)
      .join(" • ");

    // Komoditas paling banyak ditanam (nama saja).
    const hitungKom = new Map<string, number>();
    for (const b of batches) hitungKom.set(b.komoditas, (hitungKom.get(b.komoditas) ?? 0) + 1);
    const top = [...hitungKom.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nama, n]) => ({ nama, batch: n }));

    return NextResponse.json({
      totalFoto: fotoRes.count ?? 0,
      siapMingguIni: [...siapPerHari.values()].reduce((a, s) => a + s.size, 0),
      panenBulanIni: rincian || "0",
      jumlahPanenBulanIni: (panenRes.data ?? []).length,
      minggu,
      komoditasTop: top,
    });
  } catch {
    return NextResponse.json({ kosong: true });
  }
}
