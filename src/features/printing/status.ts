import type { PrintStatus } from "./types";

export interface PrintStatusMeta {
  label: string;
  /** Kelas Tailwind untuk badge indikator status. */
  badge: string;
  /** Gradasi Tailwind untuk aksen ikon kartu. */
  gradient: string;
}

const STATUS_META: Record<string, PrintStatusMeta> = {
  pending: {
    label: "Menunggu Diproses",
    badge: "border-amber-200 bg-amber-100 text-amber-700",
    gradient: "from-amber-400 to-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-200 bg-orange-100 text-orange-700",
    gradient: "from-orange-400 to-amber-500",
  },
  accepted: {
    label: "Diterima Mitra",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  in_progress: {
    label: "Sedang Dicetak",
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
    gradient: "from-emerald-400 to-teal-500",
  },
};

/** Aman walau database mengembalikan status di luar yang dikenal UI. */
export function getPrintStatusMeta(status: PrintStatus): PrintStatusMeta {
  return STATUS_META[status] ?? STATUS_META.pending;
}

export const PRINT_STATUS_MESSAGE: Record<PrintStatus, string> = {
  pending: "Pesanan menunggu diproses mitra cetak.",
  accepted: "Pesanan cetak diterima mitra! 🖨️",
  in_progress: "Dokumen sedang dicetak...",
  completed: "Pesanan cetak selesai! Silakan diambil 🎉",
  cancelled: "Pesanan cetak dibatalkan.",
};
