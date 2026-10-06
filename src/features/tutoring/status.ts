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
    badge: "border-amber-100 bg-amber-50 text-amber-700",
    gradient: "from-amber-400 to-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-100 bg-orange-50 text-orange-700",
    gradient: "from-orange-400 to-amber-500",
  },
  accepted: {
    label: "Tutor Didapat",
    badge: "border-blue-100 bg-blue-50 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  in_progress: {
    label: "Sedang Belajar",
    badge: "border-violet-100 bg-violet-50 text-violet-700",
    gradient: "from-violet-500 to-purple-600",
  },
  out_for_delivery: {
    label: "Dalam Pengiriman",
    badge: "border-sky-100 bg-sky-50 text-sky-700",
    gradient: "from-sky-500 to-blue-600",
  },
  completed: {
    label: "Selesai",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    gradient: "from-emerald-500 to-teal-600",
  },
  cancelled: {
    label: "Dibatalkan",
    badge: "border-rose-100 bg-rose-50 text-rose-700",
    gradient: "from-rose-500 to-pink-600",
  },
  PAID: {
    label: "Lunas",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    gradient: "from-emerald-500 to-teal-600",
  },
};

/** Cadangan pasti-ada bila status tidak ditemukan di `STATUS_META`. */
export const TUTORING_FALLBACK_STATUS_META: TutoringStatusMeta = {
  label: "Status Tidak Diketahui",
  badge: "border-slate-100 bg-slate-50 text-slate-700",
  gradient: "from-slate-500 to-slate-700",
};

/**
 * Metadata status dengan fallback berlapis: entri yang cocok → `pending` →
 * literal cadangan. Selalu mengembalikan objek valid, sehingga pemanggil tidak
 * pernah melempar `TypeError` membaca `.gradient` / `.badge` / `.label`.
 */
export function getTutoringStatusMeta(status: TutoringStatus): TutoringStatusMeta {
  return (
    STATUS_META[status] ??
    STATUS_META.pending ??
    TUTORING_FALLBACK_STATUS_META
  );
}

export const TUTORING_STATUS_MESSAGE: Record<TutoringStatus, string> = {
  pending: "Sesi belajar diajukan! Menunggu tutor. 📚",
  accepted: "Sesi diterima tutor! Siap belajar 💡",
  in_progress: "Sesi belajar dimulai 🎓",
  completed: "Sesi belajar selesai! Terima kasih 🎉",
  cancelled: "Sesi belajar dibatalkan.",
};
