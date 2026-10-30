import { createClient as buatAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Galeri landing: hanya kolom publik — tanpa user_id / subjek_id.
// Setelah migrasi 0008, role anon tidak lagi bisa membaca tabel kebun_foto
// langsung (policy "publik baca galeri" dicabut), jadi route ini memakai
// service-role di server dan memilih kolom yang aman saja.
export const revalidate = 600;

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !kunci) return NextResponse.json({ foto: [] });
    const admin = buatAdmin(url, kunci, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("kebun_foto")
      .select("foto_url,keterangan,created_at,subjek_tipe")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return NextResponse.json({ foto: data ?? [] });
  } catch {
    return NextResponse.json({ foto: [] });
  }
}
