import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";

const deskripsi =
  "Catat tanam, rawat, dan panen di Halaman Depan & Lahan Mushola, Pakuwon - Cisurupan - Garut.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: "Tafsha Farm — Manajemen Kebun",
  description: deskripsi,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    title: "Tafsha Farm — Manajemen Kebun",
    description: deskripsi,
    images: [{ url: "/brand/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tafsha Farm — Manajemen Kebun",
    description: deskripsi,
    images: ["/brand/og.jpg"],
  },
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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body
        className={`${inter.variable} ${jakarta.variable} flex min-h-full flex-col bg-[#fffbeb] text-zinc-900`}
      >
        <header className="sticky top-0 z-40 border-b border-green-900/10 bg-[#fffbeb]/95 backdrop-blur">
          <div className="mx-auto flex min-h-[76px] w-full max-w-3xl items-center gap-2 px-4 md:max-w-5xl lg:max-w-6xl">
            <Image
              src="/brand/logo-icon.png"
              alt="Tafsha Farm"
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold leading-tight text-[#166534]">
                Tafsha Farm
              </p>
              <p className="text-[10px] font-semibold leading-tight text-zinc-500">
                by VyuApp
              </p>
              <p className="truncate text-[11px] text-zinc-600">
                Halaman Depan & Lahan Mushola — Pakuwon, Cisurupan, Garut
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-28 md:max-w-5xl lg:max-w-6xl">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
