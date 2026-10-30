import Image from "next/image";

// Spinner mini untuk di dalam tombol saat sibuk — logo berputar kecil.
export default function MiniSpin() {
  return (
    <span
      className="tf-spin inline-block h-4 w-4 shrink-0 overflow-hidden rounded-md"
      aria-hidden="true"
    >
      <Image
        src="/brand/logo-icon.png"
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 object-cover"
      />
    </span>
  );
}
