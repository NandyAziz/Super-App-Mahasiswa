import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toNextOrderNumber } from "./free-shipping";

/**
 * Campify — Hitung riwayat pesanan untuk Bebas Ongkir (hanya server).
 *
 * Menghitung total pesanan lampau milik user lintas 5 tabel layanan
 * (`jastip_orders`, `print_orders`, `coding_projects`, `tutoring_sessions`,
 * `academic_services`) di luar status `cancelled`. Baris yang dibatalkan
 * tidak ikut menentukan nomor urut loyalitas.
 *
 * File ini hanya boleh diimpor dari Server Component / Server Action — ia
 * menyentuh `cookies()` lewat Supabase server client.
 */

/** Status pesanan yang tidak ikut dihitung untuk bebas ongkir. */
const FREE_SHIPPING_EXCLUDED_STATUSES = ["cancelled"] as const;

function excludedList(): string {
  return `(${FREE_SHIPPING_EXCLUDED_STATUSES.join(",")})`;
}

async function countOwnedRows(
  table: string,
  ownerColumn: string,
  userId: string,
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(ownerColumn, userId)
    .not("status", "in", excludedList());

  if (error) {
    // Gagal menghitung = anggap 0 (lebih aman membebankan ongkir penuh
    // daripada memberi gratis karena kesalahan hitung).
    console.error(`[FreeShipping] Gagal menghitung ${table}:`, {
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

/**
 * Total pesanan lampau milik user (pemesan saja, bukan peran kurir/tutor).
 * Setiap tabel gagal dibaca berkontribusi 0 agar satu tabel bermasalah tidak
 * menggagalkan seluruh checkout.
 */
export async function countPastOrdersForFreeShipping(userId: string): Promise<number> {
  if (!userId.trim()) {
    return 0;
  }

  const [jastip, printing, projects, tutoring, academic] = await Promise.all([
    countOwnedRows("jastip_orders", "user_id", userId),
    countOwnedRows("print_orders", "user_id", userId),
    countOwnedRows("coding_projects", "client_id", userId),
    countOwnedRows("tutoring_sessions", "student_id", userId),
    countOwnedRows("academic_services", "user_id", userId),
  ]);

  return jastip + printing + projects + tutoring + academic;
}

/** Nomor urut pesanan berikutnya milik user (`pastCount + 1`). */
export async function getNextOrderNumber(userId: string): Promise<number> {
  const pastCount = await countPastOrdersForFreeShipping(userId);
  return toNextOrderNumber(pastCount);
}
