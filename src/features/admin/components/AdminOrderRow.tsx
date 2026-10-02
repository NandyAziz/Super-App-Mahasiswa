"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, CheckCheck, ImageUp, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOrderServiceMeta } from "@/features/orders/service-meta";
import { getOrderStatusMeta } from "@/features/orders/status";
import {
  confirmOrderPaymentAction,
  updateAdminOrderStatusAction,
} from "../actions";
import { resolveAdminActions } from "../selectors";
import type { AdminOperatorStatus } from "../status";
import type { AdminOrder, AdminActionResult } from "../types";

interface AdminOrderRowProps {
  order: AdminOrder;
}

const ACTION_ICON = {
  in_progress: Play,
  completed: CheckCheck,
  cancelled: Ban,
} as const;

/** Satu baris tabel operator dengan tombol aksi status yang kontekstual. */
export function AdminOrderRow({ order }: AdminOrderRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const serviceMeta = getOrderServiceMeta(order.service);
  const statusMeta = getOrderStatusMeta(order.status);
  const actions = resolveAdminActions(order.status);
  const canConfirm = order.status === "PENDING_VERIFICATION";
  const Icon = serviceMeta.icon;

  function applyResult(result: AdminActionResult): void {
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function runAction(status: AdminOperatorStatus): void {
    startTransition(async () => {
      applyResult(
        await updateAdminOrderStatusAction({
          service: order.service,
          orderId: order.id,
          status,
        }),
      );
    });
  }

  function handleConfirmPayment(): void {
    startTransition(async () => {
      applyResult(
        await confirmOrderPaymentAction({
          service: order.service,
          orderId: order.id,
        }),
      );
    });
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-3 align-top">
        <p className="text-xs font-semibold text-zinc-900">
          {order.customerName}
        </p>
        <p className="mt-0.5 text-[0.65rem] text-zinc-400">
          {order.createdLabel}
        </p>
      </td>

      <td className="px-3 py-3 align-top">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold",
            serviceMeta.badge,
          )}
        >
          <Icon className="h-3 w-3" />
          {serviceMeta.label}
        </span>
        <p className="mt-1 max-w-[10rem] text-[0.7rem] text-zinc-600">
          {order.detail}
        </p>
        {order.paymentProofUrl ? (
          <a
            href={order.paymentProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[0.65rem] font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.paymentProofUrl}
              alt="Bukti pembayaran"
              className="h-6 w-6 rounded object-cover"
            />
            Lihat bukti
          </a>
        ) : null}
      </td>

      <td className="px-3 py-3 align-top text-xs font-semibold text-zinc-900">
        {order.amountLabel ?? "—"}
      </td>

      <td className="px-3 py-3 align-top">
        <span
          className={cn(
            "inline-block shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold",
            statusMeta.badge,
          )}
        >
          {statusMeta.label}
        </span>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1.5">
          {canConfirm ? (
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageUp className="h-3.5 w-3.5" />
              )}
              <span>Konfirmasi Pembayaran</span>
            </button>
          ) : null}

          {actions.map((action) => {
            const ActionIcon = ACTION_ICON[action.status];

            return (
              <button
                key={action.status}
                type="button"
                onClick={() => runAction(action.status)}
                disabled={isPending}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                  action.variant === "primary"
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30"
                    : "border border-rose-200 bg-rose-50 text-rose-600",
                )}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ActionIcon className="h-3.5 w-3.5" />
                )}
                <span>{action.label}</span>
              </button>
            );
          })}

          {!canConfirm && actions.length === 0 ? (
            <span className="text-[0.7rem] text-zinc-300">Final</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
