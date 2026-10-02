import type { OrderStatus } from "@/features/orders/types";
import type { AdminOperatorStatus } from "./status";

export interface AdminActionDescriptor {
  label: string;
  status: AdminOperatorStatus;
  variant: "primary" | "danger";
}

/**
 * Menentukan tombol aksi operator berdasarkan status pesanan saat ini.
 * Pesanan yang sudah `completed`, `cancelled`, atau `PAID` bersifat final
 * sehingga tidak menampilkan tombol apa pun.
 */
export function resolveAdminActions(
  status: OrderStatus,
): AdminActionDescriptor[] {
  if (status === "pending" || status === "accepted" || status === "PAID") {
    return [
      { label: "Proses", status: "in_progress", variant: "primary" },
      { label: "Batal", status: "cancelled", variant: "danger" },
    ];
  }

  if (status === "in_progress") {
    return [
      { label: "Selesaikan", status: "completed", variant: "primary" },
      { label: "Batal", status: "cancelled", variant: "danger" },
    ];
  }

  return [];
}
