"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Ban,
  CalendarClock,
  CheckCheck,
  Download,
  FileText,
  ImageUp,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Paperclip,
  Phone,
  Play,
  Receipt,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildDocumentDownloadUrl,
  formatOrderCode,
  getDownloadFileName,
} from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { getOrderServiceMeta } from "@/features/orders/service-meta";
import { getOrderStatusMeta } from "@/features/orders/status";
import {
  confirmOrderPaymentAction,
  deleteOrderAction,
  updateAdminOrderStatusAction,
} from "../actions";
import { buildAdminWhatsAppLink, formatAdminPhoneDisplay } from "../contact";
import { resolveAdminActions } from "../selectors";
import { ADMIN_DELETABLE_STATUSES, type AdminOperatorStatus } from "../status";
import type { AdminActionResult, AdminOrder } from "../types";
import { ShareLocationButton } from "@/features/tracking/components/ShareLocationButton";
import { DriverNavigationCard } from "@/features/navigation/components/DriverNavigationCard";
import { hasDriverNavigation } from "@/features/navigation/services";
import { toDestinationCoords } from "@/features/orders/coordinates";
import { AdminOrderChat } from "./AdminOrderChat";

interface AdminOrderCardProps {
  order: AdminOrder;
}

const ACTION_ICON = {
  in_progress: Play,
  out_for_delivery: Truck,
  completed: CheckCheck,
  cancelled: Ban,
} as const;

/** Label aksi operator yang ramah & konsisten lintas layanan. */
function toActionLabel(status: AdminOperatorStatus, fallback: string): string {
  if (status === "in_progress") {
    return fallback === "Proses" ? "Terima Pesanan" : fallback;
  }
  if (status === "completed") {
    return fallback === "Selesaikan" ? "Tandai Selesai" : fallback;
  }
  if (status === "cancelled") {
    return fallback === "Batal" ? "Batalkan" : fallback;
  }
  return fallback;
}

/** Chip WhatsApp pelanggan: nomor terformat + aksi langsung ke wa.me. */
function CustomerContactChip({ phone }: { phone: string }) {
  const link = buildAdminWhatsAppLink(phone);
  if (!link) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-700">
        <Phone className="h-3 w-3 text-indigo-500" />
        {phone.trim()}
      </span>
    );
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Hubungi pelanggan via WhatsApp ${phone}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-semibold text-emerald-700 transition-all duration-200 active:scale-95"
    >
      <Phone className="h-3 w-3 text-emerald-600" />
      <span>📱 {formatAdminPhoneDisplay(phone)}</span>
      <MessageCircle className="h-3 w-3 text-emerald-600" />
    </a>
  );
}

/** Header kartu: avatar layanan + nama pelanggan + status pastel. */
function CardHeader({ order }: { order: AdminOrder }) {
  const serviceMeta = getOrderServiceMeta(order.service);
  const statusMeta = getOrderStatusMeta(order.status);
  const Icon = serviceMeta.icon;
  return (
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
          <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <span className="truncate">{order.customerName}</span>
          </p>
          <p className="mt-0.5 font-mono text-[0.6rem] font-semibold text-indigo-500">
            {formatOrderCode(order.service, order.id)}
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
  );
}

/** Baris chip: layanan, waktu, kontak, alamat, & spesifikasi. */
function CardChips({ order }: { order: AdminOrder }) {
  const serviceMeta = getOrderServiceMeta(order.service);
  const Icon = serviceMeta.icon;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold",
          serviceMeta.badge,
        )}
      >
        <Icon className="h-3 w-3" />
        {serviceMeta.label}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-600">
        <CalendarClock className="h-3 w-3 text-indigo-500" />
        {order.createdLabel}
      </span>
      {order.contactPhone ? (
        <CustomerContactChip phone={order.contactPhone} />
      ) : null}
      {order.address ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-600">
          <MapPin className="h-3 w-3 text-indigo-500" />
          <span className="max-w-[14rem] truncate">{order.address}</span>
        </span>
      ) : null}
      {order.specification ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-600">
          <FileText className="h-3 w-3 text-indigo-500" />
          <span className="max-w-[14rem] truncate">{order.specification}</span>
        </span>
      ) : null}
    </div>
  );
}
/** Ringkasan detail + tagihan dalam panel lembut. */
function CardSummary({ order }: { order: AdminOrder }) {
  return (
    <div className="mt-3 rounded-2xl bg-zinc-50/80 px-3 py-2.5">
      <p className="text-xs leading-relaxed text-zinc-700">{order.detail}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
        <Receipt className="h-3.5 w-3.5 text-indigo-500" />
        {order.amountLabel ?? "Belum ada tagihan"}
      </p>
    </div>
  );
}

/** Lampiran pelanggan sebagai file chip interaktif. */
function CardDocuments({ order }: { order: AdminOrder }) {
  if (order.documents.length === 0 && !order.paymentProofUrl) {
    return null;
  }
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[0.65rem] font-semibold tracking-wide text-zinc-400 uppercase">
        Dokumen Pelanggan
      </p>
      <div className="flex flex-wrap gap-1.5">
        {order.documents.map((document) => (
          <a
            key={`${document.kind}-${document.url}`}
            href={buildDocumentDownloadUrl(document.url)}
            download={getDownloadFileName(document.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[0.65rem] font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
          >
            <Paperclip className="h-3 w-3 shrink-0" />
            <span className="max-w-[10rem] truncate">📎 {document.label}</span>
            <Download className="h-3 w-3 shrink-0" />
          </a>
        ))}
        {order.paymentProofUrl ? (
          <a
            href={order.paymentProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[0.65rem] font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.paymentProofUrl}
              alt="Bukti pembayaran"
              className="h-6 w-6 rounded-lg object-cover"
            />
            Lihat bukti bayar
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Tombol aksi workflow operator dengan status update instan. */
function CardActions({
  order,
  isPending,
  onAction,
  onConfirmPayment,
  onDeleteRequest,
}: {
  order: AdminOrder;
  isPending: boolean;
  onAction: (status: AdminOperatorStatus) => void;
  onConfirmPayment: () => void;
  onDeleteRequest: () => void;
}) {
  const actions = resolveAdminActions(order.status, order.service);
  const canConfirm = order.status === "PENDING_VERIFICATION";
  const canDelete = ADMIN_DELETABLE_STATUSES.includes(order.status);
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {canConfirm ? (
        <button
          type="button"
          onClick={onConfirmPayment}
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-[0.7rem] font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={() => onAction(action.status)}
            disabled={isPending}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
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
            <span>{toActionLabel(action.status, action.label)}</span>
          </button>
        );
      })}
      {canDelete ? (
        <button
          type="button"
          onClick={onDeleteRequest}
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[0.7rem] font-semibold text-rose-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Hapus</span>
        </button>
      ) : null}
      {!canConfirm && actions.length === 0 && !canDelete ? (
        <span className="text-center text-[0.7rem] text-zinc-300">Final</span>
      ) : null}
    </div>
  );
}

/** Satu kartu pesanan operator 2.0: info pelanggan, dokumen, & aksi status. */
export function AdminOrderCard({ order }: AdminOrderCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const serviceMeta = getOrderServiceMeta(order.service);
  const statusMeta = getOrderStatusMeta(order.status);
  const isOutForDelivery = order.status === "out_for_delivery";
  const showNavigation = isOutForDelivery && hasDriverNavigation(order.service);
  const destination = toDestinationCoords(
    order.destinationLat,
    order.destinationLng,
  );

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

  function handleConfirmDelete(): void {
    setIsConfirmOpen(false);
    startTransition(async () => {
      applyResult(
        await deleteOrderAction({
          service: order.service,
          orderId: order.id,
        }),
      );
    });
  }

  return (
    <article className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-indigo-200/70 hover:shadow-md">
      <CardHeader order={order} />
      <CardChips order={order} />
      <CardSummary order={order} />
      <CardDocuments order={order} />
      <div className="mt-3">
        <AdminOrderChat order={order} />
      </div>
      {showNavigation ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <ShareLocationButton service={order.service} orderId={order.id} />
          <button
            type="button"
            onClick={() => setIsNavOpen(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[0.7rem] font-semibold text-blue-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Navigasi</span>
          </button>
        </div>
      ) : null}
      <CardActions
        order={order}
        isPending={isPending}
        onAction={runAction}
        onConfirmPayment={handleConfirmPayment}
        onDeleteRequest={() => setIsConfirmOpen(true)}
      />
      {showNavigation ? (
        <Modal
          open={isNavOpen}
          title="Navigasi ke Pelanggan"
          onClose={() => setIsNavOpen(false)}
        >
          <p className="mb-3 text-xs text-zinc-500">
            Pesanan {order.customerName} · {order.detail}
          </p>
          <DriverNavigationCard
            orderId={order.id}
            service={order.service}
            destination={destination}
          />
        </Modal>
      ) : null}
      <Modal
        open={isConfirmOpen}
        title="Hapus Pesanan"
        onClose={() => setIsConfirmOpen(false)}
      >
        <p className="text-sm text-zinc-600">
          Apakah Anda yakin ingin menghapus pesanan ini?
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          Pesanan {order.customerName} berstatus {statusMeta.label} (
          {serviceMeta.label}) akan dihapus permanen dan tidak dapat
          dikembalikan.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setIsConfirmOpen(false)}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-all duration-200 active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Hapus
          </button>
        </div>
      </Modal>
    </article>
  );
}

