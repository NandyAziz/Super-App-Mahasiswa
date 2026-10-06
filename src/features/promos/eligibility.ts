import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  LOYALTY_FREE_EVERY,
  PROMO_DEFINITIONS,
  resolveJastipFeeTotal,
  toAppliedPromo,
  type AppliedPromo,
  type JastipFeeResolution,
  type PromoCode,
} from "./catalog";
import { parsePromoForService } from "./schema";

/**
 * =============================================================================
 * Campify — Kelayakan Promo (hanya server)
 * =============================================================================
 * SATU-SATUNYA tempat keputusan "apakah promo ini benar-benar berlaku" diambil.
 *
 * Prinsip yang dijaga di sini (sama dengan aturan ongkir di fitur Jastip &
 * Cetak): nilai dari client tidak pernah dipercaya. Client hanya boleh
 * mengirim KODE promo; kelayakan SELALU dihitung ulang di sini dari database.
 *
 * File ini hanya boleh diimpor dari Server Component / Server Action — ia
 * menyentuh `cookies()` lewat Supabase server client.
 * =============================================================================
 */

/** Status pesanan yang tidak ikut dihitung untuk loyalitas (dibatalkan). */
const NON_COUNTED_STATUSES = ["cancelled"] as const;

/**
 * Berapa banyak pesanan Jastip milik user yang sudah "berhasil" — menjadi
 * dasar menentukan transaksi ke-berapa yang sedang dibuat.
 *
 * Hanya menghitung pesanan milik pemanggil (`user_id` = session), sehingga
 * RLS tetap menjadi lapisan kedua dan angka tidak bisa dimanipulasi lewat
 * filter ID orang lain.
 */
async function countCompletedJastipOrders(
  userId: string,
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("jastip_orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("status", "in", `(${NON_COUNTED_STATUSES.join(",")})`);

  if (error) {
    // Gagal menghitung = promo tidak bisa diverifikasi. Lebih aman membebankan
    // ongkir penuh daripada memberi gratis karena kesalahan hitung.
    console.error("[Promo] Gagal menghitung riwayat Jastip:", {
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

/** True bila transaksi berikutnya adalah transaksi kelipatan yang gotong royong. */
export function isLoyaltyOrderEligible(
  completedOrders: number,
  code: PromoCode,
): boolean {
  const definition = PROMO_DEFINITIONS[code];

  if (definition.effect !== "free_delivery") {
    return false;
  }

  // `completedOrders` = pesanan yang SUDAH ada. Transaksi ini menjadi
  // transaksi ke-(completedOrders + 1). Gratis tepat pada kelipatan 3.
  return (completedOrders + 1) % LOYALTY_FREE_EVERY === 0;
}

/**
 * Promo Jastip yang sudah diverifikasi untuk pemanggil.
 *
 * Mengembalikan `null` bila kode tidak dikenal, bukan milik layanan Jastip,
 * atau tidak memenuhi syarat (mis. loyalty belum giliran).
 */
export async function resolveJastipPromo(
  rawCode: unknown,
  userId: string,
): Promise<AppliedPromo | null> {
  const code = parsePromoForService(rawCode, "jastip");

  if (!code) {
    return null;
  }

  const definition = PROMO_DEFINITIONS[code];

  if (definition.effect !== "free_delivery") {
    // Promo tanpa syarat hitungan (mis. ongkir flat) selalu berlaku.
    return toAppliedPromo(code);
  }

  const completed = await countCompletedJastipOrders(userId);

  return isLoyaltyOrderEligible(completed, code)
    ? toAppliedPromo(code)
    : null;
}

/** Promo Cetak yang sudah diverifikasi untuk pemanggil. */
export async function resolvePrintPromo(
  rawCode: unknown,
): Promise<AppliedPromo | null> {
  const code = parsePromoForService(rawCode, "printing");

  return code ? toAppliedPromo(code) : null;
}

/**
 * Terapkan promo Jastip ke nominal ongkir hasil hitungan server.
 *
 * `promo` di sini SUDAH tervalidasi oleh `resolveJastipPromo`; fungsi ini
 * hanya memanggil rumus murni yang sama dengan yang dipakai pratinjau client
 * (`resolveJastipFeeTotal`) sehingga angka yang tampil dan yang tersimpan
 * tidak mungkin berbeda.
 */
export function applyJastipPromo(
  originalTotal: number,
  promo: AppliedPromo | null,
): JastipFeeResolution {
  return resolveJastipFeeTotal(promo?.code ?? null, originalTotal, Boolean(promo));
}
