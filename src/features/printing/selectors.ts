import { canCancelOrder } from "@/features/orders/cancellation";
import type { PrintProgressStatus, PrintStatus } from "./types";

export interface PrintCardAction {
  label: string;
  nextStatus: PrintProgressStatus;
}

/** Aksi utama alur perantara cetak (tim Campify) sesuai status saat ini. */
export function resolvePrintCardAction(
  status: PrintStatus,
): PrintCardAction | null {
  if (status === "pending") {
    return { label: "Terima & Ambil Berkas", nextStatus: "accepted" };
  }
  if (status === "accepted") {
    return { label: "Proses di Fotokopi", nextStatus: "in_progress" };
  }
  if (status === "in_progress") {
    return { label: "Tandai Selesai", nextStatus: "completed" };
  }

  return null;
}

/**
 * Pesanan hanya bisa dibatalkan selama masih `pending`.
 *
 * Begitu Tim Campify sudah memprosesnya (`accepted`, `in_progress`,
 * `out_for_delivery`, `PAID`, `PENDING_VERIFICATION`, `completed`), tombol
 * Batal disembunyikan. Aturan ini memakai konstanta bersama yang sama dengan
 * penjaga di Server Action, jadi UI dan backend tidak bisa berbeda pendapat.
 */
export function canCancelPrintOrder(status: PrintStatus): boolean {
  return canCancelOrder(status);
}
