// Ikon tiap tipe media tanam — dipakai di form, daftar batch, dan kebun.
export function ikonMedia(nama: string | null | undefined): string {
  const n = (nama ?? "").toLowerCase();
  if (n.includes("galon")) return "🫙";
  if (n.includes("botol")) return "🧴";
  if (n.includes("tray")) return "🌱";
  if (n.includes("polybag") || n.includes("polibag") || n.includes("poly"))
    return "🪴";
  return "🪴";
}
