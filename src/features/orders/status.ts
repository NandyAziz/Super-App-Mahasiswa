import type { OrderRole, OrderStatus } from "./types";

export interface OrderStatusMeta {
  label: string;
  badge: string;
  dot: string;
}

const STATUS_META: Record<string, OrderStatusMeta> = {
  pending: {
    label: "Menunggu",
    badge: "border-amber-100 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-100 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  accepted: {
    label: "Diterima",
    badge: "border-blue-100 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "Berjalan",
    badge: "border-violet-100 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  out_for_delivery: {
    label: "Dalam Perjalanan",
    badge: "border-sky-100 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  completed: {
    label: "Selesai",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Dibatalkan",
    badge: "border-rose-100 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  PAID: {
    label: "Lunas",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

/** Cadangan pasti-ada bila status tidak ditemukan di `STATUS_META`. */
export const ORDER_FALLBACK_STATUS_META: OrderStatusMeta = {
  label: "Status Tidak Diketahui",
  badge: "border-slate-100 bg-slate-50 text-slate-700",
  dot: "bg-slate-500",
};

/**
 * Metadata status dengan fallback berlapis: entri yang cocok → `pending` →
 * literal cadangan. Selalu mengembalikan objek valid, sehingga pemanggil tidak
 * pernah melempar `TypeError` membaca `.label` / `.badge` / `.dot`.
 */
export function getOrderStatusMeta(status: OrderStatus): OrderStatusMeta {
  return (
    STATUS_META[status] ??
    STATUS_META.pending ??
    ORDER_FALLBACK_STATUS_META
  );
}

export const ORDER_ROLE_LABEL: Record<OrderRole, string> = {
  owner: "Pesanan saya",
  partner: "Saya yang mengerjakan",
};
