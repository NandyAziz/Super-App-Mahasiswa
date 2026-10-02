"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, BookOpen, FileText, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah, getUrlLabel } from "@/lib/format";
import { updatePrintStatusAction } from "../actions";
import {
  calculatePrintPrice,
  getBindingLabel,
  getPrintTypeGradient,
  getPrintTypeLabel,
} from "../pricing";
import { canCancelPrintOrder, resolvePrintCardAction } from "../selectors";
import { getPrintStatusMeta } from "../status";
import type {
  PrintActionResult,
  PrintOrder,
  PrintProgressStatus,
} from "../types";

interface PrintOrderCardProps {
  order: PrintOrder;
}

export function PrintOrderCard({ order }: PrintOrderCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const meta = getPrintStatusMeta(order.status);
  const price = calculatePrintPrice(
    order.print_type,
    order.binding_type,
    order.total_pages,
  );
  const primaryAction = resolvePrintCardAction(order.status);
  const showCancel = canCancelPrintOrder(order.status);

  function applyResult(result: PrintActionResult): void {
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function runStatus(nextStatus: PrintProgressStatus): void {
    startTransition(async () => {
      applyResult(await updatePrintStatusAction(order.id, nextStatus));
    });
  }

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              getPrintTypeGradient(order.print_type),
            )}
          >
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {getUrlLabel(order.document_url)}
            </h3>
            <p className="text-[0.7rem] text-zinc-400">
              {formatRupiah(price.pricePerPage)}/lembar · {price.pages} halaman
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

      <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-zinc-600">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1">
          <FileText className="h-3 w-3 text-indigo-500" />
          {getPrintTypeLabel(order.print_type)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1">
          <BookOpen className="h-3 w-3 text-indigo-500" />
          Jilid {getBindingLabel(order.binding_type)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1">
          <Layers className="h-3 w-3 text-indigo-500" />
          {order.total_pages} halaman
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-zinc-50/80 px-3 py-2">
        <span className="text-[0.7rem] font-medium text-zinc-500">
          Estimasi Total
        </span>
        <span className="text-sm font-semibold text-zinc-900">
          {formatRupiah(price.total)}
        </span>
      </div>

      {primaryAction || showCancel ? (
        <div className="mt-3 flex gap-2">
          {primaryAction ? (
            <button
              type="button"
              onClick={() => runStatus(primaryAction.nextStatus)}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isPending ? "Memproses..." : primaryAction.label}</span>
            </button>
          ) : null}

          {showCancel ? (
            <button
              type="button"
              onClick={() => runStatus("cancelled")}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Batalkan</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
