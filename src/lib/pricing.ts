/**
 * Kalkulator ongkir (dynamic shipping) untuk layanan Jastip Cepat.
 *
 * Merupakan fungsi murni tanpa dependensi server sehingga aman dipakai baik di
 * Server Action (nilai ongkir resmi yang dipersist) maupun di Client Component
 * (pratinjau real-time saat mahasiswa mengisi jarak).
 */

/** Batas jarak maksimum layanan Jastip (KM). */
export const JASTIP_MAX_DISTANCE_KM = 5;

/** Tarif dasar untuk jarak 0–2 KM. */
export const JASTIP_BASE_FEE = 5000;

/** Batas jarak yang masih memakai tarif dasar (KM). */
export const JASTIP_BASE_DISTANCE_KM = 2;

/** Biaya tambahan per KM ekstra (> 2 KM), dibulatkan ke atas. */
export const JASTIP_EXTRA_PER_KM = 2000;

/** Pengali jam sibuk (peak hour) — +20%. */
export const JASTIP_PEAK_MULTIPLIER = 1.2;

/** Ongkir minimum. */
export const JASTIP_MIN_FEE = 5000;

/** Pembulatan total ongkir ke kelipatan Rp 500. */
export const JASTIP_ROUNDING_STEP = 500;

/** Pesan error bila jarak melebihi batas layanan. */
export const JASTIP_OUT_OF_RANGE_MESSAGE = "Di luar jangkauan (Maksimal 5 KM)";

export interface JastipShippingInput {
  distanceKm: number;
  /** Waktu untuk menentukan jam sibuk; default `new Date()`. */
  at?: Date;
}

export interface JastipShippingBreakdown {
  distanceKm: number;
  baseFee: number;
  /** Jumlah KM ekstra (> 2 KM), dibulatkan ke atas. */
  extraKm: number;
  extraFee: number;
  isPeakHour: boolean;
  /** 1 jika bukan jam sibuk, atau `JASTIP_PEAK_MULTIPLIER`. */
  peakMultiplier: number;
  /** Total (base + ekstra) × pengali jam sibuk, sebelum pembulatan. */
  rawTotal: number;
  /** Ongkir akhir: dibulatkan ke Rp500 & minimal Rp5.000. */
  total: number;
}

/** Rentang jam sibuk (menit sejak tengah malam), inklusif di kedua ujungnya. */
const PEAK_WINDOWS: readonly (readonly [number, number])[] = [
  [11 * 60, 13 * 60], // 11:00–13:00
  [16 * 60, 18 * 60], // 16:00–18:00
];

/** True bila `at` berada pada jam sibuk (11:00–13:00 atau 16:00–18:00). */
export function isPeakHour(at: Date = new Date()): boolean {
  const minutes = at.getHours() * 60 + at.getMinutes();
  return PEAK_WINDOWS.some(
    ([start, end]) => minutes >= start && minutes <= end,
  );
}

/** Error khusus jarak di luar jangkauan (dipakai Server Action untuk field error). */
export class JastipOutOfRangeError extends Error {
  constructor() {
    super(JASTIP_OUT_OF_RANGE_MESSAGE);
    this.name = "JastipOutOfRangeError";
  }
}

/**
 * Menghitung ongkir Jastip berdasarkan jarak.
 *
 * Aturan:
 * - Jarak > 5 KM → melempar `JastipOutOfRangeError`.
 * - Tarif dasar Rp5.000 untuk 0–2 KM, +Rp2.000 tiap KM ekstra (ceil).
 * - Pengali jam sibuk +20% otomatis pada 11:00–13:00 & 16:00–18:00.
 * - Total dibulatkan ke kelipatan Rp500, minimum Rp5.000.
 */
export function calculateJastipShippingFee({
  distanceKm,
  at = new Date(),
}: JastipShippingInput): JastipShippingBreakdown {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new JastipOutOfRangeError();
  }

  if (distanceKm > JASTIP_MAX_DISTANCE_KM) {
    throw new JastipOutOfRangeError();
  }

  const extraKm = Math.max(0, Math.ceil(distanceKm - JASTIP_BASE_DISTANCE_KM));
  const extraFee = extraKm * JASTIP_EXTRA_PER_KM;
  const baseFee = JASTIP_BASE_FEE;

  const peak = isPeakHour(at);
  const peakMultiplier = peak ? JASTIP_PEAK_MULTIPLIER : 1;

  const rawTotal = (baseFee + extraFee) * peakMultiplier;
  const rounded =
    Math.ceil(rawTotal / JASTIP_ROUNDING_STEP) * JASTIP_ROUNDING_STEP;
  const total = Math.max(JASTIP_MIN_FEE, rounded);

  return {
    distanceKm,
    baseFee,
    extraKm,
    extraFee,
    isPeakHour: peak,
    peakMultiplier,
    rawTotal,
    total,
  };
}
