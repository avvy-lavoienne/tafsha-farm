"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ikon + label ala bottom nav landing — 7 menu aplikasi.
const NAV = [
  { href: "/", label: "Beranda", ikon: "🏠" },
  { href: "/kebun", label: "Kebun", ikon: "🌱" },
  { href: "/batch", label: "Tanam", ikon: "➕" },
  { href: "/tugas", label: "Tugas", ikon: "🔔" },
  { href: "/panen", label: "Panen", ikon: "🧺" },
  { href: "/sarana", label: "Sarana", ikon: "📦" },
  { href: "/komoditas", label: "Komoditas", ikon: "🌿" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-green-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur"
      aria-label="Navigasi utama"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-7 text-center lg:max-w-6xl">
        {NAV.map((item) => {
          const aktif =
            item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={aktif ? "page" : undefined}
                className={`flex min-h-[65px] flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  aktif ? "text-[#166534]" : "text-zinc-500"
                }`}
              >
                <span className="text-xl leading-none">{item.ikon}</span>
                <span className="text-[11px]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
