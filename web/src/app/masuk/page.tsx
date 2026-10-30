"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function MasukPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function kirim(mode: "masuk" | "daftar") {
    if (!configured) {
      setPesan("Supabase belum dikonfigurasi. Isi .env.local dulu.");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const supabase = createClient();
      const { data, error } =
        mode === "masuk"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        // Proyek Supabase mewajibkan konfirmasi email: akun terdaftar
        // tapi sesi belum ada — jangan dorong ke beranda (pasti mental
        // ke /masuk lagi). Minta user cek email lalu tekan Masuk.
        setPesan(
          mode === "daftar"
            ? "Pendaftaran berhasil! Cek email untuk konfirmasi, lalu tekan Masuk."
            : "Belum ada sesi masuk. Coba tekan Masuk sekali lagi.",
        );
        return;
      }
      // Penting: navigasi keras agar cookie sesi pasti terbawa ke server.
      // router.push + refresh kadang masih menyajikan cache prefetch
      // (bottom nav ikut prefetch saat masih tamu) → dikira sesi hilang
      // dan mental balik ke /masuk tiap pindah menu.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm tf-card">
      <h1 className="text-xl font-bold text-green-900">Masuk Tafsha Farm</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Satu akun untuk pemilik + anggota keluarga.
      </p>
      <label className="mt-4 block text-sm font-medium">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 tf-input"
          placeholder="nama@email.com"
          autoComplete="email"
        />
      </label>
      <label className="mt-3 block text-sm font-medium">
        Kata sandi
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 tf-input"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>
      {pesan && (
        <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-700">
          {pesan}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => kirim("masuk")}
          disabled={sibuk}
          className="flex-1 tf-btn"
        >
          Masuk
        </button>
        <button
          onClick={() => kirim("daftar")}
          disabled={sibuk}
          className="flex-1 tf-btn-outline"
        >
          Daftar
        </button>
      </div>
    </div>
  );
}
