"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// 8 menu aplikasi. Di desktop tampil bar bawah penuh;
// di HP/pad (<lg) tampil sebagai FAB bulat + sheet semua menu.
const NAV = [
  { href: "/", label: "Beranda", ikon: "🏠", desc: "Ringkasan kebun" },
  { href: "/kebun", label: "Kebun", ikon: "🌱", desc: "Lokasi & sub-blok" },
  { href: "/batch", label: "Tanam", ikon: "➕", desc: "Batch & progres" },
  { href: "/tugas", label: "Tugas", ikon: "🔔", desc: "Pengingat hari ini" },
  { href: "/panen", label: "Panen", ikon: "🧺", desc: "Hasil & riwayat" },
  { href: "/sarana", label: "Sarana", ikon: "📦", desc: "Stok & media" },
  { href: "/komoditas", label: "Komoditas", ikon: "🌿", desc: "Tanaman & SOP" },
  { href: "/pengaturan", label: "Pengaturan", ikon: "⚙️", desc: "Akun & data" },
];

function aktif(path: string, href: string): boolean {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export default function BottomNav() {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const tutupRef = useRef<HTMLButtonElement>(null);

  // Escape menutup sheet; kunci scroll badan saat sheet terbuka;
  // fokus dikembalikan ke FAB saat ditutup.
  useEffect(() => {
    if (!buka) return;
    tutupRef.current?.focus();
    const fab = fabRef.current;
    const saatTombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("keydown", saatTombol);
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", saatTombol);
      document.body.style.overflow = lama;
      fab?.focus();
    };
  }, [buka]);

  return (
    <>
      {/* Desktop: bar bawah penuh 8 menu */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-green-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur lg:block"
        aria-label="Navigasi utama"
      >
        <ul className="mx-auto grid max-w-6xl grid-cols-8 text-center">
          {NAV.map((item) => {
            const ya = aktif(path, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ya ? "page" : undefined}
                  className={`flex min-h-[65px] flex-col items-center justify-center gap-1 px-1 text-xs font-semibold ${
                    ya ? "text-[#166534]" : "text-zinc-500"
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden="true">
                    {item.ikon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* HP/pad: FAB bulat kanan-bawah */}
      <button
        ref={fabRef}
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls="menu-sheet"
        aria-label={buka ? "Tutup menu navigasi" : "Buka menu navigasi"}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#166534] text-2xl text-white shadow-xl transition hover:brightness-110 active:scale-95 lg:hidden"
      >
        <span aria-hidden="true">{buka ? "✕" : "☰"}</span>
      </button>

      {/* HP/pad: sheet semua menu */}
      {buka && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            onClick={() => setBuka(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            id="menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="tf-fab-sheet absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-bold text-green-900">🌱 Menu Tafsha Farm</p>
              <button
                ref={tutupRef}
                type="button"
                onClick={() => setBuka(false)}
                aria-label="Tutup menu navigasi"
                className="grid h-11 w-11 place-items-center rounded-full border border-zinc-300 text-lg text-zinc-600"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {NAV.map((item) => {
                const ya = aktif(path, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ya ? "page" : undefined}
                      onClick={() => setBuka(false)}
                      className={`flex min-h-[64px] items-center gap-3 rounded-2xl border p-3 ${
                        ya
                          ? "border-green-700 bg-green-50 text-green-900"
                          : "border-zinc-200 text-zinc-800"
                      }`}
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-green-100 text-xl"
                        aria-hidden="true"
                      >
                        {item.ikon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
