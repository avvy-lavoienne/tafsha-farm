import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Galeri publik untuk landing: 12 foto terbaru semua user.
// Dibuka tamu tanpa login (landing boleh dibuka publik), jadi tanpa cek auth.
// Cache 10 menit di CDN/Vercel.
export const revalidate = 600;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
