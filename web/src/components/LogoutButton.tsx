"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [sibuk, setSibuk] = useState(false);

  async function keluar() {
    if (!confirm("Keluar dari Tafsha Farm?")) return;
    setSibuk(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Navigasi keras supaya cache dashboard tidak disajikan lagi.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/landing.html");
  }

  return (
    <button
      onClick={keluar}
      disabled={sibuk}
      title="Keluar"
      aria-label="Keluar dari aplikasi"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-green-900/15 bg-white text-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      ⎋
    </button>
  );
}
