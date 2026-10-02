import type { OrderRole, OrderStatus } from "./types";

export interface OrderStatusMeta {
  label: string;
  badge: string;
  dot: string;
}

const STATUS_META: Record<string, OrderStatusMeta> = {
  pending: {
    label: "Menunggu",
    badge: "border-amber-200 bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    badge: "border-orange-200 bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  accepted: {
    label: "Diterima",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "Berjalan",
    badge: "border-violet-200 bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  completed: {
    label: "Selesai",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Dibatalkan",
    badge: "border-rose-200 bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  PAID: {
    label: "Lunas",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

/** Aman walau database mengembalikan status di luar yang dikenal UI. */
export function getOrderStatusMeta(status: OrderStatus): OrderStatusMeta {
  return STATUS_META[status] ?? STATUS_META.pending;
}

export const ORDER_ROLE_LABEL: Record<OrderRole, string> = {
  owner: "Pesanan saya",
  partner: "Saya yang mengerjakan",
};
