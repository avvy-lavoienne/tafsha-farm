"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hitungAntrean } from "@/lib/outbox";

// Badge antrean offline. Hilang otomatis saat 0. Untuk halaman server.
export default function BadgeAntrean() {
  const [jumlah, setJumlah] = useState(0);

  useEffect(() => {
    let hidup = true;
    const muat = async () => {
      try {
        const n = await hitungAntrean();
        if (hidup) setJumlah(n);
      } catch {
        // browser lama tanpa IndexedDB: badge disembunyikan
      }
    };
    muat();
    window.addEventListener("outbox:berubah", muat);
    window.addEventListener("online", muat);
    return () => {
      hidup = false;
      window.removeEventListener("outbox:berubah", muat);
      window.removeEventListener("online", muat);
    };
  }, []);

  if (jumlah === 0) return null;

  return (
    <Link
      href="/tugas"
      className="tf-card block border-l-4 border-l-amber-500 text-sm font-medium text-amber-800 lg:col-span-2"
    >
      ⏳ menunggu sinkron: {jumlah}
    </Link>
  );
}
