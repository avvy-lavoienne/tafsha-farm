import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";

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
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#166534] text-xl text-white">
              🌱
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-[#166534]">
                Tafsha Farm
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
