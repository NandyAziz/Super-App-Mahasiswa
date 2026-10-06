"use client";

import { useState } from "react";
import { History, PrinterCheck, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { ORDER_RUNNING_STATUSES } from "@/features/orders/types";
import type { FreeShippingStatus } from "@/features/orders/free-shipping";
import type { AppliedPromo } from "@/features/promos/catalog";
import type { PrintOrder } from "../types";
import { PrintFormModal } from "./PrintFormModal";
import { PrintOrderCard } from "./PrintOrderCard";

type PrintQueue = "running" | "history";

const QUEUE_TABS: { id: PrintQueue; label: string }[] = [
  { id: "running", label: "Pesanan Berjalan" },
  { id: "history", label: "Riwayat Selesai" },
];

/** Konten empty state per tab: ikon mengundang + judul + ajakan bertindak. */
const EMPTY_STATE: Record<
  PrintQueue,
  { icon: LucideIcon; title: string; description: string; hint: string }
> = {
  running: {
    icon: Truck,
    title: "Tidak ada pesanan cetak berjalan 🎉",
    description:
      "Semua berkas-mu sudah dicetak. Pesanan yang sedang diproses mitra akan tampil di sini.",
    hint: "Tekan Buat Pesanan Cetak untuk order baru.",
  },
  history: {
    icon: History,
    title: "Belum ada riwayat cetak",
    description:
      "Pesanan cetak yang selesai atau dibatalkan akan tersimpan rapi di sini.",
    hint: "Tekan tombol Buat Pesanan Cetak di atas untuk memulai.",
  },
};

function isRunning(status: PrintOrder["status"]): boolean {
  return ORDER_RUNNING_STATUSES.includes(status);
}

interface PrintBoardProps {
  orders: PrintOrder[];
  /** Promo yang sudah diverifikasi server; null bila tidak ada. */
  appliedPromo: AppliedPromo | null;
  /** Status bebas ongkir otomatis; null bila belum terhitung. */
  freeShipping?: FreeShippingStatus | null;
}

export function PrintBoard({ orders, appliedPromo, freeShipping = null }: PrintBoardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [queue, setQueue] = useState<PrintQueue>("running");

  const runningCount = orders.filter((order) => isRunning(order.status)).length;
  const visibleOrders = orders.filter((order) =>
    queue === "running" ? isRunning(order.status) : !isRunning(order.status),
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/70 px-4 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
      >
        <PrinterCheck className="h-5 w-5" />
        <span>Buat Pesanan Cetak</span>
      </button>

      <div
        role="tablist"
        aria-label="Filter pesanan cetak"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md"
      >
        {QUEUE_TABS.map((item) => {
          const label =
            item.id === "running"
              ? `Pesanan Berjalan (${runningCount})`
              : item.label;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={queue === item.id}
              onClick={() => setQueue(item.id)}
              className={cn(
                "rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95",
                queue === item.id
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
        <EmptyState {...EMPTY_STATE[queue]} />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            // `canManage` sengaja TIDAK dioper: halaman ini untuk pengguna,
            // jadi aksi operator ("Terima Pesanan" dll) tidak boleh tampil.
            <PrintOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <PrintFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appliedPromo={appliedPromo}
        freeShipping={freeShipping}
      />
    </div>
  );
}
