"use client";

import { useState } from "react";
import { PackagePlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { QrisPaymentModal } from "@/features/payment/components/QrisPaymentModal";
import { selectCourierOrders, selectMyOrders } from "../selectors";
import type { JastipOrder } from "../types";
import { JastipCard } from "./JastipCard";
import { JastipCreateForm } from "./JastipCreateForm";

type JastipTab = "mine" | "courier";

const TABS: { id: JastipTab; label: string }[] = [
  { id: "mine", label: "Titipanku" },
  { id: "courier", label: "Cari Orderan" },
];

const EMPTY_MESSAGE: Record<JastipTab, string> = {
  mine: "Belum ada titipan. Yuk buat titipan pertamamu!",
  courier: "Belum ada orderan yang bisa diambil saat ini.",
};

interface JastipBoardProps {
  currentUserId: string;
  orders: JastipOrder[];
}

export function JastipBoard({ currentUserId, orders }: JastipBoardProps) {
  const [tab, setTab] = useState<JastipTab>("mine");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<JastipOrder | null>(null);

  const visibleOrders =
    tab === "mine"
      ? selectMyOrders(orders, currentUserId)
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

      {visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <PackagePlus className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-500">{EMPTY_MESSAGE[tab]}</p>
        </div>
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
        <JastipCreateForm onSuccess={handleCreated} />
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
