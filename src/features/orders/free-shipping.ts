/**
 * Campify — Bebas Ongkir otomatis (tanpa kode promo).
 *
 * Aturan: mulai pesanan ke-4 dan seterusnya (`orderCount + 1 >= 4`),
 * ongkir/pengiriman (`ongkir` / `delivery_fee`) otomatis menjadi 0.
 *
 * File murni & aman dipakai di server maupun client (tanpa import
 * server-only), sehingga pratinjau di form memakai rumus yang PERSIS sama
 * dengan yang dijalankan Server Action.
 */

/** Pesanan ke-berapa yang mulai mendapat bebas ongkir. */
export const FREE_SHIPPING_MIN_ORDER_NUMBER = 4;

/** Badge hijau yang ditampilkan saat bebas ongkir aktif. */
export const FREE_SHIPPING_BADGE = "GRATIS ONGKIR OTOMATIS";

export interface FreeShippingStatus {
  /** Total pesanan lampau milik user (di luar yang dibatalkan). */
  pastOrderCount: number;
  /** Nomor urut pesanan yang sedang dibuat (`pastOrderCount + 1`). */
  nextOrderNumber: number;
  /** True bila `nextOrderNumber >= FREE_SHIPPING_MIN_ORDER_NUMBER`. */
  eligible: boolean;
}

/** Nomor urut pesanan yang sedang dibuat dari jumlah riwayat. */
export function toNextOrderNumber(pastOrderCount: number): number {
  const safe = Number.isFinite(pastOrderCount) ? Math.max(0, Math.floor(pastOrderCount)) : 0;
  return safe + 1;
}

/** True bila pesanan berikutnya berhak bebas ongkir (ke-4 dan seterusnya). */
export function isFreeShippingEligible(pastOrderCount: number): boolean {
  return toNextOrderNumber(pastOrderCount) >= FREE_SHIPPING_MIN_ORDER_NUMBER;
}

/** Bangun status bebas ongkir dari jumlah riwayat. Fungsi murni. */
export function resolveFreeShippingStatus(pastOrderCount: number): FreeShippingStatus {
  const safe = Number.isFinite(pastOrderCount) ? Math.max(0, Math.floor(pastOrderCount)) : 0;
  const nextOrderNumber = safe + 1;

  return {
    pastOrderCount: safe,
    nextOrderNumber,
    eligible: nextOrderNumber >= FREE_SHIPPING_MIN_ORDER_NUMBER,
  };
}

/** Label ringkas untuk badge/nota, mis. "🎉 Gratis Ongkir (Pesanan Ke-4)". */
export function formatFreeShippingLabel(nextOrderNumber: number): string {
  return `🎉 Gratis Ongkir (Pesanan Ke-${nextOrderNumber})`;
}

/**
 * Terapkan bebas ongkir ke nominal ongkir hasil hitungan server.
 * Mengembalikan 0 bila eligible, selain itu nominal asli.
 */
export function applyFreeShipping(originalFee: number, eligible: boolean): number {
  if (!eligible) {
    return originalFee;
  }
  return 0;
}
