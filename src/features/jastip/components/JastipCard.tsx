"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowRight,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { acceptJastipOrderAction, updateJastipStatusAction } from "../actions";
import { resolveCardAction } from "../selectors";
import { getJastipStatusMeta } from "../status";
import type { JastipActionResult, JastipOrder } from "../types";

interface JastipCardProps {
  order: JastipOrder;
  currentUserId: string;
  /** Membuka modal pembayaran Midtrans Snap untuk titipan yang belum dibayar. */
  onPay?: (order: JastipOrder) => void;
}

export function JastipCard({ order, currentUserId, onPay }: JastipCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selalu objek valid: lihat `getJastipStatusMeta` (fallback berlapis).
  const meta = getJastipStatusMeta(order.status);
  const action = resolveCardAction(order, currentUserId);
  const isOwner = order.user_id === currentUserId;
  // Hanya tagihan nyata (> 0) yang bisa dibayar — ongkir gratis (Rp0) tidak
  // memunculkan tombol karena server menolak nominal nol saat membuat token.
  const isPayable =
    isOwner && order.status === "pending" && order.delivery_tip > 0;

  function applyResult(result: JastipActionResult): void {
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function runAction(): Promise<JastipActionResult> {
    if (action?.kind === "accept") {
      return acceptJastipOrderAction(order.id);
    }

    return updateJastipStatusAction(
      order.id,
      action?.nextStatus ?? "in_progress",
    );
  }

  function handleAction(): void {
    startTransition(async () => {
      applyResult(await runAction());
    });
  }

  return (
    <article className="group rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-indigo-200/70 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              meta.gradient,
            )}
          >
            <Package className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {order.item_name}
            </h3>
            <p className="flex items-center gap-1 text-[0.7rem] text-zinc-400">
              <UserRound className="h-3 w-3" />
              {isOwner ? "Titipan saya" : "Titipan mahasiswa lain"}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold",
            meta.badge,
          )}
        >
          {meta.label}
        </span>
      </div>

      {/* Chip metadata: rute (jemput → antar) dan ongkir. */}
      <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-zinc-600">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1">
          <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
          <span>
            {order.pickup_location}
            <ArrowRight className="mx-1 inline h-3 w-3 text-zinc-400" />
            {order.dropoff_location}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1">
          <Wallet className="h-3 w-3 text-indigo-500" />
          Ongkir {formatRupiah(order.delivery_tip)}
        </span>
      </div>

      {action ? (
        <button
          type="button"
          onClick={handleAction}
          disabled={isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{isPending ? "Memproses..." : action.label}</span>
        </button>
      ) : null}

      {isPayable && onPay ? (
        <button
          type="button"
          onClick={() => onPay(order)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
        >
          <CreditCard className="h-4 w-4" />
          <span>Bayar Sekarang</span>
        </button>
      ) : null}
    </article>
  );
}
