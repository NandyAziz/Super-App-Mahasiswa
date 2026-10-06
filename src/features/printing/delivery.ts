import {
  JASTIP_MAX_DISTANCE_KM,
  calculateJastipShippingFee,
  type JastipShippingBreakdown,
} from "@/lib/pricing";

/**
 * Estimasi ongkir Jasa Cetak berdasarkan teks `delivery_location`.
 *
 * Form Jasa Cetak sengaja tetap 5 field (tanpa input jarak terpisah seperti
 * Jastip), sehingga jarak diinferensikan dari teks lokasi yang ditulis pemesan.
 * Inferensinya deterministik: teks dinormalisasi lalu dicocokkan ke kata kunci
 * zona — bukan parsing bebas — supaya hasilnya bisa direproduksi dan diuji.
 *
 * Pratinjau di client hanya informatif. Nilai yang dipersist SELALU dihitung
 * ulang di Server Action dari teks yang sama (lihat `printing/actions.ts`).
 */

/** Batas atas ongkir sebagai jaring pengaman validasi. */
export const PRINT_DELIVERY_FEE_CAP = 50_000;

export type PrintDeliveryZoneId = "luar-area" | "dalam-area";

export interface PrintDeliveryZone {
  id: PrintDeliveryZoneId;
  /** Label zona yang ditampilkan ke pemesan. */
  label: string;
  /** Jarak representatif zona (KM) yang diumpan ke kalkulator ongkir. */
  distanceKm: number;
  /** Kata kunci lowercased yang dicocokkan terhadap teks lokasi. */
  keywords: readonly string[];
}

export interface PrintDeliveryEstimate {
  zone: PrintDeliveryZone;
  breakdown: JastipShippingBreakdown;
  /** True bila tidak ada kata kunci yang cocok — zona default yang dipakai. */
  isEstimated: boolean;
}

export interface PrintDeliveryZoneMatch {
  zone: PrintDeliveryZone;
  isEstimated: boolean;
}

/** Diurutkan: indikasi luar kampus diprioritaskan karena jaraknya lebih jauh. */
const LUAR_AREA_ZONE: PrintDeliveryZone = {
  id: "luar-area",
  label: "Luar area kampus",
  distanceKm: 3,
  keywords: [
    "kos",
    "kost",
    "asrama",
    "gang",
    "kontrak",
    "rumah",
    "villa",
    "apartemen",
    "perumahan",
    "homestay",
    "penginapan",
    "jalan",
    "jl.",
  ],
};

const DALAM_AREA_ZONE: PrintDeliveryZone = {
  id: "dalam-area",
  label: "Dalam area kampus",
  distanceKm: 1,
  keywords: [
    "kampus",
    "gedung",
    "fakultas",
    "perpustakaan",
    "gor",
    "masjid",
    "kantin",
    "rektorat",
    "aula",
    "lab",
  ],
};

/** Zona yang dicoba lebih dulu saat teks mengandung indikasi dua zona. */
export const PRINT_DELIVERY_ZONES: readonly PrintDeliveryZone[] = [
  LUAR_AREA_ZONE,
  DALAM_AREA_ZONE,
];

/** Zona cadangan bila teks tidak mengenali zona mana pun. */
export const DEFAULT_PRINT_DELIVERY_ZONE: PrintDeliveryZone = DALAM_AREA_ZONE;

/** Penjelasan singkat cara ongkir ditentukan (ditampilkan di form). */
export const PRINT_DELIVERY_ZONE_HINT =
  `Ongkir menyesuaikan zona lokasi: dalam area kampus (≈1 KM) atau ` +
  `luar area kampus (≈3 KM), maksimal ${JASTIP_MAX_DISTANCE_KM} KM. ` +
  "Jam sibuk (11:00–13:00 & 16:00–18:00) +20%.";

function normalizeDeliveryLocation(location: string): string {
  return location.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesAnyKeyword(
  normalized: string,
  keywords: readonly string[],
): boolean {
  return keywords.some((keyword) => normalized.includes(keyword));
}

/** Petakan teks lokasi ke zona ongkir. Tidak pernah melempar error. */
export function resolvePrintDeliveryZone(
  location: string,
): PrintDeliveryZoneMatch {
  const normalized = normalizeDeliveryLocation(location);
  const zone = PRINT_DELIVERY_ZONES.find((candidate) =>
    matchesAnyKeyword(normalized, candidate.keywords),
  );

  if (zone) {
    return { zone, isEstimated: false };
  }

  return { zone: DEFAULT_PRINT_DELIVERY_ZONE, isEstimated: true };
}

/**
 * Hitung ongkir Jasa Cetak dari teks lokasi memakai kalkulator ongkir yang sama
 * dengan Jastip (`calculateJastipShippingFee`).
 *
 * Jarak zona (1 / 3 KM) selalu ≤ `JASTIP_MAX_DISTANCE_KM`, sehingga tidak ada
 * risiko `JastipOutOfRangeError` dari konstanta internal.
 */
export function resolvePrintDeliveryEstimate(
  location: string,
  weatherSurge = 0,
): PrintDeliveryEstimate {
  const { zone, isEstimated } = resolvePrintDeliveryZone(location);
  const breakdown = calculateJastipShippingFee({
    distanceKm: zone.distanceKm,
    weatherSurge,
  });

  return { zone, breakdown, isEstimated };
}
