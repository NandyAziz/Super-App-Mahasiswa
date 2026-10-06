import { canCancelOrder } from "@/features/orders/cancellation";
import type { AcademicProgressStatus, AcademicStatus } from "./types";

/**
 * Aksi yang tersedia pada kartu riwayat pelanggan.
 *
 * - `kind: "status"`      → memicu transisi status (memakai `nextStatus`).
 * - `kind: "acknowledge"` → tanda terima akhir TANPA mengubah status
 *                           (dipakai saat `completed` yang sudah terminal).
 */
export type AcademicCardAction =
  | { kind: "status"; label: string; nextStatus: AcademicProgressStatus }
  | { kind: "acknowledge"; label: string };

/**
 * Aksi pelanggan sesuai status saat ini.
 *
 * - `pending`     → tanpa aksi maju; hanya "Batalkan" (tim yang meninjau).
 * - `accepted`    → lanjut ke `in_progress`.
 * - `in_progress` → tandai "Selesai" (→ `completed`).
 * - `completed`   → "Konfirmasi Diterima" sebagai tanda terima (tanpa transisi).
 * - `cancelled`   → tanpa aksi.
 *
 * "Konfirmasi Diterima" sengaja TIDAK muncul pada `pending` ("Menunggu
 * Ditinjau") maupun `accepted` ("Dalam Proses") — hanya di `completed`.
 */
export function resolveAcademicCardAction(
  status: AcademicStatus,
): AcademicCardAction | null {
  if (status === "accepted") {
    return {
      kind: "status",
      label: "Mulai Dikerjakan",
      nextStatus: "in_progress",
    };
  }
  if (status === "in_progress") {
    return { kind: "status", label: "Selesai", nextStatus: "completed" };
  }
  if (status === "completed") {
    return { kind: "acknowledge", label: "Konfirmasi Diterima" };
  }

  // `pending` → hanya Batalkan; `cancelled` → tanpa aksi.
  return null;
}

/**
 * Pengajuan hanya bisa dibatalkan selama masih `pending`.
 *
 * Begitu Tim Campify sudah memprosesnya (`accepted` dan seterusnya), tombol
 * Batal disembunyikan. Memakai aturan bersama yang sama dengan penjaga di
 * Server Action agar UI dan backend tidak berbeda pendapat.
 */
export function canCancelAcademicService(status: AcademicStatus): boolean {
  return canCancelOrder(status);
}
