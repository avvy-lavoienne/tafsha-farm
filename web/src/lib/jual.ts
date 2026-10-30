// Status jual tanaman: dihitung dari HST menuju masa panen, bukan umur semai.
// Yang dicari urban farmer adalah tanaman yang sudah mendekati berbunga/berbuah
// sehingga tinggal dirawat sebentar lalu panen — bukan bibit semai umur sebulan.
// Modul ini murni (tanpa impor) supaya mudah diuji.

// Dianggap "hampir siap" bila tinggal ≤ 7 HST lagi menuju usia jual.
export const JENDELA_HAMPIR_HARI = 7;

// Bila komoditas belum punya usia jual sendiri, pakai 15 HST sebelum panen.
export const SELISIH_JUAL_DARI_PANEN = 15;

export type FaseJual = "belum-diatur" | "tumbuh" | "hampir" | "siap" | "lewat";

export type StatusJual = {
  fase: FaseJual;
  hst: number;
  targetMin: number | null;
  targetMaks: number | null;
  sisaHari: number | null;
  label: string;
};

export type BahanStatusJual = {
  hst: number;
  umurJualMin?: number | null;
  umurJualMaks?: number | null;
  umurPanenMin?: number | null;
  umurPanenMaks?: number | null;
};

// Usia (HST) saat tanaman layak dijual. Prioritas: usia jual komoditas,
// lalu 15 HST sebelum umur panen.
export function targetJual(
  umurJualMin: number | null | undefined,
  umurPanenMin: number | null | undefined,
): number | null {
  if (umurJualMin != null) return umurJualMin;
  if (umurPanenMin != null)
    return Math.max(0, umurPanenMin - SELISIH_JUAL_DARI_PANEN);
  return null;
}

export function statusJual(bahan: BahanStatusJual): StatusJual {
  const {
    hst,
    umurJualMin,
    umurJualMaks,
    umurPanenMin,
    umurPanenMaks,
  } = bahan;
  const targetMin = targetJual(umurJualMin, umurPanenMin);

  if (targetMin == null) {
    return {
      fase: "belum-diatur",
      hst,
      targetMin: null,
      targetMaks: null,
      sisaHari: null,
      label: "Usia jual belum diatur",
    };
  }

  const targetMaks = Math.max(
    targetMin,
    umurJualMaks ?? umurPanenMaks ?? targetMin,
  );
  const sisaHari = Math.max(0, targetMin - hst);

  if (hst >= targetMin) {
    if (hst > targetMaks) {
      return {
        fase: "lewat",
        hst,
        targetMin,
        targetMaks,
        sisaHari: 0,
        label: `Lewat usia jual ideal (HST ${hst})`,
      };
    }
    return {
      fase: "siap",
      hst,
      targetMin,
      targetMaks,
      sisaHari: 0,
      label: `Siap jual · HST ${hst}`,
    };
  }

  if (hst >= targetMin - JENDELA_HAMPIR_HARI) {
    return {
      fase: "hampir",
      hst,
      targetMin,
      targetMaks,
      sisaHari,
      label: `Hampir siap · ${sisaHari} hari lagi`,
    };
  }

  return {
    fase: "tumbuh",
    hst,
    targetMin,
    targetMaks,
    sisaHari,
    label: `Tumbuh · ${sisaHari} hari lagi`,
  };
}

// Ringkas untuk badge daftar/kartu: null = belum layak ditandai.
export function badgeJual(status: StatusJual): string | null {
  if (status.fase === "belum-diatur") return null;
  if (status.fase === "siap") return "Siap jual";
  if (status.fase === "lewat") return "Lewat usia ideal";
  if (status.fase === "hampir") return `±${status.sisaHari} hari lagi`;
  return null;
}
