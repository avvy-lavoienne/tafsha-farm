"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  async function keluar() {
    if (!confirm("Keluar dari Tafsha Farm?")) return;
    setSibuk(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Setelah logout langsung ke landing promosi, bukan form login.
    router.push("/landing.html");
    router.refresh();
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
