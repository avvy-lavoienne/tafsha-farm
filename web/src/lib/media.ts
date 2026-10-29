// Ikon tiap komoditas — dipakai di form, daftar batch, kebun, dan pengingat.
export function ikonKomoditas(nama: string | null | undefined): string {
  const n = (nama ?? "").toLowerCase();
  if (n.includes("cabai") || n.includes("cabe") || n.includes("lombok")) return "🌶️";
  if (n.includes("timun") || n.includes("mentimun")) return "🥒";
  if (n.includes("terong")) return "🍆";
  if (n.includes("talas")) return "🥔";
  if (n.includes("tomat")) return "🍅";
  if (n.includes("kangkung")) return "🥬";
  if (n.includes("bayam")) return "🥗";
  if (n.includes("lavender")) return "💜";
  if (n.includes("selada") || n.includes("lettuce")) return "🥬";
  if (n.includes("sawi") || n.includes("pakcoy") || n.includes("pakcoi")) return "🥬";
  if (n.includes("daun bawang") || n.includes("bawang merah")) return "🧅";
  if (n.includes("bawang")) return "🧅";
  if (n.includes("seledri")) return "🥬";
  if (n.includes("mint")) return "🌿";
  if (n.includes("wortel")) return "🥕";
  if (n.includes("jagung")) return "🌽";
  if (n.includes("stroberi") || n.includes("strawberry")) return "🍓";
  return "🌱";
}

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
