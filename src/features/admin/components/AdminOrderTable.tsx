import { ClipboardList, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AdminOrder } from "../types";
import { AdminOrderCard } from "./AdminOrderCard";

interface AdminOrderTableProps {
  orders: AdminOrder[];
  /** Pesan yang tampil saat tidak ada pesanan pada filter aktif. */
  emptyMessage: string;
  /** Ikon empty state; default antrean aktif. */
  emptyIcon?: LucideIcon;
}

/** Daftar kartu pesanan operator 2.0 untuk kenyamanan mobile & desktop. */
export function AdminOrderTable({
  orders,
  emptyMessage,
  emptyIcon = ClipboardList,
}: AdminOrderTableProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title="Antrean kosong 🎉"
        description={emptyMessage}
        hint="Pesanan baru dari 5 layanan akan muncul di sini otomatis."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <AdminOrderCard key={`${order.service}-${order.id}`} order={order} />
      ))}
    </div>
  );
}
