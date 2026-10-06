"use client";

import { useState } from "react";
import { History, PackagePlus, Plus, ShoppingBag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { QrisPaymentModal } from "@/features/payment/components/QrisPaymentModal";
import type { FreeShippingStatus } from "@/features/orders/free-shipping";
import { ORDER_RUNNING_STATUSES } from "@/features/orders/types";
import type { AppliedPromo } from "@/features/promos/catalog";
import type { JastipOrder } from "../types";
import { selectCourierOrders, selectMyOrders } from "../selectors";
import { JastipCard } from "./JastipCard";
import { JastipCreateForm } from "./JastipCreateForm";

type JastipTab = "mine" | "courier";

type JastipQueue = "running" | "history";

const TABS: { id: JastipTab; label: string }[] = [
  { id: "mine", label: "Titipanku" },
  { id: "courier", label: "Cari Orderan" },
];

const QUEUE_TABS: { id: JastipQueue; label: string }[] = [
  { id: "running", label: "Pesanan Berjalan" },
  { id: "history", label: "Riwayat Selesai" },
];

/** Konten empty state per tab: ikon mengundang + judul + ajakan bertindak. */
const EMPTY_STATE: Record<
  "courier" | `mine:${JastipQueue}`,
  { icon: LucideIcon; title: string; description: string; hint: string }
> = {
  "mine:running": {
    icon: PackagePlus,
    title: "Tidak ada titipan berjalan 🎉",
    description:
      "Semua titipanmu selesai. Titipan yang sedang diantar kurir akan tampil di sini.",
    hint: "Tekan tombol Titip Baru untuk memulai.",
  },
  "mine:history": {
    icon: History,
    title: "Belum ada riwayat titipan",
    description:
      "Titipan yang sudah selesai atau dibatalkan akan tersimpan rapi di sini.",
    hint: "Selesaikan satu titipan untuk mengisi tab ini.",
  },
  courier: {
    icon: ShoppingBag,
    title: "Belum ada orderan",
    description:
      "Orderan titipan baru dari mahasiswa lain akan muncul di sini untuk kamu ambil.",
    hint: "Pantau terus — orderan bisa datang kapan saja.",
  },
};

/** Empty state `Titipanku` menyesuaikan antrean; `Cari Orderan` tetap tunggal. */
function emptyStateFor(tab: JastipTab, queue: JastipQueue) {
  if (tab !== "mine") {
    return EMPTY_STATE.courier;
  }

  return queue === "running"
    ? EMPTY_STATE["mine:running"]
    : EMPTY_STATE["mine:history"];
}

function isRunning(status: JastipOrder["status"]): boolean {
  return ORDER_RUNNING_STATUSES.includes(status);
}

interface JastipBoardProps {
  currentUserId: string;
  orders: JastipOrder[];
  /** Promo yang sudah diverifikasi server; null bila tidak ada. */
  appliedPromo: AppliedPromo | null;
  /** Status bebas ongkir otomatis; null bila belum terhitung. */
  freeShipping?: FreeShippingStatus | null;
}

export function JastipBoard({
  currentUserId,
  orders,
  appliedPromo,
  freeShipping = null,
}: JastipBoardProps) {
  const [tab, setTab] = useState<JastipTab>("mine");
  const [queue, setQueue] = useState<JastipQueue>("running");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<JastipOrder | null>(null);

  const mineOrders = selectMyOrders(orders, currentUserId);
  const runningCount = mineOrders.filter((order) =>
    isRunning(order.status),
  ).length;

  const visibleOrders =
    tab === "mine"
      ? mineOrders.filter((order) =>
          queue === "running"
            ? isRunning(order.status)
            : !isRunning(order.status),
        )
      : selectCourierOrders(orders, currentUserId);

  /** Tutup form titipan lalu langsung buka QRIS untuk titipan yang baru dibuat. */
  function handleCreated(order: JastipOrder): void {
    setIsModalOpen(false);
    setPayingOrder(order);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95",
              tab === item.id
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "mine" ? (
        <div
          role="tablist"
          aria-label="Filter antrean titipan"
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
      ) : null}

      {visibleOrders.length === 0 ? (
        <EmptyState {...emptyStateFor(tab, queue)} />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <JastipCard
              key={order.id}
              order={order}
              currentUserId={currentUserId}
              onPay={setPayingOrder}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex max-w-[480px] justify-end px-5">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition-all duration-200 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span>Titip Baru</span>
        </button>
      </div>

      <Modal
        open={isModalOpen}
        title="Titip Baru"
        onClose={() => setIsModalOpen(false)}
      >
        <JastipCreateForm onSuccess={handleCreated} appliedPromo={appliedPromo} freeShipping={freeShipping} />
      </Modal>

      {payingOrder ? (
        <QrisPaymentModal
          open
          onClose={() => setPayingOrder(null)}
          order={{
            id: payingOrder.id,
            title: payingOrder.item_name,
            service: "jastip",
            amount: payingOrder.delivery_tip,
          }}
        />
      ) : null}
    </div>
  );
}
