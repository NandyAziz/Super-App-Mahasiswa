"use client";

import { useState } from "react";
import { PrinterCheck } from "lucide-react";
import type { PrintOrder } from "../types";
import { PrintFormModal } from "./PrintFormModal";
import { PrintOrderCard } from "./PrintOrderCard";

interface PrintBoardProps {
  orders: PrintOrder[];
}

export function PrintBoard({ orders }: PrintBoardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <PrinterCheck className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-500">
            Belum ada riwayat cetak. Yuk buat pesanan pertamamu!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <PrintOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <PrintFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
