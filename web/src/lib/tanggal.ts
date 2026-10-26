export function hariIniISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hitungHST(tglTanam: string): number {
  const tanam = new Date(tglTanam + "T00:00:00");
  const kini = new Date();
  const selisih = kini.getTime() - tanam.getTime();
  return Math.max(0, Math.floor(selisih / 86400000));
}

export function formatTanggal(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const LABEL_STATUS: Record<string, string> = {
  semai: "Semai",
  tumbuh: "Tumbuh",
  panen: "Panen",
  selesai: "Selesai",
  gagal: "Gagal",
};

export const LABEL_TUGAS: Record<string, string> = {
  siram: "Siram",
  pupuk: "Pupuk",
  semprot: "Semprot",
  penyiangan: "Penyiangan",
  cek_hama: "Cek hama",
  pindah_tanam: "Pindah tanam",
  panen: "Panen",
};
