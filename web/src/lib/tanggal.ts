// Semua tanggal disimpan & dibandingkan sebagai string ISO "YYYY-MM-DD".
// "Hari ini" dihitung di zona kebun (Asia/Jakarta) supaya server (UTC di
// Vercel) dan perangkat pengguna menghasilkan tanggal yang sama — dulu
// getter lokal server membuat tanggal mundur sehari tiap pukul 00:00-06:59 WIB.
// Aritmatika hari memakai UTC murni, jadi tidak pernah bergeser karena zona
// waktu: dulu toISOString() setelah parse tanggal lokal memundurkan 1 hari.

const ZONA_KEBUN = "Asia/Jakarta";
const SEHARI_MS = 86_400_000;

function tanggalDiZona(waktu: Date): string {
  const bagian = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_KEBUN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(waktu);
  const ambil = (jenis: string) =>
    bagian.find((b) => b.type === jenis)?.value ?? "";
  return `${ambil("year")}-${ambil("month")}-${ambil("day")}`;
}

export function hariIniISO(kini: Date = new Date()): string {
  return tanggalDiZona(kini);
}

export function tambahHariISO(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const waktu = new Date(Date.UTC(y, m - 1, d) + n * SEHARI_MS);
  const yy = waktu.getUTCFullYear();
  const mm = String(waktu.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(waktu.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function selisihHari(dari: string, ke: string): number {
  const a = Date.parse(dari.slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(ke.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / SEHARI_MS);
}

export function hitungHST(tglTanam: string, kini: string = hariIniISO()): number {
  return Math.max(0, selisihHari(tglTanam, kini));
}

export function formatTanggal(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function bulanValid(bulan: string | undefined, jatuh: string): string {
  if (bulan && /^\d{4}-\d{2}$/.test(bulan)) {
    const [y, m] = bulan.split("-").map(Number);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) return bulan;
  }
  return jatuh.slice(0, 7);
}

export function geserBulan(bulan: string, delta: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const yy = Math.floor(total / 12);
  const mm = String((total % 12) + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function namaBulan(bulan: string): string {
  const d = new Date(bulan + "-01T00:00:00Z");
  return d.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
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
