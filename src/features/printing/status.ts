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
    badge: "border-amber-100 bg-amber-50 text-amber-700",
    gradient: "from-amber-400 to-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-100 bg-orange-50 text-orange-700",
    gradient: "from-orange-400 to-amber-500",
  },
  accepted: {
    label: "Berkas Diterima",
    badge: "border-blue-100 bg-blue-50 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  in_progress: {
    label: "Sedang Dicetak",
    badge: "border-violet-100 bg-violet-50 text-violet-700",
    gradient: "from-violet-500 to-purple-600",
  },
  out_for_delivery: {
    label: "Sedang Diantar",
    badge: "border-sky-100 bg-sky-50 text-sky-700",
    gradient: "from-sky-500 to-blue-600",
  },
  completed: {
    label: "Sudah Diantar",
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
    gradient: "from-emerald-400 to-teal-500",
  },
};

/** Cadangan pasti-ada bila status tidak ditemukan di `STATUS_META`. */
export const PRINT_FALLBACK_STATUS_META: PrintStatusMeta = {
  label: "Status Tidak Diketahui",
  badge: "border-slate-100 bg-slate-50 text-slate-700",
  gradient: "from-slate-500 to-slate-700",
};

/**
 * Metadata status dengan fallback berlapis: entri yang cocok → `pending` →
 * literal cadangan. Selalu mengembalikan objek valid, sehingga pemanggil tidak
 * pernah melempar `TypeError` membaca `.gradient` / `.badge` / `.label`.
 */
export function getPrintStatusMeta(status: PrintStatus): PrintStatusMeta {
  return (
    STATUS_META[status] ??
    STATUS_META.pending ??
    PRINT_FALLBACK_STATUS_META
  );
}

export const PRINT_STATUS_MESSAGE: Record<PrintStatus, string> = {
  pending: "Pesanan menunggu Tim Campify mengambil berkasmu.",
  accepted: "Berkasmu sudah diterima Tim Campify dan akan segera dicetak. 🖨️",
  in_progress: "Dokumen sedang dicetak di fotokopi terdekat...",
  completed: "Hasil cetak sudah diantar ke lokasimu. Terima kasih! 🎉",
  cancelled: "Pesanan cetak dibatalkan.",
};
