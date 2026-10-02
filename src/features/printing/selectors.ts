import type { PrintProgressStatus, PrintStatus } from "./types";

export interface PrintCardAction {
  label: string;
  nextStatus: PrintProgressStatus;
}

/** Aksi utama (simulasi mitra fotokopi/admin) sesuai status saat ini. */
export function resolvePrintCardAction(
  status: PrintStatus,
): PrintCardAction | null {
  if (status === "pending") {
    return { label: "Terima Pesanan", nextStatus: "accepted" };
  }
  if (status === "accepted") {
    return { label: "Mulai Cetak", nextStatus: "in_progress" };
  }
  if (status === "in_progress") {
    return { label: "Tandai Selesai", nextStatus: "completed" };
  }

  return null;
}

/** Pesanan masih bisa dibatalkan selama belum selesai/dibatalkan. */
export function canCancelPrintOrder(status: PrintStatus): boolean {
  return status === "pending" || status === "accepted";
}
