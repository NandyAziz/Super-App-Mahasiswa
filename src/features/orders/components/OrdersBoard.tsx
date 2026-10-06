"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { QrisPaymentModal } from "@/features/payment/components/QrisPaymentModal";
import { ORDER_RUNNING_STATUSES } from "../types";
import type { OrderSummary } from "../types";
import { OrderSummaryCard } from "./OrderSummaryCard";

type OrdersTab = "running" | "done";

const TABS: { id: OrdersTab; label: string }[] = [
  { id: "running", label: "Pesanan Berjalan" },
  { id: "done", label: "Riwayat Selesai" },
];

/** Konten empty state per tab: ikon mengundang + judul + ajakan bertindak. */
const EMPTY_STATE: Record<
  OrdersTab,
  { icon: LucideIcon; title: string; description: string; hint: string }
> = {
  running: {
    icon: Truck,
    title: "Tidak ada pesanan berjalan 🎉",
    description:
      "Semua pesananmu sudah selesai. Pesanan yang sedang diproses akan tampil di sini dengan status real-time.",
    hint: "Buat pesanan baru untuk memulai.",
  },
  done: {
    icon: CircleCheck,
    title: "Belum ada riwayat selesai",
    description:
      "Riwayat pesanan yang sudah selesai atau dibatalkan akan tersimpan rapi di sini.",
    hint: "Selesaikan satu pesanan untuk mengisi tab ini.",
  },
};

function isRunning(status: OrderSummary["status"]): boolean {
  return ORDER_RUNNING_STATUSES.includes(status);
}

function filterOrders(orders: OrderSummary[], tab: OrdersTab): OrderSummary[] {
  if (tab === "running") {
    return orders.filter((order) => isRunning(order.status));
  }
  if (tab === "done") {
    return orders.filter((order) => !isRunning(order.status));
  }

  return orders;
}

interface OrdersBoardProps {
  orders: OrderSummary[];
}

export function OrdersBoard({ orders }: OrdersBoardProps) {
  // Pesanan Berjalan adalah tampilan default agar fokus ke yang perlu aksi.
  const [tab, setTab] = useState<OrdersTab>("running");
  const [payingOrder, setPayingOrder] = useState<OrderSummary | null>(null);

  const runningCount = useMemo(
    () => orders.filter((order) => isRunning(order.status)).length,
    [orders],
  );
  const visibleOrders = filterOrders(orders, tab);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Filter pesanan"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md"
      >
        {TABS.map((item) => {
          const label =
            item.id === "running"
              ? `Pesanan Berjalan (${runningCount})`
              : item.label;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95",
                tab === item.id
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visibleOrders.length === 0 ? (
        <EmptyState {...EMPTY_STATE[tab]} />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <OrderSummaryCard
              key={`${order.service}-${order.id}`}
              order={order}
              onPay={setPayingOrder}
            />
          ))}
        </div>
      )}

      {payingOrder && payingOrder.amount !== null ? (
        <QrisPaymentModal
          open
          onClose={() => setPayingOrder(null)}
          order={{
            id: payingOrder.id,
            title: payingOrder.title,
            service: payingOrder.service,
            amount: payingOrder.amount,
          }}
        />
      ) : null}
    </div>
  );
}
