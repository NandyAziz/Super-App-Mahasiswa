import { Info, MapPin, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { getOrderServiceMeta } from "@/features/orders/service-meta";
import { getOrderStatusMeta } from "@/features/orders/status";
import type { PublicOrderTracking } from "../types";

interface PublicTrackStatusCardProps {
  /** `null` berarti ID tidak cocok dengan pesanan mana pun. */
  order: PublicOrderTracking | null;
}

function NotFoundPanel() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ReceiptText className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-zinc-700">Pesanan tidak ditemukan</p>
      <p className="text-xs text-zinc-500">
        ID pesanan tidak cocok dengan data mana pun. Periksa kembali ID atau
        tautan yang kamu terima.
      </p>
    </div>
  );
}

/**
 * Kartu status publik hasil pelacakan tamu.
 *
 * Hanya menampilkan informasi aman-publik (layanan, judul ringkas, status,
 * waktu) — peta live dan riwayat chat tetap khusus pemilik akun.
 */
export function PublicTrackStatusCard({ order }: PublicTrackStatusCardProps) {
  if (!order) {
    return <NotFoundPanel />;
  }

  const serviceMeta = getOrderServiceMeta(order.service);
  const statusMeta = getOrderStatusMeta(order.status);
  const Icon = serviceMeta.icon;

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
              {order.reference ?? `Pesanan ${serviceMeta.label}`}
            </h2>
            <p className="text-xs text-zinc-400">
              Dibuat {formatRelativeTime(order.createdAt)}
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

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white/80 p-3">
        <span
          aria-hidden="true"
          className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusMeta.dot)}
        />
        <p className="text-xs text-zinc-600">
          Status pesanan saat ini:{" "}
          <strong className="font-semibold text-zinc-900">
            {statusMeta.label}
          </strong>
        </p>
      </div>

      {order.locationUpdatedAt ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-sky-600">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            Posisi kurir diperbarui{" "}
            {formatRelativeTime(order.locationUpdatedAt)}
          </span>
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-[0.7rem] leading-relaxed text-zinc-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Peta live kurir dan riwayat chat hanya tersedia untuk pemilik akun.
        </span>
      </p>
    </article>
  );
}
