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
      const fn =
        mode === "masuk"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password });
      const { error } = await fn;
      if (error) throw error;
      window.location.href = "/";
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
