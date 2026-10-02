import type { AcademicProgressStatus, AcademicStatus } from "./types";

export interface AcademicCardAction {
  label: string;
  nextStatus: AcademicProgressStatus;
}

/** Aksi simulasi alur kerja asisten akademik sesuai status saat ini. */
export function resolveAcademicCardAction(
  status: AcademicStatus,
): AcademicCardAction | null {
  if (status === "pending") {
    return { label: "Konfirmasi Diterima", nextStatus: "accepted" };
  }
  if (status === "accepted") {
    return { label: "Mulai Dikerjakan", nextStatus: "in_progress" };
  }
  if (status === "in_progress") {
    return { label: "Tandai Selesai", nextStatus: "completed" };
  }

  return null;
}

/** Pengajuan masih bisa dibatalkan selama belum selesai/dibatalkan. */
export function canCancelAcademicService(status: AcademicStatus): boolean {
  return status === "pending" || status === "accepted";
}
