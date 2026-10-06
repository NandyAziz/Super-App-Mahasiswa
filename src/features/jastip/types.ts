import type { PromoCode } from "@/features/promos/catalog";

export const JASTIP_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
] as const;

export type JastipStatus = (typeof JASTIP_STATUSES)[number];

/** Status lanjutan yang hanya boleh di-set oleh kurir yang bertugas. */
export type JastipProgressStatus = Extract<
  JastipStatus,
  "in_progress" | "completed"
>;

/**
 * Status `jastip_orders` setelah simulasi pembayaran QRIS internal berhasil.
 * Titipan yang tadinya `pending` (belum dibayar) menjadi `accepted`
 * (dibayar & dikonfirmasi, siap dicarikan kurir).
 */
export const JASTIP_PAID_STATUS: JastipStatus = "accepted";

/**
 * Merepresentasikan satu baris tabel `public.jastip_orders` di Supabase.
 */
export interface JastipOrder {
  id: string;
  user_id: string;
  courier_id: string | null;
  item_name: string;
  pickup_location: string;
  dropoff_location: string;
  delivery_tip: number;
  /**
   * Kode promo yang dipakai titipan ini (jika ada), sudah diverifikasi server.
   * `LOYALTY3RD` → `delivery_tip` sudah 0; `PATUNGAN` → ongkir flat.
   */
  promo_code: PromoCode | null;
  status: JastipStatus;
  created_at: string;
}

/** Hasil standar yang dikembalikan oleh seluruh Server Action fitur jastip. */
export interface JastipActionResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  /** Terisi saat pembuatan titipan berhasil, agar UI langsung membuka QRIS. */
  order?: JastipOrder;
}
