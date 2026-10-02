"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { QrisPaymentModal } from "@/features/payment/components/QrisPaymentModal";
import { ORDER_RUNNING_STATUSES } from "../types";
import type { OrderSummary } from "../types";
import { OrderSummaryCard } from "./OrderSummaryCard";

type OrdersTab = "all" | "running" | "done";

const TABS: { id: OrdersTab; label: string }[] = [
  { id: "all", label: "Semua Pesanan" },
  { id: "running", label: "Berjalan" },
  { id: "done", label: "Selesai" },
];

const EMPTY_MESSAGE: Record<OrdersTab, string> = {
  all: "Belum ada pesanan. Yuk coba salah satu layanan Campify!",
  running: "Tidak ada pesanan yang sedang berjalan.",
  done: "Belum ada pesanan yang selesai.",
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
  const [tab, setTab] = useState<OrdersTab>("all");
  const [payingOrder, setPayingOrder] = useState<OrderSummary | null>(null);

  const visibleOrders = filterOrders(orders, tab);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95",
              tab === item.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-500">{EMPTY_MESSAGE[tab]}</p>
        </div>
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
