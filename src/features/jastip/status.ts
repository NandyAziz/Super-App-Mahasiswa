export interface JastipStatusMeta {
  label: string;
  /** Kelas Tailwind untuk badge indikator status. */
  badge: string;
  /** Gradasi Tailwind untuk aksen ikon kartu. */
  gradient: string;
}

/**
 * Metadata cadangan yang PASTI ada — dipakai bila `status` tidak ditemukan di
 * `JASTIP_STATUS_META`. Dipisah sebagai konstanta agar TypeScript bisa
 * menjamin bentuknya (dan agar komponen tidak pernah melempar `TypeError`
 * saat membaca `.gradient`).
 */
export const JASTIP_FALLBACK_STATUS_META: JastipStatusMeta = {
  label: "Status Tidak Diketahui",
  badge: "border-slate-100 bg-slate-50 text-slate-700",
  gradient: "from-slate-500 to-slate-700",
};

/**
 * Metadata status Jastip.
 *
 * WAJIB memuat seluruh nilai enum `order_status` yang bisa muncul di
 * `jastip_orders`: `pending`, `PENDING_VERIFICATION`, `accepted`, `in_progress`,
 * `out_for_delivery`, `completed`, `cancelled`, dan `PAID`. Status
 * `out_for_delivery` ditambahkan bersamaan dengan fitur live tracking.
 *
 * `Record<string, ...>` (bukan union) agar aman saat database mengembalikan
 * status di luar UI.
 */
export const JASTIP_STATUS_META: Record<string, JastipStatusMeta> = {
  pending: {
    label: "Menunggu Kurir",
    badge: "border-amber-100 bg-amber-50 text-amber-700",
    gradient: "from-amber-400 to-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-100 bg-orange-50 text-orange-700",
    gradient: "from-orange-400 to-amber-500",
  },
  accepted: {
    label: "Kurir Ditugaskan",
    badge: "border-blue-100 bg-blue-50 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
  },
  in_progress: {
    label: "Sedang Diantar",
    badge: "border-blue-100 bg-blue-50 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
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

/**
 * Ambil metadata status dengan fallback berlapis:
 * entri yang cocok → `pending` → literal cadangan.
 *
 * Selalu mengembalikan objek valid, sehingga pemanggil (`meta.gradient`,
 * `meta.badge`, `meta.label`) tidak pernah melempar `TypeError`.
 */
export function getJastipStatusMeta(status: string): JastipStatusMeta {
  return (
    JASTIP_STATUS_META[status] ??
    JASTIP_STATUS_META.pending ??
    JASTIP_FALLBACK_STATUS_META
  );
}
