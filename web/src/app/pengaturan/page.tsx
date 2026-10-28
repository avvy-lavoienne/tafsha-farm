import { createClient as buatAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import PengaturanClient from "@/components/PengaturanClient";

// Hapus akun sendiri: via supabase.auth (admin deleteUser) agar seluruh
// baris milik user ikut terhapus otomatis lewat `on delete cascade` —
// tanpa hapus data manual per tabel. Server Action di sini (bukan API
// route baru) supaya jumlah route build tidak bertambah.
async function hapusAkunSaya(): Promise<{ ok: boolean; pesan: string }> {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, pesan: "Kamu belum masuk. Masuk dulu ya." };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !kunci)
    return {
      ok: false,
      pesan:
        "Hapus akun belum aktif di perangkat ini. Hubungi pengelola kebun ya.",
    };
  const admin = buatAdmin(url, kunci, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error)
    return {
      ok: false,
      pesan: "Gagal menghapus akun, coba lagi ya.",
    };
  return { ok: true, pesan: "Akun dihapus. Sampai jumpa lagi! 👋" };
}

export default async function PengaturanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-4">
      <section className="tf-card">
        <h1 className="text-xl font-bold text-green-900">⚙️ Pengaturan</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Akun, notifikasi, dan datamu.
        </p>
      </section>
      <PengaturanClient email={user?.email ?? null} hapusAkun={hapusAkunSaya} />
    </div>
  );
}
