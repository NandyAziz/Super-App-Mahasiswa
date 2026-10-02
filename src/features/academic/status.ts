import type { AcademicStatus } from "./types";

export interface AcademicStatusMeta {
  label: string;
  /** Kelas Tailwind untuk badge indikator status. */
  badge: string;
}

const STATUS_META: Record<string, AcademicStatusMeta> = {
  pending: {
    label: "Menunggu Ditinjau",
    badge: "border-amber-200 bg-amber-100 text-amber-700",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-200 bg-orange-100 text-orange-700",
  },
  accepted: {
    label: "Diterima",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
  },
  in_progress: {
    label: "Sedang Diproses",
    badge: "border-violet-200 bg-violet-100 text-violet-700",
  },
  completed: {
    label: "Selesai",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
  cancelled: {
    label: "Dibatalkan",
    badge: "border-rose-200 bg-rose-100 text-rose-700",
  },
  PAID: {
    label: "Lunas",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
};

/** Aman walau database mengembalikan status di luar yang dikenal UI. */
export function getAcademicStatusMeta(status: AcademicStatus): AcademicStatusMeta {
  return STATUS_META[status] ?? STATUS_META.pending;
}

export const ACADEMIC_STATUS_MESSAGE: Record<AcademicStatus, string> = {
  pending: "Pengajuan bantuan akademik terkirim! 📄",
  accepted: "Pengajuan diterima, segera diproses ✅",
  in_progress: "Bantuan akademik sedang dikerjakan ✍️",
  completed: "Bantuan akademik selesai! Cek dokumenmu 🎉",
  cancelled: "Pengajuan bantuan akademik dibatalkan.",
};
