// Cuaca realtime Desa Pakuwon, Kec. Cisurupan, Kab. Garut.
// Sumber: Open-Meteo (gratis, tanpa API key) — https://open-meteo.com/
// Koordinat titik kebun: sekitar pusat Desa Pakuwon.

export const CUACA_LAT = -7.284;
export const CUACA_LON = 107.768;
export const CUACA_LABEL = "Pakuwon, Cisurupan, Garut";

export type CuacaInfo = {
  suhu: number | null;
  kelembapan: number | null;
  kode: number | null;
  label: string;
  ikon: string;
  hujanMm: number | null;
  peluangHujan: number | null;
  hujan: boolean;
  saranSiram: string;
  waktu: string;
};

// Peta kode cuaca WMO ke Bahasa Indonesia + ikon.
export function wmoKeLabel(kode: number | null): { label: string; ikon: string } {
  if (kode == null) return { label: "Tidak diketahui", ikon: "🌤️" };
  if (kode === 0) return { label: "Cerah", ikon: "☀️" };
  if (kode === 1) return { label: "Cerah berawan", ikon: "🌤️" };
  if (kode === 2) return { label: "Berawan", ikon: "⛅" };
  if (kode === 3) return { label: "Mendung", ikon: "☁️" };
  if (kode === 45 || kode === 48) return { label: "Berkabut", ikon: "🌫️" };
  if (kode >= 51 && kode <= 57) return { label: "Gerimis", ikon: "🌦️" };
  if (kode >= 61 && kode <= 67) return { label: "Hujan", ikon: "🌧️" };
  if (kode >= 71 && kode <= 77) return { label: "Hujan salju ringan", ikon: "🌨️" };
  if (kode >= 80 && kode <= 82) return { label: "Hujan deras", ikon: "⛈️" };
  if (kode >= 95 && kode <= 99) return { label: "Badai petir", ikon: "⛈️" };
  return { label: "Berawan", ikon: "⛅" };
}

type OpenMeteoRes = {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: (number | null)[];
  };
};

export function olahCuaca(json: OpenMeteoRes): CuacaInfo {
  const cur = json.current ?? {};
  const kode = typeof cur.weather_code === "number" ? cur.weather_code : null;
  const { label, ikon } = wmoKeLabel(kode);
  const hujanMm = typeof cur.precipitation === "number" ? cur.precipitation : null;

  // Peluang hujan jam berjalan: cari indeks jam terdekat di hourly.
  let peluangHujan: number | null = null;
  const times = json.hourly?.time ?? [];
  const probs = json.hourly?.precipitation_probability ?? [];
  if (cur.time && times.length > 0) {
    const prefix = cur.time.slice(0, 13); // "YYYY-MM-DDTHH"
    const idx = times.findIndex((t) => t.slice(0, 13) === prefix);
    if (idx >= 0 && typeof probs[idx] === "number") peluangHujan = probs[idx];
  }
  if (peluangHujan == null) {
    const angka = probs.filter((v): v is number => typeof v === "number").slice(0, 3);
    if (angka.length > 0) peluangHujan = Math.max(...angka);
  }

  const hujan =
    (hujanMm != null && hujanMm >= 0.2) ||
    (peluangHujan != null && peluangHujan >= 60) ||
    (kode != null && kode >= 51 && kode <= 99);

  return {
    suhu: typeof cur.temperature_2m === "number" ? Math.round(cur.temperature_2m) : null,
    kelembapan:
      typeof cur.relative_humidity_2m === "number" ? cur.relative_humidity_2m : null,
    kode,
    label,
    ikon,
    hujanMm,
    peluangHujan,
    hujan,
    saranSiram: hujan
      ? "Hujan / mau hujan — siram bisa dilewati hari ini."
      : "Tidak hujan — lanjutkan siram sesuai jadwal.",
    waktu: typeof cur.time === "string" ? cur.time : "",
  };
}

export async function ambilCuaca(): Promise<CuacaInfo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${CUACA_LAT}&longitude=${CUACA_LON}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code` +
    `&hourly=precipitation_probability&timezone=Asia%2FJakarta&forecast_days=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = (await res.json()) as OpenMeteoRes;
    return olahCuaca(json);
  } catch {
    return null;
  }
}
