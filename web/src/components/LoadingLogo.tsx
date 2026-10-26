// Logo Tafsha Farm berputar — dipakai sebagai indikator loading.
export default function LoadingLogo({ teks }: { teks?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-label={teks ?? "Memuat..."}
    >
      <span className="tf-spin grid h-14 w-14 place-items-center rounded-2xl bg-[#166534] text-3xl text-white">
        🌱
      </span>
      <p className="text-sm font-medium text-zinc-500">
        {teks ?? "Memuat..."}
      </p>
    </div>
  );
}
