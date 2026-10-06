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
    badge: "border-blue-200 bg-blue-100 text-blue-700",
  },
  out_for_delivery: {
    label: "Dalam Pengiriman",
    badge: "border-sky-200 bg-sky-100 text-sky-700",
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

/** Cadangan pasti-ada bila status tidak ditemukan di `STATUS_META`. */
export const ACADEMIC_FALLBACK_STATUS_META: AcademicStatusMeta = {
  label: "Status Tidak Diketahui",
  badge: "border-slate-200 bg-slate-100 text-slate-700",
};

/**
 * Metadata status dengan fallback berlapis: entri yang cocok → `pending` →
 * literal cadangan. Selalu mengembalikan objek valid, sehingga pemanggil tidak
 * pernah melempar `TypeError` membaca `.label` / `.badge`.
 */
export function getAcademicStatusMeta(status: AcademicStatus): AcademicStatusMeta {
  return (
    STATUS_META[status] ??
    STATUS_META.pending ??
    ACADEMIC_FALLBACK_STATUS_META
  );
}

export const ACADEMIC_STATUS_MESSAGE: Record<AcademicStatus, string> = {
  pending: "Pengajuan bantuan akademik terkirim! 📄",
  accepted: "Pengajuan diterima, segera diproses ✅",
  in_progress: "Bantuan akademik sedang dikerjakan ✍️",
  completed: "Bantuan akademik selesai! Cek dokumenmu 🎉",
  cancelled: "Pengajuan bantuan akademik dibatalkan.",
};
