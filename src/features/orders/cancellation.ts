import type { OrderStatus } from "./types";

/**
 * Status saat pesanan masih boleh dibatalkan oleh pemesan.
 *
 * HANYA `pending`. Begitu pesanan masuk antrean Tim Campify (`accepted`,
 * `in_progress`, `out_for_delivery`, `PAID`, `PENDING_VERIFICATION`) atau sudah
 * selesai (`completed`), tim sudah memulai — atau menyelesaikan — pekerjaan yang
 * berkaitan (mengambil berkas, mencetak di fotokopi, mengantar), sehingga
 * pembatalan tidak lagi bisa dipenuhi.
 */
export const ORDER_CANCELLABLE_STATUSES: readonly OrderStatus[] = ["pending"];

/** Pesan penolakan tunggal untuk seluruh layanan agar konsisten di UI. */
export const ORDER_CANCEL_BLOCKED_MESSAGE =
  "Pesanan tidak dapat dibatalkan karena sudah diproses oleh Tim Campify.";

/** True bila status saat ini masih mengizinkan pembatalan oleh pemesan. */
export function canCancelOrder(status: OrderStatus): boolean {
  return ORDER_CANCELLABLE_STATUSES.includes(status);
}