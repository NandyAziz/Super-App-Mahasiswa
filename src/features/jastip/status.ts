export interface JastipStatusMeta {
  label: string;
  /** Kelas Tailwind untuk badge indikator status. */
  badge: string;
  /** Gradasi Tailwind untuk aksen ikon kartu. */
  gradient: string;
}

/**
 * `Record<string, ...>` (bukan union) agar aman saat database mengembalikan
 * status di luar UI, mis. `PAID` hasil pembayaran simulasi QRIS.
 */
export const JASTIP_STATUS_META: Record<string, JastipStatusMeta> = {
  pending: {
    label: "Menunggu Kurir",
    badge: "border-amber-200 bg-amber-100 text-amber-700",
    gradient: "from-amber-400 to-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-200 bg-orange-100 text-orange-700",
    gradient: "from-orange-400 to-amber-500",
  },
  accepted: {
    label: "Kurir Ditugaskan",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  in_progress: {
    label: "Sedang Diantar",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  completed: {
    label: "Selesai",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-500 to-teal-600",
  },
  PAID: {
    label: "Lunas",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-500 to-teal-600",
  },
};
