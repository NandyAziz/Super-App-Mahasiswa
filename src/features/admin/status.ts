import type { OrderStatus } from "@/features/orders/types";

/**
 * Status yang menandakan pesanan masih menunggu tindakan operator Campify
 * (`accepted` = sudah diterima sistem namun belum dikerjakan). `PAID`
 * disertakan karena setelah pembayaran QRIS lunas, operator masih harus
 * memindahkan pesanan ke tahap pengerjaan (`in_progress`) lalu menyelesaikannya.
 */
export const ADMIN_ACTION_STATUSES: readonly OrderStatus[] = [
  "pending",
  "PENDING_VERIFICATION",
  "accepted",
  "PAID",
  "in_progress",
  "out_for_delivery",
];

/**
 * Status yang menandakan pendapatan sudah terkumpul / pesanan sudah berjalan
 * (via QRIS maupun pembayaran simulasi internal).
 */
export const ADMIN_REVENUE_STATUSES: readonly OrderStatus[] = [
  "in_progress",
  "out_for_delivery",
  "completed",
  "PAID",
];

/**
 * Status target yang boleh di-set oleh operator Campify dari dashboard.
 * Selaras dengan alur kerja tiap layanan namun tanpa batasan kepemilikan
 * karena operator bekerja sebagai penyedia layanan langsung.
 */
export const ADMIN_OPERATOR_STATUSES = [
  "in_progress",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;

export type AdminOperatorStatus = (typeof ADMIN_OPERATOR_STATUSES)[number];

/**
 * Status yang mengizinkan baris pesanan dihapus permanen oleh operator.
 * Hanya tahap akhir (`completed`) atau yang sudah dibatalkan (`cancelled`);
 * pesanan berjalan (`pending`, `accepted`, `PAID`, `in_progress`,
 * `PENDING_VERIFICATION`) tidak boleh dihapus.
 *
 * Konstanta ini dipakai oleh Server Action (validasi status) dan tabel admin
 * (render tombol Hapus) agar keduanya selalu konsisten.
 */
export const ADMIN_DELETABLE_STATUSES: readonly OrderStatus[] = [
  "completed",
  "cancelled",
];
