import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderServiceMeta } from "../service-meta";
import { getOrderStatusMeta, ORDER_ROLE_LABEL } from "../status";
import type { OrderSummary } from "../types";

interface OrderSummaryCardProps {
  order: OrderSummary;
  /** Diberikan oleh board untuk membuka modal pembayaran QRIS. */
  onPay?: (order: OrderSummary) => void;
}

/** Hanya pesanan milik user yang masih berjalan & punya tagihan yang bisa dibayar. */
function isPayable(order: OrderSummary): boolean {
  return (
    order.role === "owner" &&
    order.status === "pending" &&
    order.amount !== null &&
    order.amount > 0
  );
}

export function OrderSummaryCard({ order, onPay }: OrderSummaryCardProps) {
  const serviceMeta = getOrderServiceMeta(order.service);
  const statusMeta = getOrderStatusMeta(order.status);
  const Icon = serviceMeta.icon;

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              serviceMeta.tint,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {order.title}
            </h3>
            <p className="truncate text-[0.7rem] text-zinc-400">
              {order.subtitle}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold",
            statusMeta.badge,
          )}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold",
            serviceMeta.badge,
          )}
        >
          <Icon className="h-3 w-3" />
          {serviceMeta.label}
        </span>
        <span className="text-[0.7rem] text-zinc-400">{order.createdLabel}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-zinc-50/80 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-zinc-500">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
          {ORDER_ROLE_LABEL[order.role]}
        </span>
        {order.amountLabel ? (
          <span className="text-sm font-semibold text-zinc-900">
            {order.amountLabel}
          </span>
        ) : null}
      </div>

      {isPayable(order) && onPay ? (
        <button
          type="button"
          onClick={() => onPay(order)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
        >
          <QrCode className="h-4 w-4" />
          <span>Bayar via QRIS</span>
        </button>
      ) : null}
    </article>
  );
}
