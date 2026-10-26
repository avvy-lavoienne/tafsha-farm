import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tafsha Farm — Manajemen Kebun",
  description:
    "Catat tanam, rawat, dan panen di Halaman Depan & Lahan Mushola, Pakuwon - Cisurupan - Garut.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tafsha Farm",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/kebun", label: "Kebun" },
  { href: "/batch", label: "Tanam" },
  { href: "/tugas", label: "Tugas" },
  { href: "/panen", label: "Panen" },
  { href: "/sarana", label: "Sarana" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="flex min-h-full flex-col bg-green-50 text-zinc-900">
        <header className="bg-green-800 px-4 py-3 text-white">
          <p className="text-lg font-bold">🌱 Tafsha Farm</p>
          <p className="text-xs text-green-200">
            Halaman Depan & Lahan Mushola — Pakuwon, Cisurupan, Garut
          </p>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-24">
          {children}
        </main>
        <nav className="fixed inset-x-0 bottom-0 border-t border-green-200 bg-white">
          <ul className="mx-auto grid max-w-3xl grid-cols-6 text-center text-xs font-medium">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block px-1 py-3 text-green-900 hover:bg-green-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </body>
    </html>
  );
}
