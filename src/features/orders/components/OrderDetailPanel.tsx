import Link from "next/link";
import { BadgeCheck, ReceiptText, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { getOrderServiceMeta } from "../service-meta";
import { getOrderStatusMeta, ORDER_ROLE_LABEL } from "../status";
import type { OrderSummary } from "../types";

interface OrderDetailPanelProps {
  /** `null` berarti pesanan tidak ditemukan / bukan milik user login. */
  order: OrderSummary | null;
}

function NotFoundPanel() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-12 text-center backdrop-blur-md">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ReceiptText className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-zinc-700">
        Pesanan tidak ditemukan
      </p>
      <p className="text-xs text-zinc-500">
        Pesanan mungkin sudah dihapus atau bukan milik Anda.
      </p>
      <Link
        href="/orders"
        className="rounded-2xl border border-white/20 bg-white/70 px-4 py-2.5 text-xs font-semibold text-indigo-600 backdrop-blur-md transition-all duration-200 active:scale-95"
      >
        Kembali ke Pesanan
      </Link>
    </div>
  );
}

export function OrderDetailPanel({ order }: OrderDetailPanelProps) {
  if (!order) {
    return <NotFoundPanel />;
  }

  const serviceMeta = getOrderServiceMeta(order.service);
  const statusMeta = getOrderStatusMeta(order.status);
  const Icon = serviceMeta.icon;
  const isPaid = order.status === "PAID";

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              serviceMeta.tint,
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold tracking-wide text-indigo-500 uppercase">
              {serviceMeta.label}
            </p>
            <h2 className="truncate text-base font-semibold text-zinc-900">
              {order.title}
            </h2>
            <p className="truncate text-xs text-zinc-400">{order.subtitle}</p>
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

      {isPaid ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              Pembayaran QRIS lunas (simulasi)
            </p>
            <p className="text-[0.7rem] text-emerald-600/80">
              Tagihan sudah dibayar lewat QRIS internal Campify.
            </p>
          </div>
        </div>
      ) : null}

      <dl className="mt-4 space-y-2 rounded-2xl bg-zinc-50/80 p-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-500">Layanan</dt>
          <dd className="truncate font-semibold text-zinc-800">
            {serviceMeta.label}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-500">Peran</dt>
          <dd className="truncate font-semibold text-zinc-800">
            {ORDER_ROLE_LABEL[order.role]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-500">Dibuat</dt>
          <dd className="truncate font-semibold text-zinc-800">
            {order.createdLabel}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-zinc-500">ID Pesanan</dt>
          <dd className="break-all text-right font-mono text-[0.65rem] text-zinc-400">
            {order.id}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
          <Wallet className="h-4 w-4" />
          Total Tagihan
        </span>
        <span className="text-base font-bold text-zinc-900">
          {order.amount !== null ? formatRupiah(order.amount) : "—"}
        </span>
      </div>
    </article>
  );
}