import type { TutoringStatus } from "./types";

export interface TutoringStatusMeta {
  label: string;
  /** Kelas Tailwind untuk badge indikator status. */
  badge: string;
  /** Gradasi Tailwind untuk aksen ikon kartu. */
  gradient: string;
}

const STATUS_META: Record<string, TutoringStatusMeta> = {
  pending: {
    label: "Menunggu Tutor",
    badge: "border-amber-200 bg-amber-100 text-amber-700",
    gradient: "from-amber-400 to-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-200 bg-orange-100 text-orange-700",
    gradient: "from-orange-400 to-amber-500",
  },
  accepted: {
    label: "Tutor Didapat",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  in_progress: {
    label: "Sedang Belajar",
    badge: "border-violet-200 bg-violet-100 text-violet-700",
    gradient: "from-violet-500 to-purple-600",
  },
  completed: {
    label: "Selesai",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-500 to-teal-600",
  },
  cancelled: {
    label: "Dibatalkan",
    badge: "border-rose-200 bg-rose-100 text-rose-700",
    gradient: "from-rose-500 to-pink-600",
  },
  PAID: {
    label: "Lunas",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-500 to-teal-600",
  },
};

/** Aman walau database mengembalikan status di luar yang dikenal UI. */
export function getTutoringStatusMeta(status: TutoringStatus): TutoringStatusMeta {
  return STATUS_META[status] ?? STATUS_META.pending;
}

export const TUTORING_STATUS_MESSAGE: Record<TutoringStatus, string> = {
  pending: "Sesi belajar diajukan! Menunggu tutor. 📚",
  accepted: "Sesi diterima tutor! Siap belajar 💡",
  in_progress: "Sesi belajar dimulai 🎓",
  completed: "Sesi belajar selesai! Terima kasih 🎉",
  cancelled: "Sesi belajar dibatalkan.",
};
