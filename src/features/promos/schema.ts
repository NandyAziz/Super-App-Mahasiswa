import { z } from "zod";
import { PROMO_CODES, PROMO_DEFINITIONS, type PromoCode } from "./catalog";

/**
 * Skema nilai `?promo=` yang datang dari URL maupun `FormData`.
 *
 * Sengaja memakai `z.enum(PROMO_CODES)` (bukan string bebas): kode promo
 * yang tidak dikenal langsung ditolak, bukan diteruskan ke Server Action.
 * Ini menutup jalur penyalahgunaan — pengguna tidak bisa mengarang kode
 * untuk mendapat ongkir gratis.
 */
export const promoCodeSchema = z.enum(PROMO_CODES);

/**
 * Ubah nilai mentah dari query string / `FormData` menjadi kode promo.
 *
 * Mengembalikan `null` untuk apa pun yang tidak persis cocok — termasuk
 * string kosong, nilai berulang (array) dari query string, dan kode asing.
 * Promo yang tidak dikenali TIDAK menghasilkan error agar halaman tetap
 * bisa dibuka normal.
 */
export function parsePromoCode(raw: unknown): PromoCode | null {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string") {
    return null;
  }

  const parsed = promoCodeSchema.safeParse(value.trim().toUpperCase());

  return parsed.success ? parsed.data : null;
}

/**
 * Promo milik layanan tertentu saja yang diterima.
 *
 * Contoh: `/printing?promo=PATUNGAN` diabaikan, karena PATUNGAN hanya untuk
 * Jastip — mencegah orang memutar URL agar promo dipakai di layanan yang
 * tidak memenuhi syaratnya.
 */
export function parsePromoForService(
  raw: unknown,
  service: "jastip" | "printing",
): PromoCode | null {
  const code = parsePromoCode(raw);

  if (!code) {
    return null;
  }

  return PROMO_DEFINITIONS[code].service === service ? code : null;
}
