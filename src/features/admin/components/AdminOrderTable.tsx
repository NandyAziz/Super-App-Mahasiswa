import { ClipboardList } from "lucide-react";
import type { AdminOrder } from "../types";
import { AdminOrderRow } from "./AdminOrderRow";

interface AdminOrderTableProps {
  orders: AdminOrder[];
  /** Pesan yang tampil saat tidak ada pesanan pada filter aktif. */
  emptyMessage: string;
}

/** Tabel pusat pengelolaan pesanan masuk untuk operator Campify. */
export function AdminOrderTable({ orders, emptyMessage }: AdminOrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <ClipboardList className="h-6 w-6" />
        </span>
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/80">
            <th
              scope="col"
              className="px-3 py-2.5 text-[0.65rem] font-semibold tracking-wide text-zinc-500 uppercase"
            >
              Pelanggan
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-[0.65rem] font-semibold tracking-wide text-zinc-500 uppercase"
            >
              Detail Layanan
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-[0.65rem] font-semibold tracking-wide text-zinc-500 uppercase"
            >
              Tagihan / Tip
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-[0.65rem] font-semibold tracking-wide text-zinc-500 uppercase"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-[0.65rem] font-semibold tracking-wide text-zinc-500 uppercase"
            >
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <AdminOrderRow key={`${order.service}-${order.id}`} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
