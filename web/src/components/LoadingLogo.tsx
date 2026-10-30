import Image from "next/image";

// Logo Tafsha Farm berputar — dipakai sebagai indikator loading.
export default function LoadingLogo({ teks }: { teks?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-label={teks ?? "Memuat..."}
    >
      <Image
        src="/brand/logo-icon.png"
        alt=""
        width={56}
        height={56}
        priority
        className="tf-spin h-14 w-14 rounded-2xl object-cover"
      />
      <p className="text-sm font-medium text-zinc-500">
        {teks ?? "Memuat..."}
      </p>
    </div>
  );
}
