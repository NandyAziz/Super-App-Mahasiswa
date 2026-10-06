import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderServiceMeta } from "../service-meta";
import type { OrderSummary } from "../types";

interface OrderChatLinkCardProps {
  orders: OrderSummary[];
}

/**
 * Kartu tautan chat per pesanan — murni navigasi visual.
 *
 * Tidak memanggil Server Action apa pun; chat itu sendiri tetap dirender oleh
 * `ChatSection` di `/orders/[orderId]` dengan kontrak `sendChatMessageAction`
 * yang tidak berubah.
 */
export function OrderChatLinkCard({ orders }: OrderChatLinkCardProps) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Chat pesanan"
      className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <MessagesSquare className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xs font-semibold text-zinc-900">Chat Pesanan</h2>
          <p className="text-[0.65rem] text-zinc-500">
            Lanjut mengobrol dengan admin/kurir per pesanan.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {orders.slice(0, 5).map((order) => {
          const serviceMeta = getOrderServiceMeta(order.service);
          const ServiceIcon = serviceMeta.icon;

          return (
            <li key={`${order.service}-${order.id}`}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 transition-all duration-200 hover:border-indigo-200/70 hover:shadow-md active:scale-95"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    serviceMeta.tint,
                  )}
                >
                  <ServiceIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-zinc-800">
                    {order.title}
                  </span>
                  <span className="block truncate text-[0.65rem] text-zinc-400">
                    {serviceMeta.label} · Buka chat
                  </span>
                </span>
                <MessagesSquare className="h-4 w-4 shrink-0 text-indigo-500" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
