import { canCancelOrder } from "@/features/orders/cancellation";
import type {
  TutoringProgressStatus,
  TutoringSession,
} from "./types";

/** Sesi yang saya pesan sebagai mahasiswa (mode belajar). */
export function selectMyStudySessions(
  sessions: TutoringSession[],
  userId: string,
): TutoringSession[] {
  return sessions.filter((session) => session.student_id === userId);
}

/**
 * Tawaran mengajar untuk mode tutor: sesi open milik mahasiswa lain,
 * plus sesi yang sedang saya ajar.
 */
export function selectTutorOffers(
  sessions: TutoringSession[],
  userId: string,
): TutoringSession[] {
  return sessions.filter((session) => {
    if (session.student_id === userId) {
      return false;
    }

    return (
      session.tutor_id === userId ||
      (session.tutor_id === null && session.status === "pending")
    );
  });
}

export interface TutoringCardAction {
  kind: "accept" | "status";
  label: string;
  nextStatus?: TutoringProgressStatus;
}

/** Menentukan tombol aksi kontekstual berdasarkan status & peran user. */
export function resolveTutoringCardAction(
  session: TutoringSession,
  userId: string,
): TutoringCardAction | null {
  const isTutor = session.tutor_id === userId;

  if (session.status === "pending" && session.student_id !== userId) {
    return { kind: "accept", label: "Terima Sesi" };
  }
  if (session.status === "accepted" && isTutor) {
    return { kind: "status", label: "Mulai Sesi", nextStatus: "in_progress" };
  }
  if (session.status === "in_progress" && isTutor) {
    return { kind: "status", label: "Selesaikan", nextStatus: "completed" };
  }

  return null;
}

/**
 * Mahasiswa pemesan HANYA boleh membatalkan sesi selama statusnya masih
 * `pending` — belum ada tutor yang menerimanya. Aturan status memakai
 * konstanta bersama yang sama dengan penjaga di Server Action.
 */
export function canCancelTutoringSession(
  session: TutoringSession,
  userId: string,
): boolean {
  return session.student_id === userId && canCancelOrder(session.status);
}
